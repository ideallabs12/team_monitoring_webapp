import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  getLastNMonths,
  normalizeMonth,
  sumRevenues
} from '../../utils/revenueUtils'

const fmtFull = (n) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function MtdContributors() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    async function loadData() {
      try {
        const [teamsRes, profilesRes, revRes] = await Promise.all([
          supabase.from('teams').select('*').order('name', { ascending: true }),
          supabase.from('profiles').select('*'),
          supabase.from('monthly_revenues').select('*')
        ])
        setTeams(teamsRes.data || [])
        setProfiles(profilesRes.data || [])
        setRevenues(revRes.data || [])
      } catch (err) {
        console.error('Error loading MTD contributors data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const currentMonthStr = useMemo(() => getLastNMonths(1)[0], [])
  const nonAdminProfiles = useMemo(
    () => profiles.filter(p => p.platform_role !== 'admin' && !p.is_deactivated),
    [profiles]
  )

  const mtdContributors = useMemo(() => {
    return nonAdminProfiles.map(p => {
      const team = teams.find(t => t.id === p.team_id)
      return {
        ...p,
        teamName: team ? team.name : 'Unknown',
        amount: sumRevenues(revenues.filter(r => r.user_id === p.id && normalizeMonth(r.revenue_month) === currentMonthStr))
      }
    }).filter(p => p.amount > 0).sort((a, b) => b.amount - a.amount)
  }, [nonAdminProfiles, revenues, currentMonthStr, teams])

  const midPoint = Math.ceil(mtdContributors.length / 2)
  const leftContributors = useMemo(() => mtdContributors.slice(0, midPoint), [mtdContributors, midPoint])
  const rightContributors = useMemo(() => mtdContributors.slice(midPoint), [mtdContributors, midPoint])

  const renderCard = (user, rank) => {
    const isTop1 = rank === 1
    const isTop2 = rank === 2
    const isTop3 = rank === 3

    const rankBadgeColor = isTop1
      ? '#ffd700'
      : isTop2
      ? '#cbd5e1'
      : isTop3
      ? '#cd7f32'
      : 'var(--apple-text-secondary)'

    const rankBadgeBg = isTop1
      ? 'rgba(255, 215, 0, 0.12)'
      : isTop2
      ? 'rgba(203, 213, 225, 0.12)'
      : isTop3
      ? 'rgba(205, 127, 50, 0.12)'
      : 'rgba(255, 255, 255, 0.04)'

    const rankBadgeBorder = isTop1
      ? 'rgba(255, 215, 0, 0.3)'
      : isTop2
      ? 'rgba(203, 213, 225, 0.3)'
      : isTop3
      ? 'rgba(205, 127, 50, 0.3)'
      : 'var(--apple-border)'

    return (
      <div
        key={user.id || rank}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderRadius: '16px',
          background: 'var(--apple-card-bg)',
          border: '1px solid var(--apple-border)',
          transition: 'background 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--apple-card-hover)'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.borderColor = 'var(--apple-border-strong)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--apple-card-bg)'
          e.currentTarget.style.transform = 'none'
          e.currentTarget.style.borderColor = 'var(--apple-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          {/* Rank Badge */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: rankBadgeBg,
              border: `1px solid ${rankBadgeBorder}`,
              color: rankBadgeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: '800',
              flexShrink: 0
            }}
          >
            #{rank}
          </div>

          {/* Avatar */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: isTop1
                ? 'rgba(255, 215, 0, 0.15)'
                : 'rgba(52, 211, 153, 0.1)',
              color: isTop1 ? '#ffd700' : 'var(--apple-accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '1.15rem',
              flexShrink: 0
            }}
          >
            {user.first_name ? user.first_name[0].toUpperCase() : 'U'}
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: '700',
                fontSize: '1.05rem',
                color: 'var(--apple-text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user.first_name} {user.last_name}
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                color: 'var(--apple-text-secondary)',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user.teamName}
            </div>
          </div>
        </div>

        <div
          style={{
            fontWeight: '800',
            fontSize: '1.2rem',
            color: 'var(--apple-text-primary)',
            marginLeft: '16px',
            flexShrink: 0
          }}
        >
          {fmtFull(user.amount)}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--apple-text-primary)' }}>
        Loading contributors...
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <style>{`
        @media (max-width: 768px) {
          .contributors-columns-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <button 
        onClick={() => navigate('/admin/home')}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', 
          background: 'none', border: 'none', color: 'var(--apple-text-secondary)',
          cursor: 'pointer', marginBottom: '24px', padding: '0', fontSize: '0.9rem',
          fontWeight: '600'
        }}
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--apple-text-primary)' }}>MTD Revenue Contributors</h1>
        <p style={{ margin: 0, color: 'var(--apple-text-secondary)' }}>Month-to-date · all teams</p>
      </div>

      <div style={{ background: 'var(--apple-card)', borderRadius: '20px', border: '1px solid var(--apple-border)', padding: '20px' }}>
        {mtdContributors.length > 0 ? (
          <div
            className="contributors-columns-container"
            style={{
              display: 'grid',
              gridTemplateColumns: rightContributors.length > 0 ? 'repeat(2, 1fr)' : '1fr',
              gap: '16px',
              alignItems: 'start'
            }}
          >
            {/* Left Column (highest to lowest for top half) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {leftContributors.map((user, i) => renderCard(user, i + 1))}
            </div>

            {/* Right Column (continuation from highest to lowest for second half) */}
            {rightContributors.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {rightContributors.map((user, i) => renderCard(user, midPoint + i + 1))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--apple-text-secondary)', fontSize: '1.1rem' }}>
            No contributors found for this month yet.
          </div>
        )}
      </div>
    </div>
  )
}
