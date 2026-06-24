import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Award, Users, TrendingUp, Crown, DollarSign, Flame, Star, Trophy } from 'lucide-react'
import { formatRevenueMonth } from '../../utils/revenueUtils'
import { calculateMilestones } from '../../utils/milestoneUtils'

export default function Milestones({ user }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  const [disReports, setDisReports] = useState([])

  useEffect(() => {
    async function fetchMilestoneData() {
      setLoading(true)
      try {
        const [teamsRes, profilesRes, revRes, disRes] = await Promise.all([
          supabase.from('teams').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('monthly_revenues').select('*'),
          supabase.from('dis_reports').select('*')
        ])

        if (teamsRes.error) throw teamsRes.error
        if (profilesRes.error) throw profilesRes.error
        if (revRes.error) throw revRes.error
        if (disRes.error) throw disRes.error

        setTeams(teamsRes.data || [])
        setProfiles(profilesRes.data || [])
        setRevenues(revRes.data || [])
        setDisReports(disRes.data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchMilestoneData()
  }, [user])

  const milestones = useMemo(() => {
    if (revenues.length === 0 || profiles.length === 0 || teams.length === 0) {
      return null
    }
    return calculateMilestones(revenues, profiles, teams, disReports)
  }, [revenues, profiles, teams, disReports])

  if (loading) {
    return (
      <div className="apple-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ color: 'var(--apple-text-secondary)', fontSize: '1.1rem' }}>Loading Milestones...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="apple-page-container">
        <div style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--apple-accent-red)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 69, 58, 0.2)' }}>
          {error}
        </div>
      </div>
    )
  }

  const hasData = milestones !== null

  return (
    <div className="apple-page-container" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Page Header */}
      <div className="apple-page-header" style={{ marginBottom: '40px' }}>
        <h1 className="apple-page-title" style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: 0 }}>
          <Trophy size={38} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.4))' }} />
          Hall of Milestones
        </h1>
        <p className="apple-page-subtitle" style={{ marginTop: '8px', color: 'var(--apple-text-secondary)', fontSize: '1.1rem' }}>
          All-time records, company-wide breakthroughs, and legendary achievements.
        </p>
      </div>

      {!hasData ? (
        <div className="apple-card" style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📭</div>
          <h3 style={{ color: '#fff', marginBottom: '8px' }}>No Milestone Data Found</h3>
          <p style={{ color: 'var(--apple-text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
            There is currently no revenue or report data logged in the system to compute milestones.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Main Core Milestones Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px' }}>
            
            {/* 1. Highest Revenue Member in a Month */}
            <div className="apple-card" style={{
              position: 'relative', overflow: 'hidden', padding: '32px 28px',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(18,18,20,0.95) 100%)',
              border: '1px solid rgba(251,191,36,0.18)', boxShadow: '0 8px 32px rgba(251,191,36,0.03)',
              display: 'flex', flexDirection: 'column', justifyContent: 'between'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.08, transform: 'rotate(15deg)' }}>
                <Crown size={140} color="#fbbf24" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <Crown size={20} color="#fbbf24" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fbbf24' }}>
                    Highest Individual Revenue (Month)
                  </span>
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: '700', color: '#fff', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                  {milestones.maxMemberInMonth.userName}
                </div>
                <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                  Team: <strong style={{ color: '#fff' }}>{milestones.maxMemberInMonth.teamName}</strong>
                </div>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Month Achieved</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginTop: '2px' }}>
                    {formatRevenueMonth(milestones.maxMemberInMonth.month)}
                  </div>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#34d399', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  ${Math.round(milestones.maxMemberInMonth.amount).toLocaleString()}
                </div>
              </div>
            </div>

            {/* 2. Highest Revenue Team in a Month */}
            <div className="apple-card" style={{
              position: 'relative', overflow: 'hidden', padding: '32px 28px',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(18,18,20,0.95) 100%)',
              border: '1px solid rgba(6,182,212,0.18)', boxShadow: '0 8px 32px rgba(6,182,212,0.03)',
              display: 'flex', flexDirection: 'column', justifyContent: 'between'
            }}>
              <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.08, transform: 'rotate(-10deg)' }}>
                <Users size={140} color="#06b6d4" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <Users size={20} color="#06b6d4" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#06b6d4' }}>
                    Highest Team Revenue (Month)
                  </span>
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: '700', color: '#fff', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                  {milestones.maxTeamInMonth.teamName}
                </div>
                <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                  Collective monthly output record
                </div>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Month Achieved</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginTop: '2px' }}>
                    {formatRevenueMonth(milestones.maxTeamInMonth.month)}
                  </div>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#34d399', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  ${Math.round(milestones.maxTeamInMonth.amount).toLocaleString()}
                </div>
              </div>
            </div>

            {/* 3. Company-Wide Highest Revenue Month */}
            <div className="apple-card" style={{
              position: 'relative', overflow: 'hidden', padding: '32px 28px',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(18,18,20,0.95) 100%)',
              border: '1px solid rgba(168,85,247,0.18)', boxShadow: '0 8px 32px rgba(168,85,247,0.03)',
              display: 'flex', flexDirection: 'column', justifyContent: 'between'
            }}>
              <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.08, transform: 'rotate(5deg)' }}>
                <TrendingUp size={140} color="#a855f7" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <TrendingUp size={20} color="#a855f7" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a855f7' }}>
                    All-Time Company Revenue (Month)
                  </span>
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: '700', color: '#fff', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                  {formatRevenueMonth(milestones.maxCompanyInMonth.month)}
                </div>
                <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                  Combined revenue of all teams
                </div>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Target Status</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginTop: '2px' }}>
                    Company Peak Performance
                  </div>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#34d399', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  ${Math.round(milestones.maxCompanyInMonth.amount).toLocaleString()}
                </div>
              </div>
            </div>

            {/* 4. All-Time Highest Revenue Team Lead in One Month */}
            <div className="apple-card" style={{
              position: 'relative', overflow: 'hidden', padding: '32px 28px',
              background: 'linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(18,18,20,0.95) 100%)',
              border: '1px solid rgba(79,70,229,0.18)', boxShadow: '0 8px 32px rgba(79,70,229,0.03)',
              display: 'flex', flexDirection: 'column', justifyContent: 'between'
            }}>
              <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.08, transform: 'rotate(-5deg)' }}>
                <Award size={140} color="#4f46e5" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <Award size={20} color="#4f46e5" />
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f46e5' }}>
                    Highest Team Lead Revenue (Month)
                  </span>
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: '700', color: '#fff', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                  {milestones.maxLeadInMonth.userName}
                </div>
                <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                  Team: <strong style={{ color: '#fff' }}>{milestones.maxLeadInMonth.teamName}</strong>
                </div>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Month Achieved</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginTop: '2px' }}>
                    {formatRevenueMonth(milestones.maxLeadInMonth.month)}
                  </div>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#34d399', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  ${Math.round(milestones.maxLeadInMonth.amount).toLocaleString()}
                </div>
              </div>
            </div>

          </div>

          {/* Secondary Suggestions Grid */}
          <h2 style={{ fontSize: '1.4rem', fontWeight: '600', color: '#fff', margin: '20px 0 0 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Star size={24} color="#a855f7" />
            Special Achievements
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px' }}>
            {/* 5. Largest Deal Ever Closed */}
            <div className="apple-card" style={{
              position: 'relative', overflow: 'hidden', padding: '30px 24px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(18,18,20,0.95) 100%)',
              border: '1px solid rgba(16,185,129,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'between'
            }}>
              <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.06 }}>
                <DollarSign size={130} color="#10b981" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <DollarSign size={18} color="#10b981" />
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10b981' }}>
                    Largest Single Deal Closed
                  </span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                  {milestones.maxSingleDeal.clientName}
                </div>
                <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Closed by: <strong style={{ color: '#fff' }}>{milestones.maxSingleDeal.userName}</strong> ({milestones.maxSingleDeal.teamName})
                </div>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Month Closed</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginTop: '2px' }}>
                    {formatRevenueMonth(milestones.maxSingleDeal.month)}
                  </div>
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#34d399', lineHeight: 1 }}>
                  ${Math.round(milestones.maxSingleDeal.amount).toLocaleString()}
                </div>
              </div>
            </div>

            {/* 6. Top Monthly Lead Generator */}
            <div className="apple-card" style={{
              position: 'relative', overflow: 'hidden', padding: '30px 24px',
              background: 'linear-gradient(135deg, rgba(244,63,94,0.06) 0%, rgba(18,18,20,0.95) 100%)',
              border: '1px solid rgba(244,63,94,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'between'
            }}>
              <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.06 }}>
                <Flame size={130} color="#f43f5e" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Flame size={18} color="#f43f5e" />
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f43f5e' }}>
                    Top Monthly Lead Generation
                  </span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                  {milestones.maxLeadsInMonth.userName}
                </div>
                <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Team: <strong style={{ color: '#fff' }}>{milestones.maxLeadsInMonth.teamName}</strong>
                </div>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Month Achieved</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginTop: '2px' }}>
                    {formatRevenueMonth(milestones.maxLeadsInMonth.month)}
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f43f5e', lineHeight: 1 }}>
                  {milestones.maxLeadsInMonth.count} Leads
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
