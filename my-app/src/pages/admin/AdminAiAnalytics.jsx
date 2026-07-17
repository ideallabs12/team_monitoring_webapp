import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Sparkles, Activity, MessageSquare, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useOutletContext } from 'react-router-dom'

// Helper functions for analytical pre-processing
const parseMonthYear = (dateString) => {
  const d = new Date(dateString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const calculateTrends = (revenues, disReports, profiles) => {
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  // Group by month
  const revByMonth = revenues.reduce((acc, r) => {
    const m = r.revenue_month.substring(0, 7) // 'YYYY-MM'
    acc[m] = (acc[m] || 0) + Number(r.amount)
    return acc
  }, {})

  const leadsByMonth = disReports.reduce((acc, d) => {
    const m = parseMonthYear(d.report_date)
    acc[m] = (acc[m] || 0) + Number(d.positive_leads)
    return acc
  }, {})

  const currentRev = revByMonth[currentMonthStr] || 0
  const prevRev = revByMonth[prevMonthStr] || 0
  const revGrowth = prevRev === 0 ? (currentRev > 0 ? 100 : 0) : ((currentRev - prevRev) / prevRev) * 100

  const currentLeads = leadsByMonth[currentMonthStr] || 0
  const prevLeads = leadsByMonth[prevMonthStr] || 0
  const leadsGrowth = prevLeads === 0 ? (currentLeads > 0 ? 100 : 0) : ((currentLeads - prevLeads) / prevLeads) * 100

  // Top Performers (All Time)
  const userPerformance = profiles.map(u => {
    const uRevs = revenues.filter(r => r.user_id === u.id).reduce((sum, r) => sum + Number(r.amount), 0)
    const uLeads = disReports.filter(d => d.user_id === u.id).reduce((sum, d) => sum + Number(d.positive_leads), 0)
    return { name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown', revenue: uRevs, leads: uLeads }
  })

  // Sort by revenue
  userPerformance.sort((a, b) => b.revenue - a.revenue)
  const top20Count = Math.max(1, Math.ceil(userPerformance.length * 0.2))
  const topPerformers = userPerformance.slice(0, top20Count)
  const top20Rev = topPerformers.reduce((sum, u) => sum + u.revenue, 0)
  const totalAllRev = userPerformance.reduce((sum, u) => sum + u.revenue, 0)
  const top20Concentration = totalAllRev === 0 ? 0 : (top20Rev / totalAllRev) * 100

  return {
    currentRev,
    prevRev,
    revGrowth: revGrowth.toFixed(1),
    currentLeads,
    prevLeads,
    leadsGrowth: leadsGrowth.toFixed(1),
    topPerformers: topPerformers.map(u => `${u.name} ($${u.revenue.toFixed(2)})`).join(', '),
    top20Concentration: top20Concentration.toFixed(1),
    totalUsers: profiles.length
  }
}

export default function AdminAiAnalytics() {
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [analyticsStory, setAnalyticsStory] = useState(null)
  
  const [customQuestion, setCustomQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [generating, setGenerating] = useState(false)
  const { user, featureAccess } = useOutletContext() || {}
  const canAccess = user?.email === 'signatureglobalconferences@gmail.com' || !!featureAccess?.aiAnalytics

  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function fetchStats() {
      try {
        if (!canAccess) {
          setErrorMsg('Access Restricted: You do not have permission to view or generate AI Analytics.')
          return
        }

        const [usersRes, teamsRes, revRes, disRes] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name, platform_role'),
          supabase.from('teams').select('id, name'),
          supabase.from('monthly_revenues').select('amount, user_id, revenue_month'),
          supabase.from('dis_reports').select('positive_leads, expected_revenue, user_id, report_date')
        ])

        const trends = calculateTrends(revRes.data || [], disRes.data || [], usersRes.data || [])
        
        setAnalyticsStory({
          ...trends,
          teamsCount: teamsRes.data?.length || 0,
          disCount: disRes.data?.length || 0
        })
        setDataLoaded(true)
      } catch (err) {
        console.error(err)
      }
    }
    fetchStats()
  }, [])

  const handleGenerate = async (type) => {
    setGenerating(true)
    setErrorMsg('')
    setAiResponse('')
    
    try {
      const systemInstruction = `
        You are an elite Business Analyst and Strategic Advisor for "Ideallabs", a SaaS operations platform. 
        Do NOT simply restate the numbers provided. Your job is to analyze the trends, highlight critical anomalies, 
        and provide 3 highly actionable, strategic recommendations to the executive team based on the patterns in this data. 
        Format your response in Markdown with clear headings and bullet points. Be concise and professional.
      `

      const dataStoryContext = `
        DATA STORY & PRE-PROCESSED INSIGHTS:
        - Total Employees: ${analyticsStory.totalUsers} across ${analyticsStory.teamsCount} teams.
        - Month-over-Month Revenue Growth: ${analyticsStory.revGrowth}% (Current Month: $${analyticsStory.currentRev.toFixed(2)} vs Prev Month: $${analyticsStory.prevRev.toFixed(2)})
        - Month-over-Month Lead Growth: ${analyticsStory.leadsGrowth}% (Current: ${analyticsStory.currentLeads} vs Prev: ${analyticsStory.prevLeads})
        - Performance Concentration: The top 20% of performers generated ${analyticsStory.top20Concentration}% of total all-time revenue.
        - Top Performers List: ${analyticsStory.topPerformers}
        - Total DIS Reports Logged: ${analyticsStory.disCount}
      `

      let finalPrompt = ''

      if (type === 'health') {
        finalPrompt = `
          ${systemInstruction}
          
          ${dataStoryContext}
          
          TASK: Provide a brief, actionable "Platform Health Report". Highlight areas of success and potential areas for improvement.
        `
      } else {
        if (!customQuestion.trim()) {
          setGenerating(false)
          return
        }
        finalPrompt = `
          ${systemInstruction}
          
          ${dataStoryContext}
          
          USER QUESTION: ${customQuestion}
          
          TASK: Answer the user's question directly and strategically based on the data provided.
        `
      }

      const { data, error: invokeError } = await supabase.functions.invoke('ai-analytics', {
        body: { prompt: finalPrompt }
      })

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to fetch AI analytics')
      }
      
      if (data?.error) {
        throw new Error(data.error.message || JSON.stringify(data.error))
      }
      
      const content = data?.choices?.[0]?.message?.content
      if (content) {
        setAiResponse(content)
      } else {
        throw new Error('Invalid response from AI model.')
      }
      
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Failed to generate insights. Ensure the edge function is deployed.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s var(--apple-ease)' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 className="apple-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Sparkles style={{ color: '#8b5cf6' }} size={32} />
          AI Analytics & Insights
        </h1>
        <p className="apple-subtitle">Leverage OpenRouter's powerful AI models to analyze your platform's health and answer questions about your data.</p>
      </header>

      {errorMsg && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '12px', marginBottom: '24px' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
        
        {/* Actions Card */}
        <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h3 className="apple-title-small" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: '#10b981' }} /> Generate Strategic Reports
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--apple-text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
              Run a complete analysis of your platform's growth trends, top performers, and overall health.
            </p>
            <button
              onClick={() => handleGenerate('health')}
              disabled={!dataLoaded || generating || !!errorMsg}
              className="apple-btn"
              style={{ width: '100%', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', border: 'none', color: '#fff', fontSize: '1rem' }}
            >
              {generating && !customQuestion ? <Loader2 size={18} className="spin" style={{ marginRight: '8px' }} /> : <Sparkles size={18} style={{ marginRight: '8px' }} />}
              Generate Platform Health Report
            </button>
          </div>
        </div>

        {/* AI Chat Interface */}
        <div className="apple-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '540px', border: '1px solid var(--apple-border-strong)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          {/* Header */}
          <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--apple-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div>
              <h3 className="apple-title-small" style={{ margin: 0, fontSize: '1rem' }}>AI Analyst</h3>
              <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Online
              </span>
            </div>
          </div>

          {/* Chat Area */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'rgba(0,0,0,0.15)' }}>
            {generating ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', color: 'var(--apple-text-secondary)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Loader2 size={16} className="spin" style={{ color: '#8b5cf6' }} />
                </div>
                <div style={{ background: 'var(--apple-card)', padding: '12px 16px', borderRadius: '16px', borderTopLeftRadius: '4px', border: '1px solid var(--apple-border)' }}>
                  <span className="typing-dot">.</span><span className="typing-dot" style={{ animationDelay: '0.2s' }}>.</span><span className="typing-dot" style={{ animationDelay: '0.4s' }}>.</span>
                </div>
              </div>
            ) : aiResponse ? (
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={16} color="#fff" />
                </div>
                <div className="markdown-content" style={{ background: 'var(--apple-card)', padding: '16px 20px', borderRadius: '16px', borderTopLeftRadius: '4px', border: '1px solid var(--apple-border)', color: 'var(--apple-text-primary)', fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '85%' }}>
                  <ReactMarkdown>{aiResponse}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px', color: 'var(--apple-text-secondary)', opacity: 0.6 }}>
                <MessageSquare size={48} strokeWidth={1} />
                <p style={{ margin: 0 }}>Ask a question about your growth, trends, or performance.</p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{ padding: '20px 24px', background: 'var(--apple-card)', borderTop: '1px solid var(--apple-border)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <textarea
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (dataLoaded && !generating && customQuestion.trim()) handleGenerate('custom')
                  }
                }}
                placeholder="Ask about revenue trends, top performers, or growth..."
                style={{ 
                  width: '100%', minHeight: '52px', maxHeight: '150px', padding: '14px 56px 14px 20px', 
                  borderRadius: '26px', border: '1px solid var(--apple-border-strong)', 
                  background: 'rgba(255,255,255,0.03)', color: 'var(--apple-text-primary)', 
                  fontSize: '0.95rem', resize: 'none', overflowY: 'auto',
                  lineHeight: '1.4', fontFamily: 'inherit',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.15)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--apple-border-strong)'; e.target.style.boxShadow = 'none' }}
              />
              <button
                onClick={() => handleGenerate('custom')}
                disabled={!dataLoaded || generating || !customQuestion.trim() || !!errorMsg}
                style={{
                  position: 'absolute', right: '8px', bottom: '8px',
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: (!dataLoaded || generating || !customQuestion.trim()) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: (!dataLoaded || generating || !customQuestion.trim()) ? 'rgba(255,255,255,0.3)' : '#fff',
                  cursor: (!dataLoaded || generating || !customQuestion.trim()) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {generating && customQuestion ? <Loader2 size={16} className="spin" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>}
              </button>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', textAlign: 'center', marginTop: '12px' }}>
              AI Analyst uses advanced models to interpret your platform data. Press Enter to send, Shift+Enter for a new line.
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
        .typing-dot {
          display: inline-block;
          animation: blink 1.4s infinite both;
          font-size: 1.5rem;
          line-height: 0.5;
        }
        @keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }
        
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          color: var(--apple-text-primary);
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .markdown-content h1 { font-size: 1.5rem; border-bottom: 1px solid var(--apple-border); padding-bottom: 8px; }
        .markdown-content h2 { font-size: 1.3rem; }
        .markdown-content h3 { font-size: 1.1rem; }
        .markdown-content p { margin-bottom: 1em; color: var(--apple-text-secondary); }
        .markdown-content ul, .markdown-content ol { margin-bottom: 1em; padding-left: 20px; color: var(--apple-text-secondary); }
        .markdown-content li { margin-bottom: 0.5em; }
        .markdown-content strong { color: var(--apple-text-primary); font-weight: 600; }
        .markdown-content blockquote {
          border-left: 4px solid #8b5cf6;
          padding-left: 16px;
          margin-left: 0;
          color: var(--apple-text-secondary);
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
