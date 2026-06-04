import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertCircle, 
  Calendar, 
  Award, 
  Activity, 
  TrendingDown,
  UserCheck
} from 'lucide-react'
import { getLastNMonths, normalizeMonth, getAvailableYears, MONTH_NAMES, formatRevenueMonth } from '../../utils/revenueUtils'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import {
  calculateMonthlyTrend,
  calculateExpectedVsActual,
  calculateTeamRadarScores,
  calculateParetoData,
  calculatePerformerStatus
} from '../../utils/analyticsUtils'

import RevenueTrendChart from '../../components/charts/RevenueTrendChart'
import ExpectedVsActualChart from '../../components/charts/ExpectedVsActualChart'
import ComplianceHeatmap from '../../components/charts/ComplianceHeatmap'
import TeamRadarChart from '../../components/charts/TeamRadarChart'
import ParetoChart from '../../components/charts/ParetoChart'
import Sparkline from '../../components/charts/Sparkline'

const TIME_FILTER_OPTIONS = [
  { label: 'Last 3 Months', value: 3 },
  { label: 'Last 6 Months', value: 6 },
  { label: 'Last 12 Months', value: 12 },
  { label: 'All Time', value: 0 }
]

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  const [disReports, setDisReports] = useState([])

  // Global Time Filter (default to Last 6 Months)
  const [periodFilter, setPeriodFilter] = useState(6)

  // Local Section Filters
  const [expectedVsActualTeamId, setExpectedVsActualTeamId] = useState('all')
  const [paretoTeamId, setParetoTeamId] = useState('all')
  const [performerTab, setPerformerTab] = useState('top') // 'top' | 'attention'
  const [seeding, setSeeding] = useState(false)

  // Granular analytics month filter
  const [analyticsYear, setAnalyticsYear] = useState(new Date().getFullYear())
  const [analyticsMonth, setAnalyticsMonth] = useState(new Date().getMonth())

  // Current Date String for calculations
  const currentDateStr = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  // Create memberships array from profiles.team_id for backward compatibility with utility functions
  const memberships = useMemo(() => {
    return profiles
      .filter(p => p.team_id)
      .map(p => ({
        user_id: p.id,
        team_id: p.team_id,
        team_role: p.platform_role === 'teamlead' ? 'lead' : 'member'
      }))
  }, [profiles])

  // Load All Required Data on Mount
  const loadAllData = async () => {
    setLoading(true)
    try {
      const [teamsRes, profilesRes, revRes, disRes] = await Promise.all([
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('monthly_revenues').select('*'),
        supabase.from('dis_reports').select('*').order('report_date', { ascending: false })
      ])

      if (teamsRes.data) setTeams(teamsRes.data)
      if (profilesRes.data) setProfiles(profilesRes.data)
      if (revRes.data) setRevenues(revRes.data)
      if (disRes.data) setDisReports(disRes.data)
    } catch (err) {
      console.error("Error loading analytics data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const handleSeedDemoData = async () => {
    setSeeding(true)
    try {
      const activeMembers = memberships.filter(m => {
        const p = profiles.find(prof => prof.id === m.user_id)
        return p && p.platform_role !== 'admin'
      })

      if (activeMembers.length === 0) {
        alert("No active team members found to seed data for. Please add users to teams first in the Teams tab.")
        setSeeding(false)
        return
      }

      const monthsToSeed = getLastNMonths(6)
      const mockRevenues = []
      const mockDIS = []

      // Generate revenues for the last 6 months
      activeMembers.forEach(mem => {
        const SOURCES = ['Instagram', 'Referral', 'Cold Call', 'Website', 'Other']
        monthsToSeed.forEach((month, idx) => {
          // Generate 1-4 weekly entries per month instead of a single entry
          const weeksToSeed = Math.floor(Math.random() * 3) + 2 // 2-4 weeks
          for (let w = 1; w <= weeksToSeed; w++) {
            const base = mem.user_id.charCodeAt(0) * 12 + 1000
            const amount = Math.round(base + (idx * 120) + Math.random() * 500)
            mockRevenues.push({
              user_id: mem.user_id,
              team_id: mem.team_id,
              revenue_month: month,
              week_number: w,
              client_name: `Client ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 100)}`,
              source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
              amount
            })
          }
        })

        // Generate DIS reports for the last 30 calendar days
        const today = new Date()
        for (let i = 0; i < 30; i++) {
          const d = new Date()
          d.setDate(today.getDate() - i)
          const dayOfWeek = d.getDay()
          
          if (Math.random() < 0.2) continue

          const dateStr = d.toISOString().split('T')[0]
          const expected = Math.round(300 + Math.random() * 500)
          const leads = Math.round(Math.random() * 4)

          mockDIS.push({
            user_id: mem.user_id,
            team_id: mem.team_id,
            report_date: dateStr,
            expected_revenue: expected,
            positive_leads: leads,
            revenue_generated: Math.round(expected * 0.9)
          })
        }
      })

      if (mockRevenues.length > 0) {
        const { error: revErr } = await supabase.from('monthly_revenues').insert(mockRevenues)
        if (revErr) throw revErr
      }

      if (mockDIS.length > 0) {
        const { error: disErr } = await supabase.from('dis_reports').upsert(mockDIS, { onConflict: 'user_id,report_date' })
        if (disErr) throw disErr
      }

      alert("Demo data successfully seeded!")
      await loadAllData()
    } catch (err) {
      console.error("Failed to seed data:", err)
      alert("Error seeding data: " + err.message)
    } finally {
      setSeeding(false)
    }
  }

  // Non-admin profiles only
  const nonAdminProfiles = useMemo(
    () => profiles.filter(p => p.platform_role !== 'admin'),
    [profiles]
  )
  const nonAdminIds = useMemo(
    () => new Set(nonAdminProfiles.map(p => p.id)),
    [nonAdminProfiles]
  )

  // Filtered revenues & DIS reports for calculations based on period
  const nonAdminRevenues = useMemo(
    () => revenues.filter(r => nonAdminIds.has(r.user_id)),
    [revenues, nonAdminIds]
  )

  // Chronological list of months YYYY-MM-01
  const activeMonths = useMemo(() => {
    let months = getLastNMonths(periodFilter || 12).reverse()
    if (periodFilter === 0) {
      // Find all unique months in data
      const unique = [...new Set(nonAdminRevenues.map(r => normalizeMonth(r.revenue_month)))].filter(Boolean).sort()
      months = unique.length > 0 ? unique : getLastNMonths(12).reverse()
    }
    return months
  }, [periodFilter, nonAdminRevenues])

  // Current month YYYY-MM-01 helper
  const currentMonthStr = useMemo(() => {
    const d = new Date()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}-${m}-01`
  }, [])

  // Last Month YYYY-MM-01 helper
  const lastMonthStr = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}-${m}-01`
  }, [])

  // Granular analytics helpers
  const analyticsMonthStr = useMemo(() => {
    const m = String(analyticsMonth + 1).padStart(2, '0')
    return `${analyticsYear}-${m}-01`
  }, [analyticsYear, analyticsMonth])
  
  const analyticsMonthRevenues = useMemo(() => {
    return nonAdminRevenues.filter(r => normalizeMonth(r.revenue_month) === analyticsMonthStr)
  }, [nonAdminRevenues, analyticsMonthStr])

  // Calculate Weekly Breakdown
  const weeklyData = useMemo(() => {
    const hasWeekly = analyticsMonthRevenues.some(r => r.week_number !== null)
    if (!hasWeekly) return []

    const weeks = [
      { name: 'Week 1', amount: 0 },
      { name: 'Week 2', amount: 0 },
      { name: 'Week 3', amount: 0 },
      { name: 'Week 4', amount: 0 }
    ]

    analyticsMonthRevenues.forEach(r => {
      if (r.week_number >= 1 && r.week_number <= 4) {
        weeks[r.week_number - 1].amount += Number(r.amount)
      }
    })
    return weeks
  }, [analyticsMonthRevenues])

  // Calculate Source Breakdown
  const sourceData = useMemo(() => {
    const sources = {}
    let hasSourceData = false
    analyticsMonthRevenues.forEach(r => {
      if (r.source) {
        hasSourceData = true
        const s = r.source === 'UNKNOWN' ? 'Unknown' : r.source
        sources[s] = (sources[s] || 0) + Number(r.amount)
      }
    })

    if (!hasSourceData) return []
    return Object.entries(sources).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
  }, [analyticsMonthRevenues])

  // ===== DATA COMPUTATIONS =====

  // 1. Revenue Trend Line Data
  const trendData = useMemo(() => {
    return calculateMonthlyTrend(nonAdminRevenues, teams, activeMonths)
  }, [nonAdminRevenues, teams, activeMonths])

  // 2. Expected vs Actual Data (Filtered locally by expectedVsActualTeamId)
  const expectedVsActualData = useMemo(() => {
    return calculateExpectedVsActual(disReports, nonAdminRevenues, activeMonths, expectedVsActualTeamId, memberships)
  }, [disReports, nonAdminRevenues, activeMonths, expectedVsActualTeamId, memberships])

  // 3. Team Radar Scores
  const radarData = useMemo(() => {
    return calculateTeamRadarScores(teams, nonAdminRevenues, disReports, memberships, profiles, activeMonths)
  }, [teams, nonAdminRevenues, disReports, memberships, profiles, activeMonths])

  // 4. Pareto Data
  const paretoDataObj = useMemo(() => {
    return calculateParetoData(nonAdminRevenues, profiles, paretoTeamId, memberships, activeMonths)
  }, [nonAdminRevenues, profiles, paretoTeamId, memberships, activeMonths])

  // 5. Performer Status Data
  const performerData = useMemo(() => {
    return calculatePerformerStatus(nonAdminRevenues, profiles, disReports, memberships, teams, activeMonths, currentDateStr)
  }, [nonAdminRevenues, profiles, disReports, memberships, teams, activeMonths, currentDateStr])

  // Split Performers
  const topPerformers = useMemo(() => {
    return performerData
      .filter(p => !p.needsAttention && p.m1Revenue > 0)
      .sort((a, b) => b.m1Revenue - a.m1Revenue)
  }, [performerData])

  const needsAttentionPerformers = useMemo(() => {
    return performerData
      .filter(p => p.needsAttention)
      .sort((a, b) => a.m1Revenue - b.m1Revenue)
  }, [performerData])

  // Global KPI Summary Cards
  const kpis = useMemo(() => {
    // Current month revenue
    const currentMonthRev = nonAdminRevenues
      .filter(r => normalizeMonth(r.revenue_month) === currentMonthStr)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)

    // Last month revenue
    const lastMonthRev = nonAdminRevenues
      .filter(r => normalizeMonth(r.revenue_month) === lastMonthStr)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)

    const revChange = lastMonthRev > 0 ? ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0

    // Average forecast accuracy across activeMonths
    const totalExpected = expectedVsActualData.reduce((sum, item) => sum + item.Expected, 0)
    const totalActual = expectedVsActualData.reduce((sum, item) => sum + item.Actual, 0)
    const overallAccuracy = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 100

    // Overall DIS Compliance (weekdays in activeMonths)
    // Find compliance rates for each team and average them
    const activeTeamComps = radarData.rawTeams.filter(t => t.membersCount > 0)
    const avgDISCompliance = activeTeamComps.length > 0
      ? Math.round(activeTeamComps.reduce((sum, t) => sum + t.compliance, 0) / activeTeamComps.length)
      : 100

    // Active Users count
    const totalActiveUsers = nonAdminProfiles.filter(p => 
      memberships.some(m => m.user_id === p.id)
    ).length

    return {
      currentMonthRev,
      revChange,
      overallAccuracy,
      avgDISCompliance,
      totalActiveUsers
    }
  }, [nonAdminRevenues, currentMonthStr, lastMonthStr, expectedVsActualData, radarData, nonAdminProfiles, memberships])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <span>Loading analytics dashboard...</span>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin { to { transform: rotate(360deg); } }
        `}} />
      </div>
    )
  }

  const isDatabaseEmpty = revenues.length === 0 && disReports.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="admin-page-header" style={{ marginBottom: 0 }}>
          <div className="admin-page-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <TrendingUp size={28} />
          </div>
          <div>
            <h1 className="admin-page-title">Executive Analytics</h1>
            <p className="admin-page-subtitle">Interactive performance indexes, revenues, compliance, and distribution risk.</p>
          </div>
        </div>

        {/* Global Time Filter Controls */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '3px' }}>
          {TIME_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriodFilter(opt.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                background: periodFilter === opt.value ? '#3b82f6' : 'transparent',
                color: periodFilter === opt.value ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── EMPTY DATA BANNER ── */}
      {isDatabaseEmpty && (
        <div style={{
          background: 'rgba(251, 191, 36, 0.08)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <AlertCircle size={24} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#f1f5f9', fontWeight: '600' }}>No Performance Metrics Found</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                The <strong>monthly_revenues</strong> and <strong>dis_reports</strong> tables are empty. To preview the executive dashboard immediately, seed realistic demo data for the current active team members.
              </p>
            </div>
          </div>
          <button 
            onClick={handleSeedDemoData} 
            disabled={seeding}
            className="btn"
            style={{ 
              background: '#fbbf24', 
              color: '#0b0f18', 
              fontSize: '0.85rem', 
              padding: '8px 18px',
              fontWeight: '700',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {seeding ? 'Seeding...' : 'Seed Demo Data'}
          </button>
        </div>
      )}

      {/* ── KPI HIGHLIGHTS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        
        {/* KPI 1: Monthly Revenue */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '12px', borderRadius: '10px' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue (This Month)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              ${kpis.currentMonthRev.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: kpis.revChange >= 0 ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              {kpis.revChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {kpis.revChange >= 0 ? '+' : ''}{kpis.revChange.toFixed(1)}% vs last month
            </div>
          </div>
        </div>

        {/* KPI 2: Forecast Accuracy */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', padding: '12px', borderRadius: '10px' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forecast Accuracy</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              {kpis.overallAccuracy}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              DIS forecast vs actual ratio
            </div>
          </div>
        </div>

        {/* KPI 3: DIS Compliance */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', padding: '12px', borderRadius: '10px' }}>
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg DIS Compliance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              {kpis.avgDISCompliance}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Daily report completion rate
            </div>
          </div>
        </div>

        {/* KPI 4: Active Users */}
        <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', padding: '12px', borderRadius: '10px' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Team Members</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
              {kpis.totalActiveUsers}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Excluding platform administrators
            </div>
          </div>
        </div>

      </div>

      {/* ── ROW 1: REVENUE TREND LINE (Section 1) ── */}
      <div style={{ width: '100%' }}>
        <RevenueTrendChart data={trendData} teams={teams} />
      </div>

      {/* ── ROW 2: EXPECTED VS ACTUAL (Section 2) & TEAM RADAR (Section 4) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        
        {/* Expected vs Actual Revenue Card */}
        <div>
          <ExpectedVsActualChart
            data={expectedVsActualData}
            teams={teams}
            selectedTeamId={expectedVsActualTeamId}
            onTeamChange={setExpectedVsActualTeamId}
          />
        </div>

        {/* Team comparison radar */}
        <div>
          <TeamRadarChart data={radarData.radarData} rawTeams={radarData.rawTeams} />
        </div>

      </div>

      {/* ── ROW 3: DIS COMPLIANCE HEATMAP & STREAKS (Section 3) ── */}
      <div style={{ width: '100%' }}>
        <ComplianceHeatmap 
          disReports={disReports} 
          profiles={profiles} 
          memberships={memberships} 
          teams={teams}
          currentDateStr={currentDateStr}
        />
      </div>

      {/* ── ROW 4: PARETO CHART (Section 5) & RANKINGS TABLE (Section 6) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        
        {/* Pareto Chart Card */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: '24px', right: '110px', zIndex: 10 }}>
            {/* Pareto Team Filter */}
            <select
              value={paretoTeamId}
              onChange={(e) => setParetoTeamId(e.target.value)}
              className="form-control"
              style={{ padding: '4px 10px', fontSize: '0.75rem', width: 'auto', borderRadius: '14px', height: '28px', background: 'rgba(15,23,42,0.8)' }}
            >
              <option value="all">All Teams</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <ParetoChart data={paretoDataObj.paretoData} concentrationStats={paretoDataObj.concentrationStats} />
        </div>

        {/* Section 6 - Ranked table of performers */}
        <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#f1f5f9' }}>Performer Rankings & Trends</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Track performance indicators, streaks, and sparkline trends.
              </p>
            </div>

            {/* Top / Needs Attention toggles */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2px' }}>
              <button
                onClick={() => setPerformerTab('top')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '14px',
                  border: 'none',
                  background: performerTab === 'top' ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                  color: performerTab === 'top' ? '#34d399' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Top Performers
              </button>
              <button
                onClick={() => setPerformerTab('attention')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '14px',
                  border: 'none',
                  background: performerTab === 'attention' ? 'rgba(248, 113, 113, 0.15)' : 'transparent',
                  color: performerTab === 'attention' ? '#f87171' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Needs Attention ({needsAttentionPerformers.length})
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 8px', width: '40px' }}>Rank</th>
                  <th style={{ padding: '10px 8px' }}>Name</th>
                  <th style={{ padding: '10px 8px' }}>Team</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Revenue</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Trend (6M)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>DIS Streak</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {performerTab === 'top' ? (
                  topPerformers.slice(0, 10).map((usr, idx) => (
                    <tr key={usr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#f1f5f9' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 'bold', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#cd7f32' : 'var(--text-secondary)' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: '500' }}>{usr.name}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{usr.teams}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#34d399' }}>
                        ${Math.round(usr.m1Revenue).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <Sparkline data={usr.sparkline} />
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: usr.streak > 0 ? '#60a5fa' : 'var(--text-secondary)' }}>
                        🔥 {usr.streak}d
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: '700', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          background: usr.status === 'Rising' ? 'rgba(52,211,153,0.12)' : usr.status === 'Declining' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.05)',
                          color: usr.status === 'Rising' ? '#34d399' : usr.status === 'Declining' ? '#f87171' : 'var(--text-secondary)'
                        }}>
                          {usr.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  needsAttentionPerformers.map((usr, idx) => (
                    <tr key={usr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#f1f5f9' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#f87171' }}>
                        ⚠️
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: '500' }}>{usr.name}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{usr.teams}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '500', color: '#cbd5e1' }}>
                        ${Math.round(usr.m1Revenue).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <Sparkline data={usr.sparkline} />
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: '#ef4444' }}>
                        {usr.complianceRate}% comp.
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: '700', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          background: 'rgba(248,113,113,0.15)',
                          color: '#f87171'
                        }}>
                          Needs Coach
                        </span>
                      </td>
                    </tr>
                  ))
                )}
                {performerTab === 'top' && topPerformers.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      No active performers recorded in this range.
                    </td>
                  </tr>
                )}
                {performerTab === 'attention' && needsAttentionPerformers.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#34d399', fontWeight: '600' }}>
                      🎉 Zero members flagged for coaching. Clean compliance!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        </div>
      {/* ── ROW 5: WEEKLY & SOURCE ANALYTICS (Section 7) ── */}
      <div className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#f1f5f9' }}>Granular Analytics</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Weekly breakdown and source distribution across all active teams.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={analyticsMonth}
              onChange={e => setAnalyticsMonth(Number(e.target.value))}
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                borderRadius: '8px',
                background: 'rgba(15,23,42,0.8)',
                color: '#fff',
                border: '1px solid var(--border-color)'
              }}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            <select
              value={analyticsYear}
              onChange={e => setAnalyticsYear(Number(e.target.value))}
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                borderRadius: '8px',
                background: 'rgba(15,23,42,0.8)',
                color: '#fff',
                border: '1px solid var(--border-color)'
              }}
            >
              {getAvailableYears().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Weekly Analytics */}
          <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#fff' }}>Weekly Breakdown</h4>
            {weeklyData.length > 0 ? (
              <div style={{ height: 250, width: '100%' }}>
                <ResponsiveContainer>
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} formatter={(val) => `$${Number(val).toFixed(2)}`} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                Weekly data not available for this period.
              </div>
            )}
          </div>

          {/* Source Breakdown */}
          <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#fff' }}>Source Breakdown</h4>
            {sourceData.length > 0 ? (
              <div style={{ height: 250, width: '100%' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => {
                        const colors = ['#30d5c8', '#3b82f6', '#fbbf24', '#f87171', '#a855f7', '#64748b']
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      })}
                    </Pie>
                    <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} formatter={(val) => `$${Number(val).toFixed(2)}`} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                Source data not available for this period.
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  )
}
