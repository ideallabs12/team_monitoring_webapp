import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Trophy, Medal, Star, Award, TrendingUp, Users } from 'lucide-react'
import { toRevenueMonthString, sumRevenues, MONTH_NAMES } from '../../utils/revenueUtils'

const RankBadge = ({ rank, topRank }) => {
  let bg = 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))'
  let color = 'var(--apple-text-secondary)'
  let border = '1px solid rgba(255,255,255,0.1)'
  let shadow = 'inset 0 2px 4px rgba(255,255,255,0.05), 0 4px 8px rgba(0,0,0,0.2)'

  if (topRank === 1) {
    bg = 'linear-gradient(135deg, #FDE047, #D97706)'
    color = '#451A03'
    border = '1px solid #F59E0B'
    shadow = 'inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 12px rgba(217,119,6,0.3)'
  } else if (topRank === 2) {
    bg = 'linear-gradient(135deg, #F8FAFC, #94A3B8)'
    color = '#0F172A'
    border = '1px solid #CBD5E1'
    shadow = 'inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 12px rgba(148,163,184,0.3)'
  } else if (topRank === 3) {
    bg = 'linear-gradient(135deg, #FDBA74, #B45309)'
    color = '#451A03'
    border = '1px solid #D97706'
    shadow = 'inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 12px rgba(180,83,9,0.3)'
  }

  return (
    <div style={{
      width: '32px', height: '32px', borderRadius: '50%',
      background: bg,
      border: border,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: color, fontWeight: '800', fontSize: '1rem',
      margin: '0 auto',
      boxShadow: shadow
    }}>
      {rank}
    </div>
  )
}

