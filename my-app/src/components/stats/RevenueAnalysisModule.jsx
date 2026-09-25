import { useState, useMemo, useRef, useEffect } from 'react'
import { Copy, Check, X, Image as ImageIcon } from 'lucide-react'
import html2canvas from 'html2canvas'
import { normalizeMonth, getAvailableYears, MONTH_NAMES, isFutureMonth } from '../../utils/revenueUtils'

const shareOrDownloadImage = async (dataUrl, filename) => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (isMobile && navigator.share) {
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], filename, { type: 'image/jpeg' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] })
        return
      }
    } catch (e) { console.log('Share failed', e) }
  }
  const link = document.createElement('a')
  link.download = filename; link.href = dataUrl
  document.body.appendChild(link); link.click(); document.body.removeChild(link)
}

export default function RevenueAnalysisModule({ mode, profiles = [], revenues = [], memberships = [], teams = [], loading = false }) {
  const [revFilterYear, setRevFilterYear] = useState(new Date().getFullYear())
  const [revFilterMonth, setRevFilterMonth] = useState(new Date().getMonth())
  const [revFilterTeamId, setRevFilterTeamId] = useState('all')
  const [revFilterRange, setRevFilterRange] = useState('100-300')
  const [copied, setCopied] = useState(false)
  const [excludedTeams, setExcludedTeams] = useState([])
  const [excludedUsers, setExcludedUsers] = useState([])
  const [streakDuration, setStreakDuration] = useState(3)
  const [revJpegGenerating, setRevJpegGenerating] = useState(false)
  const revCaptureRef = useRef(null)

  useEffect(() => {
    if (isFutureMonth(revFilterYear, revFilterMonth)) setRevFilterMonth(new Date().getMonth())
  }, [revFilterYear, revFilterMonth])

  const nonAdminProfiles = useMemo(() => profiles.filter(p => p.platform_role !== 'admin' && !p.is_deactivated && !p.exclude_from_analytics), [profiles])
  const nonAdminIds = useMemo(() => new Set(nonAdminProfiles.map(p => p.id)), [nonAdminProfiles])
  const nonAdminRevenues = useMemo(() => revenues.filter(r => nonAdminIds.has(r.user_id)), [revenues, nonAdminIds])
  const revFilterMonthStr = useMemo(() => {
    const m = String(revFilterMonth + 1).padStart(2, '0')
    return `${revFilterYear}-${m}-01`
  }, [revFilterYear, revFilterMonth])

  const usersInRevenueRange = useMemo(() => {
    if (mode !== 'brackets') return []
    let users = nonAdminProfiles
    if (revFilterTeamId !== 'all') {
      const teamUserIds = new Set(memberships.filter(m => String(m.team_id) === String(revFilterTeamId)).map(m => m.user_id))
      users = users.filter(u => teamUserIds.has(u.id))
    }
    const usersWithRev = users.map(u => {
      const userRevs = nonAdminRevenues.filter(r => r.user_id === u.id && normalizeMonth(r.revenue_month) === revFilterMonthStr)
      const totalRev = userRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)
      const userTeamId = memberships.find(m => m.user_id === u.id)?.team_id
      const teamName = teams.find(t => t.id === userTeamId)?.name || 'No Team'
      return { ...u, totalRev, teamName }
    })
    let filteredUsers = usersWithRev.filter(u => {
      const r = u.totalRev
      switch (revFilterRange) {
        case '0': return r === 0
        case '100-300': return r >= 100 && r < 300
        case '300-600': return r >= 300 && r < 600
        case '600-1000': return r >= 600 && r < 1000
        case '1000-1500': return r >= 1000 && r < 1500
        case '1500-2000': return r >= 1500 && r < 2000
        case '2000-2500': return r >= 2000 && r < 2500
        case '2500-3000': return r >= 2500 && r < 3000
        case '3000+': return r >= 3000
        default: return false
      }
    })
    if (excludedTeams.length > 0) {
      const exTeamSet = new Set(excludedTeams.map(id => String(id)))
      filteredUsers = filteredUsers.filter(u => { const tId = memberships.find(m => m.user_id === u.id)?.team_id; return !exTeamSet.has(String(tId)) })
    }
    if (excludedUsers.length > 0) {
      const exUserSet = new Set(excludedUsers.map(id => String(id)))
      filteredUsers = filteredUsers.filter(u => !exUserSet.has(String(u.id)))
    }
    return filteredUsers.sort((a, b) => b.totalRev - a.totalRev)
  }, [mode, nonAdminProfiles, nonAdminRevenues, memberships, teams, revFilterTeamId, revFilterMonthStr, revFilterRange, excludedTeams, excludedUsers])

  const streakUsers = useMemo(() => {
    if (mode !== 'streak') return []
    const currentDate = new Date()
    const months = []
    for (let i = 0; i < streakDuration; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
    }
    let users = nonAdminProfiles
    if (revFilterTeamId !== 'all') {
      const teamUserIds = new Set(memberships.filter(m => String(m.team_id) === String(revFilterTeamId)).map(m => m.user_id))
      users = users.filter(u => teamUserIds.has(u.id))
    }
    const usersWithStreak = users.map(u => {
      const userRevs = nonAdminRevenues.filter(r => r.user_id === u.id && months.includes(normalizeMonth(r.revenue_month)))
      const totalRev = userRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0)
      const userTeamId = memberships.find(m => m.user_id === u.id)?.team_id
      const teamName = teams.find(t => t.id === userTeamId)?.name || 'No Team'
      return { ...u, totalRev, teamName }
    })
    let zeroUsers = usersWithStreak.filter(u => u.totalRev === 0)
    if (excludedTeams.length > 0) {
      const exTeamSet = new Set(excludedTeams.map(id => String(id)))
      zeroUsers = zeroUsers.filter(u => { const tId = memberships.find(m => m.user_id === u.id)?.team_id; return !exTeamSet.has(String(tId)) })
    }
    if (excludedUsers.length > 0) {
      const exUserSet = new Set(excludedUsers.map(id => String(id)))
      zeroUsers = zeroUsers.filter(u => !exUserSet.has(String(u.id)))
    }
    return zeroUsers.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''))
  }, [mode, streakDuration, nonAdminProfiles, nonAdminRevenues, memberships, teams, revFilterTeamId, excludedTeams, excludedUsers])

  const displayList = mode === 'brackets' ? usersInRevenueRange : streakUsers

  const handleCopyResults = () => {
    if (displayList.length === 0) return
    let titleBase = mode === 'streak'
      ? `Zero Revenue in Last ${streakDuration} Month${streakDuration > 1 ? 's' : ''}`
      : `Revenue: ${revFilterRange} for ${revFilterTeamId === 'all' ? 'All Teams' : (teams.find(t => String(t.id) === String(revFilterTeamId))?.name || 'Selected Team')} in ${MONTH_NAMES[revFilterMonth]} ${revFilterYear}`
    const cleanStr = s => (s || '').replace(/[\n\r]+/g, ' ').trim()
    const maxNameLen = Math.max(4, ...displayList.map(u => cleanStr(`${u.first_name || ''} ${u.last_name || ''}`).length))
    const maxTeamLen = Math.max(4, ...displayList.map(u => cleanStr(u.teamName).length))
    const padName = s => s.padEnd(maxNameLen + 4, ' ')
    const padTeam = s => s.padEnd(maxTeamLen + 4, ' ')
    const header = mode === 'streak' ? `${padName('Name')}	Team
` : `${padName('Name')}	${padTeam('Team')}	Revenue
`
    const rows = displayList.map(u => {
      const n = cleanStr(`${u.first_name || ''} ${u.last_name || ''}`)
      const t = cleanStr(u.teamName)
      return mode === 'streak' ? `${padName(n)}	${t}` : `${padName(n)}	${padTeam(t)}	$${u.totalRev.toFixed(2)}`
    }).join('\n')
    navigator.clipboard.writeText(`${titleBase}
${'='.repeat(titleBase.length)}

${header}${rows}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadRevJpeg = async () => {
    if (!revCaptureRef.current) return
    setRevJpegGenerating(true)
    try {
      const canvas = await html2canvas(revCaptureRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
      await shareOrDownloadImage(dataUrl, `${mode === 'brackets' ? 'Revenue_Report' : 'Zero_Revenue_Streak'}.jpg`)
    } catch (err) { console.error('Error generating JPEG', err) }
    finally { setRevJpegGenerating(false) }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>Loading stats...</div>

  return (
    <div>
      <div className="apple-card" style={{ padding: '24px', marginBottom: '24px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
              {mode === 'brackets' ? 'Revenue Analysis' : 'Streak Analysis'}
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: '800', color: 'var(--apple-text-primary)', letterSpacing: '-0.02em' }}>
              {mode === 'brackets' ? 'Revenue Ranges' : 'Zero Revenue Streaks'}
            </h2>
            <p style={{ margin: 0, color: 'var(--apple-text-secondary)', fontSize: '0.95rem', lineHeight: '1.5', maxWidth: '600px' }}>
              {mode === 'brackets' ? 'Filter team members by revenue brackets to analyze performance distribution.' : 'Identify team members who have generated zero revenue across consecutive months.'}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '16px', padding: '6px 16px', background: 'var(--apple-bg-secondary)', borderRadius: '20px', border: '1px solid var(--apple-border)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: displayList.length > 0 ? 'var(--apple-accent-blue)' : 'var(--apple-text-secondary)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>{displayList.length}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>users found</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleDownloadRevJpeg} disabled={displayList.length === 0 || revJpegGenerating}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: displayList.length === 0 ? 'not-allowed' : 'pointer', minHeight: '44px', opacity: displayList.length === 0 ? 0.5 : 1 }}>
              <ImageIcon size={16} />{revJpegGenerating ? 'Generating...' : 'Save as JPEG'}
            </button>
            <button onClick={handleCopyResults} disabled={displayList.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: displayList.length === 0 ? 'not-allowed' : 'pointer', minHeight: '44px', opacity: displayList.length === 0 ? 0.5 : 1 }}>
              {copied ? <Check size={16} color="var(--apple-accent-green)" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', padding: '12px 16px', background: 'var(--apple-bg-secondary)', borderRadius: '12px', border: '1px solid var(--apple-border)', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--apple-text-secondary)', marginRight: '8px' }}>Filters:</span>
          <select value={revFilterTeamId} onChange={e => setRevFilterTeamId(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px' }}>
            <option value="all">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {mode === 'brackets' ? (
            <>
              <select value={revFilterMonth} onChange={e => setRevFilterMonth(Number(e.target.value))}
                style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px' }}>
                {MONTH_NAMES.map((name, idx) => <option key={idx} value={idx} disabled={isFutureMonth(revFilterYear, idx)}>{name}</option>)}
              </select>
              <select value={revFilterYear} onChange={e => setRevFilterYear(Number(e.target.value))}
                style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px' }}>
                {getAvailableYears().map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={revFilterRange} onChange={e => setRevFilterRange(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px' }}>
                <option value="0">0 revenue</option>
                <option value="100-300">100 - 300</option>
                <option value="300-600">300 - 600</option>
                <option value="600-1000">600 - 1000</option>
                <option value="1000-1500">1000 - 1500</option>
                <option value="1500-2000">1500 - 2000</option>
                <option value="2000-2500">2000 - 2500</option>
                <option value="2500-3000">2500 - 3000</option>
                <option value="3000+">3000 and above</option>
              </select>
            </>
          ) : (
            <select value={streakDuration} onChange={e => setStreakDuration(Number(e.target.value))}
              style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px' }}>
              <option value={3}>Last 3 Months (Zero)</option>
              <option value={6}>Last 6 Months (Zero)</option>
            </select>
          )}
        </div>

        <div style={{ padding: '16px', background: 'var(--apple-bg-secondary)', borderRadius: '12px', border: '1px solid var(--apple-border)', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>Exclusion Filters</div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <select value="" onChange={e => { if (e.target.value && !excludedTeams.includes(e.target.value)) setExcludedTeams([...excludedTeams, e.target.value]) }}
              style={{ padding: '6px 10px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)' }}>
              <option value="">Exclude a Team...</option>
              {teams.filter(t => !excludedTeams.includes(String(t.id))).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value="" onChange={e => { if (e.target.value && !excludedUsers.includes(e.target.value)) setExcludedUsers([...excludedUsers, e.target.value]) }}
              style={{ padding: '6px 10px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)' }}>
              <option value="">Exclude a User...</option>
              {nonAdminProfiles.filter(u => !excludedUsers.includes(String(u.id))).map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>
          {(excludedTeams.length > 0 || excludedUsers.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
              {excludedTeams.map(tId => {
                const tName = teams.find(t => String(t.id) === String(tId))?.name || 'Unknown Team'
                return <div key={tId} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '4px 10px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: '600' }}>Team: {tName} <X size={14} style={{ cursor: 'pointer' }} onClick={() => setExcludedTeams(excludedTeams.filter(id => String(id) !== String(tId)))} /></div>
              })}
              {excludedUsers.map(uId => {
                const u = nonAdminProfiles.find(p => String(p.id) === String(uId))
                const uName = u ? `${u.first_name} ${u.last_name}` : 'Unknown User'
                return <div key={uId} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', padding: '4px 10px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: '600' }}>User: {uName} <X size={14} style={{ cursor: 'pointer' }} onClick={() => setExcludedUsers(excludedUsers.filter(id => String(id) !== String(uId)))} /></div>
              })}
              <button onClick={() => { setExcludedTeams([]); setExcludedUsers([]) }} style={{ background: 'transparent', border: 'none', color: 'var(--apple-accent-blue)', fontSize: '0.8rem', cursor: 'pointer' }}>Clear All</button>
            </div>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px' 
        }}>
          {displayList.map((u, i) => {
            const hasRevenue = u.totalRev > 0;
            return (
              <div key={u.id} style={{
                background: hasRevenue && mode === 'brackets' ? 'rgba(0, 113, 227, 0.04)' : 'transparent',
                border: hasRevenue && mode === 'brackets' ? '1px solid rgba(0, 113, 227, 0.2)' : '1px solid var(--apple-border)',
                borderRadius: '12px',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background-color 0.2s ease, border-color 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = hasRevenue && mode === 'brackets' ? 'rgba(0, 113, 227, 0.04)' : 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'var(--apple-bg-secondary)', border: '1px solid var(--apple-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: '700', color: 'var(--apple-text-secondary)',
                    flexShrink: 0
                  }}>
                    {(u.first_name?.[0] || '')}{(u.last_name?.[0] || '')}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '1rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>
                      {u.first_name} {u.last_name}
                    </h4>
                    <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', fontWeight: '500' }}>
                      {u.teamName}
                    </div>
                  </div>
                </div>
                {mode === 'brackets' && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontWeight: '700', 
                      fontSize: '1.1rem',
                      color: hasRevenue ? 'var(--apple-accent-green)' : 'var(--apple-text-secondary)'
                    }}>
                      ${u.totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                {mode === 'streak' && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      fontWeight: '600', 
                      fontSize: '0.85rem',
                      color: 'var(--apple-accent-red)',
                      background: 'rgba(248,113,113,0.1)',
                      padding: '4px 10px',
                      borderRadius: '12px'
                    }}>
                      {streakDuration} Months Zero
                    </span>
                  </div>
                )}
              </div>
            )
          })}
          {displayList.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--apple-text-secondary)', border: '1px dashed var(--apple-border)', borderRadius: '16px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontSize: '1rem', fontWeight: '600' }}>No users found for this analysis.</div>
              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try adjusting your filters above.</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div ref={revCaptureRef} style={{ padding: '40px', background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)', color: '#102a43', fontFamily: 'system-ui, sans-serif', width: '1000px', borderRadius: '24px', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px', background: '#ffffff', padding: '24px', borderRadius: '16px' }}>
            <h2 style={{ margin: '0 0 12px 0', color: '#102a43', fontSize: '32px', fontWeight: '800' }}>
              {mode === 'streak' ? `Zero Revenue in Last ${streakDuration} Month${streakDuration > 1 ? 's' : ''}` : `Revenue: ${revFilterRange === '0' ? '$0' : revFilterRange.includes('-') ? '$' + revFilterRange.replace('-', ' - $') : '$' + revFilterRange}`}
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '15px', color: '#486581', fontWeight: '600' }}>
              {mode === 'brackets' && <>
                <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>Team: {revFilterTeamId === 'all' ? 'All Teams' : (teams.find(t => String(t.id) === String(revFilterTeamId))?.name || 'Selected Team')}</span>
                <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>Month: {MONTH_NAMES[revFilterMonth]} {revFilterYear}</span>
              </>}
              <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>Total Users: {displayList.length}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {displayList.map((u, i) => (
              <div key={i} style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#334155', fontWeight: '700' }}>{u.first_name} {u.last_name}</h4>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>{u.teamName}</div>
                {mode === 'brackets' && <div style={{ background: u.totalRev > 0 ? '#d1fae5' : '#fee2e2', color: u.totalRev > 0 ? '#10b981' : '#ef4444', padding: '2px 8px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', marginTop: '8px', display: 'inline-block' }}>${u.totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
