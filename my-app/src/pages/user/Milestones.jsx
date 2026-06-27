import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Award, Users, TrendingUp, Crown, DollarSign, Flame, Star, Trophy } from 'lucide-react'
import { formatRevenueMonth } from '../../utils/revenueUtils'
import { calculateMilestones } from '../../utils/milestoneUtils'

function FlipCard({ cardId, flippedCards, toggleFlip, explanation, children, style = {} }) {
  const isFlipped = flippedCards[cardId] || false;
  return (
    <div
      style={{ perspective: '1000px', cursor: 'pointer', ...style }}
      onClick={() => toggleFlip(cardId)}
    >
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d', transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
      }}>
        {/* Front */}
        <div style={{ backfaceVisibility: 'hidden', height: '100%' }}>
          {children}
        </div>
        {/* Back */}
        <div className="apple-card" style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
          background: 'rgba(18,18,20,0.98)', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', flexDirection: 'column', padding: '32px 28px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>ℹ️</span> How it's calculated
          </h3>
          <p style={{ color: 'var(--apple-text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
            {explanation}
          </p>
          <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontWeight: '500' }}>
            Tap to flip back
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Milestones({ user }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  const [disReports, setDisReports] = useState([])
  const [topCount, setTopCount] = useState(6)
  const [flippedCards, setFlippedCards] = useState({})

  const toggleFlip = (cardId) => {
    setFlippedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }))
  }

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
          
          {/* Top Performers Row */}
          {milestones.topMembersAllTime && milestones.topMembersAllTime.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '600', color: '#fff', margin: '0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Crown size={24} color="#fbbf24" />
                  All-Time Highest Revenue by Individual
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>Show:</label>
                  <select 
                    value={topCount}
                    onChange={(e) => setTopCount(Number(e.target.value))}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={1} style={{ background: '#121214' }}>Top 1</option>
                    <option value={3} style={{ background: '#121214' }}>Top 3</option>
                    <option value={5} style={{ background: '#121214' }}>Top 5</option>
                    <option value={6} style={{ background: '#121214' }}>Top 6</option>
                    <option value={10} style={{ background: '#121214' }}>Top 10</option>
                  </select>
                </div>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px'
              }}>
                {milestones.topMembersAllTime.slice(0, topCount).map((member, idx) => {
                  const colors = [
                    { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)', icon: Crown }, // Gold
                    { text: '#cbd5e1', bg: 'rgba(203,213,225,0.08)', border: 'rgba(203,213,225,0.18)', icon: Award }, // Silver
                    { text: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.18)', icon: Star },  // Bronze
                    { text: '#60a5fa', bg: 'rgba(96,165,250,0.06)', border: 'rgba(96,165,250,0.15)', icon: Users }  // Blue for others
                  ];
                  const style = colors[idx] || colors[3];
                  const Icon = style.icon;
                  const rank = idx + 1;

                  return (
                    <FlipCard
                      key={member.userId || idx}
                      cardId={`alltime_${idx}`}
                      flippedCards={flippedCards}
                      toggleFlip={toggleFlip}
                      explanation="The cumulative sum of all revenue recorded for this individual across all time."
                    >
                      <div className="apple-card" style={{
                        position: 'relative', overflow: 'hidden', padding: '28px 24px',
                        background: `linear-gradient(135deg, ${style.bg} 0%, rgba(18,18,20,0.95) 100%)`,
                        border: `1px solid ${style.border}`, boxShadow: `0 8px 32px rgba(0,0,0,0.2)`,
                        display: 'flex', flexDirection: 'column', justifyContent: 'between', height: '100%'
                      }}>
                        <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.08, transform: 'rotate(10deg)' }}>
                          <Icon size={120} color={style.text} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Icon size={20} color={style.text} />
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: style.text }}>
                              Rank #{rank} All-Time
                            </span>
                          </div>
                          <div style={{ fontSize: '1.7rem', fontWeight: '700', color: '#fff', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                            {member.userName}
                          </div>
                          <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
                            Team: <strong style={{ color: '#fff' }}>{member.teamName}</strong>
                          </div>
                        </div>
                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Total Revenue</div>
                          </div>
                          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#34d399', letterSpacing: '-0.03em', lineHeight: 1 }}>
                            ${Math.round(member.amount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </FlipCard>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Core Milestones Grid */}
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '600', color: '#fff', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Flame size={24} color="#f43f5e" />
              Single Month Records
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px' }}>
            {/* 1. Highest Revenue Member in a Month */}
            <FlipCard
              cardId="single_member"
              flippedCards={flippedCards}
              toggleFlip={toggleFlip}
              explanation="The maximum revenue generated by a single individual in any one given month."
            >
              <div className="apple-card" style={{
                position: 'relative', overflow: 'hidden', padding: '32px 28px',
                background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(18,18,20,0.95) 100%)',
                border: '1px solid rgba(251,191,36,0.18)', boxShadow: '0 8px 32px rgba(251,191,36,0.03)',
                display: 'flex', flexDirection: 'column', justifyContent: 'between', height: '100%'
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
            </FlipCard>

            {/* 2. Highest Revenue Team in a Month */}
            <FlipCard
              cardId="single_team"
              flippedCards={flippedCards}
              toggleFlip={toggleFlip}
              explanation="The maximum combined revenue generated by an entire team in any one given month."
            >
              <div className="apple-card" style={{
                position: 'relative', overflow: 'hidden', padding: '32px 28px',
                background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(18,18,20,0.95) 100%)',
                border: '1px solid rgba(6,182,212,0.18)', boxShadow: '0 8px 32px rgba(6,182,212,0.03)',
                display: 'flex', flexDirection: 'column', justifyContent: 'between', height: '100%'
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
            </FlipCard>

            {/* 3. Company-Wide Highest Revenue Month */}
            <FlipCard
              cardId="single_company"
              flippedCards={flippedCards}
              toggleFlip={toggleFlip}
              explanation="The total sum of all revenue recorded across the entire company for the single most successful month."
            >
              <div className="apple-card" style={{
                position: 'relative', overflow: 'hidden', padding: '32px 28px',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(18,18,20,0.95) 100%)',
                border: '1px solid rgba(168,85,247,0.18)', boxShadow: '0 8px 32px rgba(168,85,247,0.03)',
                display: 'flex', flexDirection: 'column', justifyContent: 'between', height: '100%'
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
            </FlipCard>

            {/* 4. All-Time Highest Revenue Team Lead in One Month */}
            <FlipCard
              cardId="single_lead"
              flippedCards={flippedCards}
              toggleFlip={toggleFlip}
              explanation="The highest revenue achieved in a single month by any individual holding the Team Lead role."
            >
              <div className="apple-card" style={{
                position: 'relative', overflow: 'hidden', padding: '32px 28px',
                background: 'linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(18,18,20,0.95) 100%)',
                border: '1px solid rgba(79,70,229,0.18)', boxShadow: '0 8px 32px rgba(79,70,229,0.03)',
                display: 'flex', flexDirection: 'column', justifyContent: 'between', height: '100%'
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
            </FlipCard>
            </div>
          </div>

          {/* Secondary Suggestions Grid */}
          <h2 style={{ fontSize: '1.4rem', fontWeight: '600', color: '#fff', margin: '20px 0 0 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Star size={24} color="#a855f7" />
            Special Achievements
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px' }}>
            {/* 6. Top Monthly Lead Generator */}
            <FlipCard
              cardId="top_leads"
              flippedCards={flippedCards}
              toggleFlip={toggleFlip}
              explanation="The highest number of positive leads reported by an individual in a single month via DIS Reports."
            >
              <div className="apple-card" style={{
                position: 'relative', overflow: 'hidden', padding: '30px 24px',
                background: 'linear-gradient(135deg, rgba(244,63,94,0.06) 0%, rgba(18,18,20,0.95) 100%)',
                border: '1px solid rgba(244,63,94,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'between', height: '100%'
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
            </FlipCard>

            {/* 7. All-Time Highest Revenue by Team */}
            <FlipCard
              cardId="alltime_team"
              flippedCards={flippedCards}
              toggleFlip={toggleFlip}
              explanation="The cumulative sum of all revenue generated by a team across all months."
            >
              <div className="apple-card" style={{
                position: 'relative', overflow: 'hidden', padding: '30px 24px',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(18,18,20,0.95) 100%)',
                border: '1px solid rgba(59,130,246,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'between', height: '100%'
              }}>
                <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.06 }}>
                  <Users size={130} color="#3b82f6" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Users size={18} color="#3b82f6" />
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3b82f6' }}>
                      All-Time Highest Team Revenue
                    </span>
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                    {milestones.maxTeamAllTime.teamName}
                  </div>
                  <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Team Lifetime Output
                  </div>
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Period</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginTop: '2px' }}>
                      All-Time
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: '#60a5fa', lineHeight: 1 }}>
                    ${Math.round(milestones.maxTeamAllTime.amount).toLocaleString()}
                  </div>
                </div>
              </div>
            </FlipCard>

            {/* 8. The Consecutive Months Streak */}
            <FlipCard
              cardId="streak"
              flippedCards={flippedCards}
              toggleFlip={toggleFlip}
              explanation="The longest uninterrupted sequence of consecutive months where the individual logged revenue greater than zero."
            >
              <div className="apple-card" style={{
                position: 'relative', overflow: 'hidden', padding: '30px 24px',
                background: 'linear-gradient(135deg, rgba(234,88,12,0.06) 0%, rgba(18,18,20,0.95) 100%)',
                border: '1px solid rgba(234,88,12,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'between', height: '100%'
              }}>
                <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.06 }}>
                  <Flame size={130} color="#ea580c" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Flame size={18} color="#ea580c" />
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ea580c' }}>
                      Longest Revenue Streak
                    </span>
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
                    {milestones.longestStreak.userName}
                  </div>
                  <div style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Team: <strong style={{ color: '#fff' }}>{milestones.longestStreak.teamName}</strong>
                  </div>
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase' }}>Metric</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginTop: '2px' }}>
                      Consecutive Months
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fb923c', lineHeight: 1 }}>
                    {milestones.longestStreak.streak} Months
                  </div>
                </div>
              </div>
            </FlipCard>
          </div>
        </div>
      )}
    </div>
  )
}