export default function Leaderboard({ user }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('team') // 'team' | 'individual'
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  useEffect(() => {
    async function fetchLeaderboardData() {
      if (!user) return
      setLoading(true)
      try {
        const targetMonthStr = toRevenueMonthString(currentYear, currentMonth)

        const { data, error: rpcError } = await supabase.rpc('get_leaderboard_data', {
          target_month: targetMonthStr
        })

        if (rpcError) throw rpcError

        setTeams(data?.teams || [])
        setProfiles(data?.profiles || [])
        setRevenues(data?.revenues || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboardData()
  }, [user, currentYear, currentMonth])

  // Top Performing Individual
  const individualRankings = useMemo(() => {
    const userTotals = {}
    revenues.forEach(r => {
      userTotals[r.user_id] = (userTotals[r.user_id] || 0) + Number(r.amount || 0)
    })

    const ranked = profiles
      .filter(p => !p.is_deactivated && p.platform_role !== 'admin')
      .map(p => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        total: userTotals[p.id] || 0,
        team_id: p.team_id
      }))
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)

    return ranked
  }, [revenues, profiles])

  const topIndividual = individualRankings.length > 0 ? individualRankings[0] : null
  const topIndividualTeam = topIndividual ? teams.find(t => t.id === topIndividual.team_id) : null

  // Team Rankings
  const teamRankings = useMemo(() => {
    const teamTotals = {}
    revenues.forEach(r => {
      teamTotals[r.team_id] = (teamTotals[r.team_id] || 0) + Number(r.amount || 0)
    })

    const ranked = teams
      .map(t => ({
        id: t.id,
        name: t.name,
        total: teamTotals[t.id] || 0
      }))
      // .filter(t => t.total > 0) // Show all teams or only teams with > 0? Let's show all teams for full leaderboard
      .sort((a, b) => b.total - a.total)

    return ranked
  }, [revenues, teams])

  const topTeam = teamRankings.length > 0 && teamRankings[0].total > 0 ? teamRankings[0] : null

  if (loading) {
    return (
      <div className="apple-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ color: 'var(--apple-text-secondary)' }}>Loading Leaderboard...</div>
      </div>
    )
  }

  return (
    <div className="apple-page-container" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="apple-page-header" style={{ marginBottom: '28px' }}>
        <h1 className="apple-page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Trophy size={36} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.4))' }} />
          Leaderboard
        </h1>
        <p className="apple-page-subtitle">
          Top performers for {MONTH_NAMES[currentMonth]} {currentYear}
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--apple-accent-red)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(255, 69, 58, 0.2)' }}>
          {error}
        </div>
      )}

      {/* Top Performers Highlight Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        
        {/* Top Individual Card */}
        <div className="apple-card" style={{ 
          position: 'relative', overflow: 'hidden', padding: '32px 24px', 
          background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(18,18,20,0.95) 100%)',
          border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 8px 32px rgba(245,158,11,0.05)'
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1, transform: 'rotate(15deg)' }}>
            <Star size={120} color="#f59e0b" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Award size={20} color="#f59e0b" />
            <span style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f59e0b' }}>Top Individual</span>
          </div>
          {topIndividual ? (
            <>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                {topIndividual.name}
              </div>
              <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.95rem', marginBottom: '20px' }}>
                {topIndividualTeam ? topIndividualTeam.name : 'Unknown Team'}
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#4ade80', letterSpacing: '-0.03em' }}>
                ${topIndividual.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', marginTop: '20px' }}>No revenue logged yet this month.</div>
          )}
        </div>

        {/* Top Team Card */}
        <div className="apple-card" style={{ 
          position: 'relative', overflow: 'hidden', padding: '32px 24px', 
          background: 'linear-gradient(135deg, rgba(96,165,250,0.1) 0%, rgba(18,18,20,0.95) 100%)',
          border: '1px solid rgba(96,165,250,0.2)', boxShadow: '0 8px 32px rgba(96,165,250,0.05)'
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1, transform: 'rotate(-10deg)' }}>
            <Users size={120} color="#60a5fa" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={20} color="#60a5fa" />
            <span style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60a5fa' }}>Top Team</span>
          </div>
          {topTeam ? (
            <>
              <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff', marginBottom: '24px', letterSpacing: '-0.02em' }}>
                {topTeam.name}
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#4ade80', letterSpacing: '-0.03em' }}>
                ${topTeam.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--apple-text-secondary)', fontStyle: 'italic', marginTop: '20px' }}>No revenue logged yet this month.</div>
          )}
        </div>

      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '14px', marginBottom: '32px', width: '100%', border: '1px solid var(--apple-border)' }}>
        <button 
          onClick={() => setActiveTab('team')}
          style={{ 
            flex: 1, padding: '12px', borderRadius: '10px', border: 'none', 
            background: activeTab === 'team' ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: activeTab === 'team' ? '#fff' : 'var(--apple-text-secondary)',
            fontWeight: '600', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: activeTab === 'team' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
          }}
        >
          Team Rankings
        </button>
        <button 
          onClick={() => setActiveTab('individual')}
          style={{ 
            flex: 1, padding: '12px', borderRadius: '10px', border: 'none', 
            background: activeTab === 'individual' ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: activeTab === 'individual' ? '#fff' : 'var(--apple-text-secondary)',
            fontWeight: '600', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: activeTab === 'individual' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
          }}
        >
          Individual Rankings
        </button>
      </div>

      {activeTab === 'team' && (
        <>
          {/* Full Team Leaderboard Table */}
          <h2 style={{ fontSize: '1.4rem', fontWeight: '600', color: '#fff', marginBottom: '20px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Medal size={24} color="var(--apple-text-secondary)" />
            Team Rankings
          </h2>
      <div className="apple-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--apple-border)', background: 'rgba(255,255,255,0.02)', fontSize: '0.85rem' }}>
              <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600', width: '80px', textAlign: 'center' }}>Rank</th>
              <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600' }}>Team Name</th>
              <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600', textAlign: 'right' }}>Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {teamRankings.map((team, index) => {
              const isFirst = index === 0 && team.total > 0
              const isSecond = index === 1 && team.total > 0
              const isThird = index === 2 && team.total > 0

              let topRank = 0
              if (isFirst) topRank = 1
              else if (isSecond) topRank = 2
              else if (isThird) topRank = 3

              let rankDisplay = <RankBadge rank={index + 1} topRank={topRank} />

              return (
                <tr key={team.id} style={{
                  borderBottom: index === teamRankings.length - 1 ? 'none' : '1px solid var(--apple-border)',
                  background: isFirst
                    ? 'linear-gradient(to right, rgba(245,158,11,0.07), transparent)'
                    : isSecond
                    ? 'linear-gradient(to right, rgba(148,163,184,0.04), transparent)'
                    : isThird
                    ? 'linear-gradient(to right, rgba(180,83,9,0.04), transparent)'
                    : 'transparent',
                  transition: 'background 0.2s ease'
                }}>
                  <td style={{ padding: '16px 24px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {rankDisplay}
                  </td>
                  <td style={{ padding: '20px 24px', fontWeight: isFirst ? '700' : '500', color: isFirst ? '#fff' : 'var(--apple-text-primary)' }}>
                    {team.name}
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: '700', color: team.total > 0 ? '#4ade80' : 'var(--apple-text-secondary)' }}>
                    ${team.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )
            })}
            {teamRankings.length === 0 && (
              <tr>
                <td colSpan="3" style={{ padding: '32px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>
                  No teams found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      )}

      {activeTab === 'individual' && (
        <>
          {/* Full Individual Leaderboard Table */}
          <h2 style={{ fontSize: '1.4rem', fontWeight: '600', color: '#fff', marginBottom: '20px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={24} color="var(--apple-text-secondary)" />
            Individual Rankings (Top 10)
          </h2>
      <div className="apple-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--apple-border)', background: 'rgba(255,255,255,0.02)', fontSize: '0.85rem' }}>
              <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600', width: '80px', textAlign: 'center' }}>Rank</th>
              <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600' }}>Name</th>
              <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600' }}>Team</th>
              <th style={{ padding: '16px 24px', color: 'var(--apple-text-secondary)', fontWeight: '600', textAlign: 'right' }}>Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {individualRankings.slice(0, 10).map((indiv, index) => {
              const isFirst = index === 0 && indiv.total > 0
              const isSecond = index === 1 && indiv.total > 0
              const isThird = index === 2 && indiv.total > 0
              const teamObj = teams.find(t => t.id === indiv.team_id)

              let topRank = 0
              if (isFirst) topRank = 1
              else if (isSecond) topRank = 2
              else if (isThird) topRank = 3

              let rankDisplay = <RankBadge rank={index + 1} topRank={topRank} />

              return (
                <tr key={indiv.id} style={{
                  borderBottom: index === 9 || index === individualRankings.slice(0, 10).length - 1 ? 'none' : '1px solid var(--apple-border)',
                  background: isFirst
                    ? 'linear-gradient(to right, rgba(245,158,11,0.07), transparent)'
                    : isSecond
                    ? 'linear-gradient(to right, rgba(148,163,184,0.04), transparent)'
                    : isThird
                    ? 'linear-gradient(to right, rgba(180,83,9,0.04), transparent)'
                    : 'transparent',
                  transition: 'background 0.2s ease'
                }}>
                  <td style={{ padding: '16px 24px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {rankDisplay}
                  </td>
                  <td style={{ padding: '20px 24px', fontWeight: isFirst ? '700' : '500', color: isFirst ? '#fff' : 'var(--apple-text-primary)' }}>
                    {indiv.name}
                  </td>
                  <td style={{ padding: '20px 24px', color: 'var(--apple-text-secondary)' }}>
                    {teamObj ? teamObj.name : 'Unknown'}
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: '700', color: indiv.total > 0 ? '#4ade80' : 'var(--apple-text-secondary)' }}>
                    ${indiv.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )
            })}
            {individualRankings.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>
                  No individuals found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  )
}
