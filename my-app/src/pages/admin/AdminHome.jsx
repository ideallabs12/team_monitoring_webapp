import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  TrendingUp,
  FileText,
  BarChart2,
  ArrowRight,
  Target
} from 'lucide-react'

let adminHomeCache = { loaded: false, teams: [], profiles: [], revenues: [], disReports: [] }

export default function AdminHome() {
  const [loading, setLoading] = useState(!adminHomeCache.loaded)
  const [teams, setTeams] = useState(adminHomeCache.teams)
  const [profiles, setProfiles] = useState(adminHomeCache.profiles)
  const [revenues, setRevenues] = useState(adminHomeCache.revenues)
  const [disReports, setDisReports] = useState(adminHomeCache.disReports)
  const navigate = useNavigate()

  useEffect(() => {
    async function loadData() {
      try {
        const today = new Date().toISOString().split('T')[0]
        const [teamsRes, profilesRes, revRes, disRes] = await Promise.all([
          supabase.from('teams').select('*').order('name', { ascending: true }),
          supabase.from('profiles').select('*'),
          supabase.from('monthly_revenues').select('*'),
          supabase.from('dis_reports').select('user_id').eq('report_date', today)
        ])
        const t = teamsRes.data || []
        const p = profilesRes.data || []
        const r = revRes.data || []
        const d = disRes.data || []
        setTeams(t); setProfiles(p); setRevenues(r); setDisReports(d)
        adminHomeCache = { loaded: true, teams: t, profiles: p, revenues: r, disReports: d }
      } catch (err) {
        console.error('Error loading admin home data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const nonAdminProfiles = useMemo(
    () => profiles.filter(p => p.platform_role !== 'admin' && !p.is_deactivated),
    [profiles]
  )

  const submittedTodayCount = useMemo(() => {
    const submittedIds = new Set(disReports.map(r => r.user_id))
    return nonAdminProfiles.filter(p => submittedIds.has(p.id)).length
  }, [disReports, nonAdminProfiles])

  const totalMembers = nonAdminProfiles.length
  const missedTodayCount = totalMembers - submittedTodayCount
  const compliancePercent = totalMembers > 0 ? Math.round((submittedTodayCount / totalMembers) * 100) : 0

  const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
  const mtdRevenue = useMemo(() => {
    return revenues
      .filter(r => r.revenue_month === currentMonth)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  }, [revenues, currentMonth])

  if (loading) return <div style={{ color: 'var(--text-secondary)', padding: '40px', textAlign: 'center' }}>Loading dashboard...</div>

  return (
    <div>
      {/* ===== PAGE HEADER ===== */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#fff' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.95rem' }}>
          Overview of today's activity and platform-wide metrics.
        </p>
      </div>

      {/* ===== QUICK STATS GRID ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '36px' }}>

        {/* Total Members */}
        <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: '22px 24px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#4F46E5' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
              Total Members
            </div>
            <Users size={16} style={{ color: '#4F46E5' }} />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#fff' }}>{totalMembers}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{teams.length} teams</div>
        </div>

        {/* DIS Submitted Today */}
        <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: '22px 24px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#10b981' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
              DIS Submitted Today
            </div>
            <FileText size={16} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#10b981' }}>{submittedTodayCount}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <span style={{ color: compliancePercent >= 80 ? '#10b981' : compliancePercent >= 50 ? '#fbbf24' : '#f87171', fontWeight: '600' }}>
              {compliancePercent}% compliance
            </span>
          </div>
        </div>

        {/* Missed DIS Today */}
        <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: '22px 24px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: missedTodayCount > 0 ? '#ef4444' : '#10b981' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
              Missed DIS Today
            </div>
            <BarChart2 size={16} style={{ color: missedTodayCount > 0 ? '#ef4444' : '#10b981' }} />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: missedTodayCount > 0 ? '#f87171' : '#10b981' }}>
            {missedTodayCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {missedTodayCount === 0 ? '🎉 100% compliance!' : `out of ${totalMembers} members`}
          </div>
        </div>

        {/* MTD Revenue */}
        <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: '22px 24px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#fbbf24' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
              MTD Revenue
            </div>
            <TrendingUp size={16} style={{ color: '#fbbf24' }} />
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#fbbf24' }}>
            ${mtdRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Month-to-date (all teams)
          </div>
        </div>

      </div>

      {/* ===== DIS COMPLIANCE PROGRESS ===== */}
      <div className="card" style={{ marginBottom: '28px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '600', color: '#fff' }}>Today's DIS Compliance</h3>
          <span style={{
            fontSize: '0.8rem', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
            background: compliancePercent >= 80 ? 'rgba(16,185,129,0.12)' : compliancePercent >= 50 ? 'rgba(251,191,36,0.12)' : 'rgba(239,68,68,0.12)',
            color: compliancePercent >= 80 ? '#10b981' : compliancePercent >= 50 ? '#fbbf24' : '#f87171',
            border: `1px solid ${compliancePercent >= 80 ? 'rgba(16,185,129,0.3)' : compliancePercent >= 50 ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)'}`
          }}>
            {compliancePercent}%
          </span>
        </div>

        <div style={{ height: '10px', background: 'rgba(255,255,255,0.07)', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{
            height: '100%',
            width: `${compliancePercent}%`,
            borderRadius: '5px',
            background: compliancePercent >= 80
              ? 'linear-gradient(to right, #10b981, #34d399)'
              : compliancePercent >= 50
                ? 'linear-gradient(to right, #f59e0b, #fbbf24)'
                : 'linear-gradient(to right, #ef4444, #f87171)',
            transition: 'width 0.4s ease-out'
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <span><span style={{ color: '#10b981', fontWeight: '600' }}>{submittedTodayCount}</span> submitted</span>
          <span><span style={{ color: '#f87171', fontWeight: '600' }}>{missedTodayCount}</span> pending</span>
          <span>{totalMembers} total members</span>
        </div>
      </div>

      {/* ===== QUICK LINKS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {[
          {
            label: 'View DIS Reports',
            description: 'Audit daily submissions, check who submitted and who missed.',
            icon: FileText,
            color: '#4F46E5',
            path: '/admin/dis'
          },
          {
            label: 'Revenue & Targets',
            description: 'View team member targets, expected vs actual revenue comparisons.',
            icon: Target,
            color: '#10b981',
            path: '/admin/revenue'
          },
          {
            label: 'Analytics',
            description: 'Executive KPIs, performance trends, and growth charts.',
            icon: TrendingUp,
            color: '#fbbf24',
            path: '/admin/analytics'
          },
          {
            label: 'Manage Teams',
            description: 'View team rosters, member profiles, and team composition.',
            icon: Users,
            color: '#3b82f6',
            path: '/admin/teams'
          },
        ].map(item => (
          <div
            key={item.path}
            className="card"
            onClick={() => navigate(item.path)}
            style={{
              cursor: 'pointer',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              transition: 'all 0.2s ease',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.borderColor = `${item.color}40`
              e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: `${item.color}18`, border: `1px solid ${item.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <item.icon size={18} style={{ color: item.color }} />
              </div>
              <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.95rem', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
