import React, { useEffect, useState, useMemo } from 'react'
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

  if (loading) {
    return (
      <div style={{ padding: '40px', color: 'var(--apple-text-primary)' }}>
        Loading contributors...
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mtdContributors.map((user, i) => (
              <div key={user.id || i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderRadius: '16px',
                background: 'var(--apple-card-bg)', border: '1px solid var(--apple-border)',
                transition: 'background 0.2s ease, transform 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--apple-card-hover)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--apple-card-bg)'
                e.currentTarget.style.transform = 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'rgba(52, 211, 153, 0.1)', color: 'var(--apple-accent-green)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: '700', fontSize: '1.2rem'
                  }}>
                    {user.first_name ? user.first_name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--apple-text-primary)' }}>
                      {user.first_name} {user.last_name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)', marginTop: '2px' }}>
                      {user.teamName}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: '800', fontSize: '1.25rem', color: 'var(--apple-text-primary)' }}>
                  {fmtFull(user.amount)}
                </div>
              </div>
            ))}
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
