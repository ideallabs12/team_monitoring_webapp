import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { 
  Sparkles, Send, User, Bot, RotateCcw, Copy, Check, 
  TrendingUp, DollarSign, Target, FileText, ArrowRight, 
  Loader2, AlertCircle, Compass, Zap, ChevronDown
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { normalizeMonth, MONTH_NAMES } from '../../utils/revenueUtils'

export default function AdminAiCopilot({ user }) {
  const [loadingContext, setLoadingContext] = useState(true)
  const [userProfile, setUserProfile] = useState(null)
  const [userTeam, setUserTeam] = useState(null)
  const [userRevenues, setUserRevenues] = useState([])
  const [userDisReports, setUserDisReports] = useState([])
  const [userTargets, setUserTargets] = useState([])
  const [allTeams, setAllTeams] = useState([])
  
  // Chat state
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [responseLengthMode, setResponseLengthMode] = useState('necessary') // 'necessary' | 'detailed'
  
  const messagesEndRef = useRef(null)
  const bottomOfChatRef = useRef(null)
  const inputRef = useRef(null)

  // Smooth scroll to bottom of chat & input bar
  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    })
    bottomOfChatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isGenerating])

  // Scroll detection: show arrow when user scrolls up into past chat
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = window.innerHeight
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0
      
      // If page is taller than viewport and user is scrolled up > 160px from bottom
      const distFromBottom = scrollHeight - (currentScroll + clientHeight)
      setShowScrollBottom(distFromBottom > 160)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [messages])

  // Load user data context
  useEffect(() => {
    async function fetchUserData() {
      if (!user?.id) return
      try {
        setLoadingContext(true)
        const [profRes, revRes, disRes, teamRes] = await Promise.all([
          supabase.from('profiles').select('*, teams(id, name)').eq('id', user.id).single(),
          supabase.from('monthly_revenues').select('*').order('revenue_month', { ascending: false }),
          supabase.from('dis_reports').select('*').order('report_date', { ascending: false }).limit(500),
          supabase.from('teams').select('*')
        ])

        const profile = profRes.data || null
        setUserProfile(profile)
        setUserTeam(profile?.teams || null)
        setUserRevenues(revRes.data || [])
        setUserDisReports(disRes.data || [])
        setAllTeams(teamRes.data || [])

        // Initial welcome message
        const firstName = profile?.first_name || 'Admin'
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `👋 **Welcome, ${firstName}!** I am your **Executive AI Copilot**.\n\nI'm directly connected to your platform's live revenue logs, team metrics, and global DIS reports. How can I help power your strategic decisions today? Choose a prompt below or ask me anything!`
          }
        ])
      } catch (err) {
        console.error('Failed to load context for AI Copilot:', err)
        setErrorMsg('Could not load platform records. Some AI insights might be general.')
      } finally {
        setLoadingContext(false)
      }
    }
    fetchUserData()
  }, [user])

  // Aggregate metrics for summary ribbon & system context
  const stats = useMemo(() => {
    const now = new Date()
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    
    // This month revenue
    const thisMonthRevs = userRevenues.filter(r => normalizeMonth(r.revenue_month) === currentMonthStr)
    const thisMonthTotal = thisMonthRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)

    // All time revenue
    const allTimeTotal = userRevenues.reduce((sum, r) => sum + Number(r.amount || 0), 0)

    // Recent 6 months breakdown
    const monthlySummary = {}
    userRevenues.forEach(r => {
      const m = normalizeMonth(r.revenue_month)
      monthlySummary[m] = (monthlySummary[m] || 0) + Number(r.amount || 0)
    })

    // Source breakdown
    const sourceBreakdown = {}
    userRevenues.forEach(r => {
      const src = r.source || 'Unknown'
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + Number(r.amount || 0)
    })
    const topSource = Object.entries(sourceBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

    // Total leads from recent DIS
    const totalLeads = userDisReports.reduce((sum, d) => sum + Number(d.positive_leads || 0), 0)
    const totalExpected = userDisReports.reduce((sum, d) => sum + Number(d.expected_revenue || 0), 0)

    // Top Performing Team
    const teamBreakdown = {}
    userRevenues.forEach(r => {
      if (!r.team_id) return
      teamBreakdown[r.team_id] = (teamBreakdown[r.team_id] || 0) + Number(r.amount || 0)
    })
    const topTeamId = Object.entries(teamBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topTeamName = allTeams.find(t => t.id === topTeamId)?.name || 'N/A'

    return {
      thisMonthTotal,
      allTimeTotal,
      totalDeals: userRevenues.length,
      topSource,
      monthlySummary,
      sourceBreakdown,
      totalLeads,
      totalExpected,
      activeTeams: allTeams.length,
      topTeamName
    }
  }, [userRevenues, userDisReports, allTeams])

  // Suggested 1-click prompts
  const quickPrompts = [
    {
      title: 'Global Revenue Trends',
      icon: TrendingUp,
      prompt: 'Analyze overall platform revenue trends over recent months. Highlight growth patterns, dips, and average deal sizes.'
    },
    {
      title: 'Top Performers',
      icon: Target,
      prompt: 'Which teams or sources are driving the most revenue this month, and how can we replicate their success?'
    },
    {
      title: 'Best Source Analysis',
      icon: Compass,
      prompt: 'Which deal source (Instagram, LinkedIn, etc.) generates the highest global revenue, and how should we allocate marketing focus?'
    },
    {
      title: 'Strategic Action Plan',
      icon: Zap,
      prompt: 'Based on the latest global DIS reports and pipeline health, give me 3 executive-level strategies to boost this month’s closing rate.'
    },
    {
      title: 'Pipeline Health',
      icon: FileText,
      prompt: 'Summarize the total active leads and expected revenue across all teams from the recent DIS logs. Are we pacing well?'
    }
  ]

  // Send message to AI
  const handleSendMessage = async (customPrompt) => {
    const text = customPrompt || inputValue
    if (!text.trim() || isGenerating) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim()
    }

    setMessages(prev => [...prev, userMessage])
    if (!customPrompt) setInputValue('')
    setIsGenerating(true)
    setErrorMsg('')

    try {
      const now = new Date()
      const currentMonthName = MONTH_NAMES[now.getMonth()]
      const currentYear = now.getFullYear()

      // System context grounding the user's data
      const systemInstruction = `
You are the Executive AI Platform Copilot and Strategic Advisor for "${userProfile?.first_name || 'Admin'}".
Company/Platform: Ideallabs (B2B SaaS & Growth Operations).
Current Date: ${now.toDateString()} (Month: ${currentMonthName} ${currentYear}).

PLATFORM LIVE METRICS CONTEXT:
- Active Teams Count: ${stats.activeTeams}
- This Month's Total Revenue (${currentMonthName} ${currentYear}): $${stats.thisMonthTotal.toFixed(2)}
- Total All-Time Logged Revenue: $${stats.allTimeTotal.toFixed(2)} across ${stats.totalDeals} logged deals
- Top Performing Team (All Time): ${stats.topTeamName}
- Top Revenue Source: ${stats.topSource}
- Global Revenue by Source Breakdown: ${JSON.stringify(stats.sourceBreakdown)}
- Global Monthly Revenue History: ${JSON.stringify(stats.monthlySummary)}
- Recent DIS Activity (Global): ${stats.totalLeads} positive leads, ~$${stats.totalExpected.toFixed(2)} expected revenue

COACHING & RESPONSE SIZING RULES:
1. Speak directly to "${userProfile?.first_name || 'Admin'}" in a strategic, analytical, and executive tone.
2. Ground all calculations in the REAL global platform metrics provided above. Never invent fake revenue or contradict the live records.
3. RESPONSE SIZING & VERBOSITY CONTROL (CRITICAL DIRECTIVE):
   - Current Response Sizing Mode: ${responseLengthMode === 'detailed' ? 'DEEP DIVE (Detailed & Extensive)' : 'BALANCED & NECESSARY (Strict Default)'}
   - STICK TO WHAT IS NECESSARY: Deliver high-density, precise answers with the exact metrics, calculations, and strategic takeaways needed. Eliminate all fluff, repetition, and disclaimers.
   - ZERO PLEASANTRIES: Do not waste words on greetings or corporate filler (never start with "Certainly!", "I'd be glad to help...", or "As your personal AI Copilot..."). Jump immediately into the facts and data.
   - NOT SHORT: Do NOT provide clipped, truncated, or unhelpful one-liners (never just say "Yes" or a single vague sentence). Ensure the answer contains all essential context, exact dollar values, and concrete steps.
   - LONG ANSWERS ONLY WHEN REQUIRED:
     * For standard questions, status checks, deal questions, or metric inquiries: deliver a crisp, structured response (typically 2-4 short bullet points or 2 concise paragraphs with exact metrics).
     * Provide long, comprehensive, multi-section answers ONLY when:
       (a) The user explicitly selects 'Deep Dive' mode, OR
       (b) The user's query explicitly demands extensive detail, full monthly review, or a multi-step roadmap (e.g., "explain in detail", "give me a full plan", "deep dive", "comprehensive breakdown").
4. Format output in clean Markdown with headers, bold key numbers (e.g., **$4,500.00**), and bulleted action items.
`

      // Format conversation history for continuity
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome')
        .slice(-4)
        .map(m => `${m.role === 'user' ? 'USER' : 'COPILOT'}: ${m.content}`)
        .join('\n\n')

      const finalPrompt = `
${systemInstruction}

CONVERSATION CONTEXT:
${conversationHistory}

NEW USER QUESTION:
${text.trim()}

TASK: Answer adhering strictly to the response sizing directive: stick to what is necessary, not short, and provide long answers only when explicitly required or requested.
`

      const { data, error: invokeError } = await supabase.functions.invoke('ai-analytics', {
        body: {
          prompt: finalPrompt,
          systemPrompt: systemInstruction
        }
      })

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to communicate with AI model.')
      }

      if (data?.error) {
        throw new Error(data.error.message || JSON.stringify(data.error))
      }

      const replyContent = data?.choices?.[0]?.message?.content
      if (!replyContent) {
        throw new Error('Received an empty response from the AI Copilot.')
      }

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyContent
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Error generating AI response:', err)
      setErrorMsg(err.message || 'An error occurred while generating insights. Please try again.')
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ **Unable to complete analysis:** ${err.message || 'Connection timeout'}. Please try again or check back shortly.`
        }
      ])
    } finally {
      setIsGenerating(false)
      inputRef.current?.focus()
    }
  }

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleClearChat = () => {
    const firstName = userProfile?.first_name || 'Admin'
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 **Fresh start, ${firstName}!** How can I assist with your executive strategy or global platform metrics today?`
      }
    ])
    setErrorMsg('')
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s var(--apple-ease)', maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="apple-kicker" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--apple-accent-blue)' }}>
            <Sparkles size={14} /> Executive Platform Intelligence
          </div>
          <h1 className="apple-title-large" style={{ margin: '4px 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            AI Copilot
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, rgba(0,113,227,0.2), rgba(48,213,200,0.2))',
              border: '1px solid rgba(48,213,200,0.3)',
              color: 'var(--apple-accent-green)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Live Grounded
            </span>
          </h1>
          <p className="apple-lead" style={{ margin: 0 }}>
            Your executive AI strategic advisor, powered by global platform metrics.
          </p>
        </div>

        {/* Header Controls: Response Sizing Mode & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Response Sizing Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '3px 4px',
            borderRadius: '10px',
            border: '1px solid var(--apple-border)'
          }}>
            <button
              type="button"
              onClick={() => setResponseLengthMode('necessary')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '7px',
                fontSize: '0.8rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                background: responseLengthMode === 'necessary' ? 'rgba(0, 113, 227, 0.28)' : 'transparent',
                color: responseLengthMode === 'necessary' ? '#fff' : 'var(--apple-text-secondary)',
                boxShadow: responseLengthMode === 'necessary' ? '0 2px 8px rgba(0, 113, 227, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Stick strictly to what is necessary — crisp, high-density, no fluff"
            >
              <Zap size={13} color={responseLengthMode === 'necessary' ? 'var(--apple-accent-blue)' : 'currentColor'} />
              <span>Necessary</span>
            </button>
            <button
              type="button"
              onClick={() => setResponseLengthMode('detailed')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '7px',
                fontSize: '0.8rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                background: responseLengthMode === 'detailed' ? 'rgba(0, 113, 227, 0.28)' : 'transparent',
                color: responseLengthMode === 'detailed' ? '#fff' : 'var(--apple-text-secondary)',
                boxShadow: responseLengthMode === 'detailed' ? '0 2px 8px rgba(0, 113, 227, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
              title="Comprehensive deep dive with extensive multi-step breakdown"
            >
              <FileText size={13} color={responseLengthMode === 'detailed' ? 'var(--apple-accent-blue)' : 'currentColor'} />
              <span>Deep Dive</span>
            </button>
          </div>

          {/* Clear Chat Button */}
          {messages.length > 1 && (
            <button
              onClick={handleClearChat}
              className="apple-btn apple-btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '0.85rem' }}
            >
              <RotateCcw size={14} /> Reset Session
            </button>
          )}
        </div>
      </div>

      {/* ── Live Performance Context Ribbon ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div className="apple-card" style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            Active Teams
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff' }}>
            {stats.activeTeams} Teams
          </div>
        </div>

        <div className="apple-card" style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            This Month's Revenue
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>
            ${stats.thisMonthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="apple-card" style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            Top Performing Team
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--apple-accent-blue)' }}>
            {stats.topTeamName}
          </div>
        </div>

        <div className="apple-card" style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--apple-border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            Top Deal Source
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--apple-accent-orange)' }}>
            {stats.topSource}
          </div>
        </div>
      </div>

      {/* ── Main Chat Window (Full-Page Expansion, No Inner Scrollbar) ── */}
      <div className="apple-card" style={{
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '520px',
        position: 'relative'
      }}>
        
        {/* Messages Feed - Expands with page */}
        <div style={{
          padding: '28px 24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {messages.map((m) => {
            const isUser = m.role === 'user'
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: isUser ? '80%' : '90%'
                }}
              >
                {!isUser && (
                  <div style={{
                    width: '36px', height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1, #0071e3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}>
                    <Bot size={18} color="#fff" />
                  </div>
                )}

                <div style={{
                  position: 'relative',
                  padding: '16px 20px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser ? 'linear-gradient(135deg, #0071e3, #005bb5)' : 'var(--apple-bg)',
                  border: isUser ? 'none' : '1px solid var(--apple-border)',
                  color: isUser ? '#fff' : 'var(--apple-text-primary)',
                  fontSize: '0.94rem',
                  lineHeight: '1.6',
                  boxShadow: isUser ? '0 4px 16px rgba(0, 113, 227, 0.25)' : 'none'
                }}>
                  {isUser ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  ) : (
                    <div>
                      <ReactMarkdown
                        components={{
                          h1: ({node, ...props}) => <h3 style={{ fontSize: '1.2rem', margin: '12px 0 6px', color: 'var(--apple-accent-blue)' }} {...props} />,
                          h2: ({node, ...props}) => <h4 style={{ fontSize: '1.05rem', margin: '10px 0 4px', color: 'var(--apple-text-primary)' }} {...props} />,
                          h3: ({node, ...props}) => <h5 style={{ fontSize: '0.95rem', margin: '8px 0 4px', color: 'var(--apple-text-secondary)' }} {...props} />,
                          p: ({node, ...props}) => <p style={{ margin: '0 0 10px 0' }} {...props} />,
                          ul: ({node, ...props}) => <ul style={{ paddingLeft: '20px', margin: '0 0 10px 0' }} {...props} />,
                          li: ({node, ...props}) => <li style={{ marginBottom: '4px' }} {...props} />,
                          strong: ({node, ...props}) => <strong style={{ color: 'var(--apple-accent-green)' }} {...props} />
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>

                      {/* Copy Action */}
                      {m.id !== 'welcome' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                          <button
                            onClick={() => handleCopy(m.id, m.content)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--apple-text-secondary)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              opacity: 0.7,
                              transition: 'opacity 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.opacity = '1'}
                            onMouseOut={e => e.currentTarget.style.opacity = '0.7'}
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check size={12} color="var(--apple-accent-green)" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy size={12} /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div style={{
                    width: '36px', height: '36px',
                    borderRadius: '10px',
                    background: 'var(--apple-bg)',
                    border: '1px solid var(--apple-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={18} color="var(--apple-text-primary)" />
                  </div>
                )}
              </div>
            )
          })}

          {/* Typing indicator */}
          {isGenerating && (
            <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start', alignItems: 'center' }}>
              <div style={{
                width: '36px', height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #0071e3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Loader2 size={18} color="#fff" className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <div style={{
                padding: '12px 18px',
                borderRadius: '16px 16px 16px 4px',
                background: 'var(--apple-bg)',
                border: '1px solid var(--apple-border)',
                color: 'var(--apple-text-secondary)',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>Copilot is analyzing your performance data...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Bottom Section (Chips + Input Bar at bottom of chat) ── */}
        <div style={{
          background: 'var(--apple-card)',
          borderTop: '1px solid var(--apple-border)',
          borderRadius: '0 0 16px 16px'
        }}>
          {/* ── Quick Starter Chips ── */}
          <div className="no-scrollbar" style={{
            padding: '12px 20px 4px',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {quickPrompts.map((qp, idx) => {
              const Icon = qp.icon
              return (
                <button
                  key={idx}
                  disabled={isGenerating}
                  onClick={() => handleSendMessage(qp.prompt)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    background: 'var(--apple-bg)',
                    border: '1px solid var(--apple-border)',
                    color: 'var(--apple-text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isGenerating ? 0.5 : 1
                  }}
                  onMouseOver={e => {
                    if (!isGenerating) {
                      e.currentTarget.style.background = 'rgba(0, 113, 227, 0.15)'
                      e.currentTarget.style.color = '#fff'
                      e.currentTarget.style.borderColor = 'rgba(0, 113, 227, 0.3)'
                    }
                  }}
                  onMouseOut={e => {
                    if (!isGenerating) {
                      e.currentTarget.style.background = 'var(--apple-bg)'
                      e.currentTarget.style.color = 'var(--apple-text-secondary)'
                      e.currentTarget.style.borderColor = 'var(--apple-border)'
                    }
                  }}
                >
                  <Icon size={13} color="var(--apple-accent-blue)" />
                  {qp.title}
                </button>
              )
            })}
          </div>

          {/* ── Input Bar ── */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            style={{
              padding: '12px 20px 16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}
          >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask your Copilot anything about your revenue, pacing, or pipeline..."
            disabled={isGenerating}
            style={{
              flex: 1,
              height: '48px',
              padding: '0 16px',
              fontSize: '0.94rem',
              borderRadius: '12px',
              background: 'var(--apple-bg)',
              border: '1px solid var(--apple-border)',
              color: 'var(--apple-text-primary)',
              outline: 'none'
            }}
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isGenerating}
            className="apple-btn apple-btn-primary"
            style={{
              height: '48px',
              width: '48px',
              padding: '0',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: !inputValue.trim() || isGenerating ? 0.4 : 1,
              cursor: !inputValue.trim() || isGenerating ? 'not-allowed' : 'pointer'
            }}
          >
            <Send size={18} />
          </button>
        </form>
        </div>
      </div>
      <div ref={bottomOfChatRef} />

      {/* ── Floating Scroll-to-Bottom Arrow Button ── */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll down to bottom"
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '32px',
            zIndex: 999,
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0071e3, #005bb5)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 24px rgba(0, 113, 227, 0.45), 0 2px 8px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'scale(1.12) translateY(2px)'
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 113, 227, 0.6)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 113, 227, 0.45), 0 2px 8px rgba(0,0,0,0.5)'
          }}
          title="Scroll down to latest message"
        >
          <ChevronDown size={22} strokeWidth={2.5} />
        </button>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
