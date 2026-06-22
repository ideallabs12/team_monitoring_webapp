import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Sparkles, Activity, Users, DollarSign, MessageSquare, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function AdminAiAnalytics() {
  const [loading, setLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [stats, setStats] = useState(null)
  
  const [customQuestion, setCustomQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [generating, setGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user?.email?.includes('signatureglobalconferences')) {
          setErrorMsg('Access Restricted: You do not have permission to view or generate AI Analytics.')
          return
        }

        const [usersRes, teamsRes, revRes, disRes] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name, platform_role'),
          supabase.from('teams').select('id, name'),
          supabase.from('monthly_revenues').select('amount, user_id'),
          supabase.from('dis_reports').select('positive_leads, expected_revenue, user_id')
        ])

        const totalRevenue = revRes.data?.reduce((acc, r) => acc + Number(r.amount), 0) || 0
        const totalLeads = disRes.data?.reduce((acc, d) => acc + Number(d.positive_leads), 0) || 0
        const expectedPipeline = disRes.data?.reduce((acc, d) => acc + Number(d.expected_revenue), 0) || 0

        const userStatsList = (usersRes.data || []).map(u => {
          const uRevs = (revRes.data || []).filter(r => r.user_id === u.id)
          const uDis = (disRes.data || []).filter(d => d.user_id === u.id)
          
          const rev = uRevs.reduce((acc, r) => acc + Number(r.amount), 0)
          const leads = uDis.reduce((acc, d) => acc + Number(d.positive_leads), 0)
          
          return {
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown',
            role: u.platform_role,
            revenue: rev,
            leads: leads
          }
        })

        setStats({
          users: usersRes.data?.length || 0,
          teams: teamsRes.data?.length || 0,
          totalRevenue,
          totalLeads,
          expectedPipeline,
          disCount: disRes.data?.length || 0,
          userStatsList
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
      let prompt = ''
      
      const userBreakdown = stats.userStatsList
        ? stats.userStatsList.map(u => `- ${u.name} (${u.role}): $${u.revenue.toFixed(2)} revenue, ${u.leads} leads`).join('\n          ')
        : 'No user data available'

      if (type === 'health') {
        prompt = `
          Analyze the following platform statistics and provide a brief, actionable "Platform Health Report".
          Highlight areas of success and potential areas for improvement.
          
          Data:
          - Total Users: ${stats.users}
          - Total Teams: ${stats.teams}
          - Total Actual Revenue: $${stats.totalRevenue.toFixed(2)}
          - Total Expected Pipeline (from DIS): $${stats.expectedPipeline.toFixed(2)}
          - Total Positive Leads Generated: ${stats.totalLeads}
          - Total DIS Reports Submitted: ${stats.disCount}

          User Breakdown:
          ${userBreakdown}
        `
      } else {
        if (!customQuestion.trim()) {
          setGenerating(false)
          return
        }
        prompt = `
          Context about our platform:
          - Total Users: ${stats.users}
          - Total Teams: ${stats.teams}
          - Total Actual Revenue: $${stats.totalRevenue.toFixed(2)}
          - Total Expected Pipeline (from DIS): $${stats.expectedPipeline.toFixed(2)}
          - Total Positive Leads Generated: ${stats.totalLeads}
          - Total DIS Reports Submitted: ${stats.disCount}

          User Breakdown:
          ${userBreakdown}
          
          Question: ${customQuestion}
        `
      }

      const response = await fetch('https://tohlagjzvjoqrutolcwf.supabase.co/functions/v1/ai-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to fetch AI analytics')
      }
      
      if (data.error) {
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
              <Activity size={18} style={{ color: '#10b981' }} /> Generate Reports
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--apple-text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
              Run a complete analysis of your platform's revenue, lead generation, and user activity.
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

          <div style={{ height: '1px', background: 'var(--apple-border)', width: '100%' }} />

          <div>
            <h3 className="apple-title-small" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} style={{ color: '#38bdf8' }} /> Ask AI About Your Data
            </h3>
            <textarea
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="e.g., 'What is our lead conversion rate?' or 'How can we improve revenue next month?'"
              className="apple-input"
              style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '12px', marginBottom: '12px', resize: 'vertical' }}
            />
            <button
              onClick={() => handleGenerate('custom')}
              disabled={!dataLoaded || generating || !customQuestion.trim() || !!errorMsg}
              className="apple-btn-secondary"
              style={{ width: '100%' }}
            >
              {generating && customQuestion ? <Loader2 size={18} className="spin" style={{ marginRight: '8px' }} /> : 'Ask AI'}
            </button>
          </div>
        </div>

        {/* Results Card */}
        <div className="apple-card" style={{ padding: '24px' }}>
          <h3 className="apple-title-small" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: '#8b5cf6' }} /> AI Insights
          </h3>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.01)', 
            border: '1px solid var(--apple-border)', 
            borderRadius: '12px', 
            padding: '24px',
            minHeight: '300px',
            color: 'var(--apple-text-primary)',
            fontSize: '1rem',
            lineHeight: '1.6',
            overflowY: 'auto'
          }}>
            {generating ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--apple-text-secondary)', gap: '16px', paddingTop: '40px' }}>
                <Loader2 size={32} className="spin" style={{ color: '#8b5cf6' }} />
                <span>AI is analyzing your data...</span>
              </div>
            ) : aiResponse ? (
              <div className="markdown-content">
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--apple-text-secondary)', fontStyle: 'italic', paddingTop: '40px' }}>
                Click 'Generate' to see AI insights here.
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        
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
