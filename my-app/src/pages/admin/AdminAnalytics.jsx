import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import {
  TrendingUp,
  DollarSign,
  AlertCircle,
  TrendingDown,
  UserCheck
} from 'lucide-react'
import { getLastNMonths, normalizeMonth, getAvailableYears, MONTH_NAMES } from '../../utils/revenueUtils'
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import {
  calculateTeamRadarScores,
  calculatePerformerStatus
} from '../../utils/analyticsUtils'

import RevenueTrendChart from '../../components/charts/RevenueTrendChart'
import TargetVsActualChart from '../../components/charts/TargetVsActualChart'
import ComplianceHeatmap from '../../components/charts/ComplianceHeatmap'
import TeamRadarChart from '../../components/charts/TeamRadarChart'
import Sparkline from '../../components/charts/Sparkline'

let adminAnalyticsCache = {
  loaded: false,
  teams: [],
  profiles: [],
  revenues: [],
  disReports: [],
  targets: [],
  holidays: [],
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(!adminAnalyticsCache.loaded)
  const [teams, setTeams] = useState(adminAnalyticsCache.teams)
  const [profiles, setProfiles] = useState(adminAnalyticsCache.profiles)
  const [revenues, setRevenues] = useState(adminAnalyticsCache.revenues)
  const [disReports, setDisReports] = useState(adminAnalyticsCache.disReports)
  const [targets, setTargets] = useState(adminAnalyticsCache.targets)
  const [holidays, setHolidays] = useState(adminAnalyticsCache.holidays)

  // Performer tab toggle
  const [performerTab, setPerformerTab] = useState('top')
  const [seeding, setSeeding] = useState(false)

  // Granular analytics month filter (bottom section)
  const [analyticsYear, setAnalyticsYear] = useState(new Date().getFullYear())
  const [analyticsMonth, setAnalyticsMonth] = useState(new Date().getMonth())
  const [analyticsTeamId, setAnalyticsTeamId] = useState('all')
  const [analyticsIsAllTime, setAnalyticsIsAllTime] = useState(false)

  const currentDateStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  // Memberships derived from profiles (team_id field)
  const memberships = useMemo(() => {
    return profiles
      .filter(p => p.team_id)
      .map(p => ({
        user_id: p.id,
        team_id: p.team_id,
        team_role: p.platform_role === 'teamlead' ? 'lead' : 'member'
      }))
  }, [profiles])

  // ── LOAD DATA ──────────────────────────────────────────────────
  const loadAllData = async () => {
    try {
      const [teamsRes, profilesRes, revRes, disRes, targetsRes, holidaysRes] = await Promise.all([
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('monthly_revenues').select('*'),
        supabase.from('dis_reports').select('*').order('report_date', { ascending: false }),
        supabase.from('monthly_targets').select('*'),
        supabase.from('holidays').select('*'),
      ])

      if (teamsRes.data) setTeams(teamsRes.data)
      if (profilesRes.data) setProfiles(profilesRes.data)
      if (revRes.data) setRevenues(revRes.data)
      if (disRes.data) setDisReports(disRes.data)
      if (targetsRes.data) setTargets(targetsRes.data)
      const fetchedHolidays = holidaysRes?.data || []
      setHolidays(fetchedHolidays)

      adminAnalyticsCache = {
        loaded: true,
        teams: teamsRes.data || [],
        profiles: profilesRes.data || [],
        revenues: revRes.data || [],
        disReports: disRes.data || [],
        targets: targetsRes.data || [],
        holidays: fetchedHolidays,
      }
    } catch (err) {
      console.error('Error loading analytics data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAllData() }, [])

  // ── SEED DEMO DATA ─────────────────────────────────────────────
  const handleSeedDemoData = async () => {
    setSeeding(true)
    try {
      const activeMembers = memberships.filter(m => {
        const p = profiles.find(prof => prof.id === m.user_id)
        return p && p.platform_role !== 'admin'
      })

      if (activeMembers.length === 0) {
        alert('No active team members found to seed data for. Please add users to teams first in the Teams tab.')
        setSeeding(false)
        return
      }

      const monthsToSeed = getLastNMonths(6)
      const mockRevenues = []
      const mockDIS = []

      activeMembers.forEach(mem => {
        const SOURCES = ['Instagram', 'Referral', 'Cold Call', 'Website', 'Other']
        monthsToSeed.forEach((month, idx) => {
          const weeksToSeed = Math.floor(Math.random() * 3) + 2
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
              amount,
            })
          }
        })

        const today = new Date()
        for (let i = 0; i < 30; i++) {
          const d = new Date()
          d.setDate(today.getDate() - i)
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
            revenue_generated: Math.round(expected * 0.9),
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

      alert('Demo data successfully seeded!')
      await loadAllData()
    } catch (err) {
      console.error('Failed to seed data:', err)
      alert('Error seeding data: ' + err.message)
    } finally {
      setSeeding(false)
    }
  }

  // ── BASE DERIVED DATA ───────────────────────────────────────────
  const nonAdminProfiles = useMemo(
    () => profiles.filter(p => p.platform_role !== 'admin'),
    [profiles]
  )
  const nonAdminIds = useMemo(
    () => new Set(nonAdminProfiles.map(p => p.id)),
    [nonAdminProfiles]
  )
  const nonAdminRevenues = useMemo(
    () => revenues.filter(r => nonAdminIds.has(r.user_id)),
    [revenues, nonAdminIds]
  )

  // Default 6-month window for Radar + Performer Rankings
  const defaultActiveMonths = useMemo(() => getLastNMonths(6).reverse(), [])

  // ── TEAM RADAR ─────────────────────────────────────────────────
  const radarData = useMemo(() =>
    calculateTeamRadarScores(teams, nonAdminRevenues, disReports, memberships, profiles, defaultActiveMonths, holidays),
    [teams, nonAdminRevenues, disReports, memberships, profiles, defaultActiveMonths, holidays]
  )

  // ── PERFORMER RANKINGS ─────────────────────────────────────────
  const performerData = useMemo(() =>
    calculatePerformerStatus(nonAdminRevenues, profiles, disReports, memberships, teams, defaultActiveMonths, currentDateStr, holidays),
    [nonAdminRevenues, profiles, disReports, memberships, teams, defaultActiveMonths, currentDateStr, holidays]
  )

  const topPerformers = useMemo(() =>
    performerData.filter(p => !p.needsAttention && p.m1Revenue > 0).sort((a, b) => b.m1Revenue - a.m1Revenue),
    [performerData]
  )
  const needsAttentionPerformers = useMemo(() =>
    performerData.filter(p => p.needsAttention).sort((a, b) => a.m1Revenue - b.m1Revenue),
    [performerData]
  )

  // ── KPI SUMMARY ────────────────────────────────────────────────
  const currentMonthStr = useMemo(() => {
    const d = new Date()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}-${m}-01`
  }, [])
  const lastMonthStr = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${d.getFullYear()}-${m}-01`
  }, [])

  const kpis = useMemo(() => {
    const currentMonthRev = nonAdminRevenues
      .filter(r => normalizeMonth(r.revenue_month) === currentMonthStr)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const lastMonthRev = nonAdminRevenues
      .filter(r => normalizeMonth(r.revenue_month) === lastMonthStr)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const revChange = lastMonthRev > 0 ? ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0
    const totalActiveUsers = nonAdminProfiles.filter(p =>
      memberships.some(m => m.user_id === p.id)
    ).length
    return { currentMonthRev, revChange, totalActiveUsers }
  }, [nonAdminRevenues, currentMonthStr, lastMonthStr, nonAdminProfiles, memberships])

  // ── GRANULAR ANALYTICS (bottom section) ───────────────────────
  const analyticsMonthStr = useMemo(() => {
    const m = String(analyticsMonth + 1).padStart(2, '0')
    return `${analyticsYear}-${m}-01`
  }, [analyticsYear, analyticsMonth])

  const analyticsFilteredRevenues = useMemo(() => {
    let revs = nonAdminRevenues
    if (analyticsTeamId !== 'all') revs = revs.filter(r => r.team_id === analyticsTeamId)
    if (!analyticsIsAllTime) revs = revs.filter(r => normalizeMonth(r.revenue_month) === analyticsMonthStr)
    return revs
  }, [nonAdminRevenues, analyticsTeamId, analyticsIsAllTime, analyticsMonthStr])

  const weeklyData = useMemo(() => {
    const hasWeekly = analyticsFilteredRevenues.some(r => r.week_number !== null)
    if (!hasWeekly) return []
    const weeks = [
      { name: 'Week 1', amount: 0 },
      { name: 'Week 2', amount: 0 },
      { name: 'Week 3', amount: 0 },
      { name: 'Week 4', amount: 0 },
    ]
    analyticsFilteredRevenues.forEach(r => {
      if (r.week_number >= 1 && r.week_number <= 4) {
        weeks[r.week_number - 1].amount += Number(r.amount)
      }
    })
    return weeks
  }, [analyticsFilteredRevenues])

  const sourceData = useMemo(() => {
    const sources = {}
    let hasSourceData = false
    analyticsFilteredRevenues.forEach(r => {
      if (r.source) {
        hasSourceData = true
        const s = r.source === 'UNKNOWN' ? 'Unknown' : r.source
        sources[s] = (sources[s] || 0) + Number(r.amount)
      }
    })
    if (!hasSourceData) return []
    return Object.entries(sources).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [analyticsFilteredRevenues])

  // ── LOADING ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <span>Loading analytics dashboard...</span>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    )
  }

  const isDatabaseEmpty = revenues.length === 0 && disReports.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ── HEADER ── */}
      <div className="admin-page-header" style={{ marginBottom: 0 }}>
        <div className="admin-page-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
          <TrendingUp size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">Executive Analytics</h1>
          <p className="admin-page-subtitle">Interactive performance indexes, revenues, compliance, and team distribution.</p>
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
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <AlertCircle size={24} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--apple-text-primary)', fontWeight: '600' }}>No Performance Metrics Found</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                The <strong>monthly_revenues</strong> and <strong>dis_reports</strong> tables are empty. Seed realistic demo data to preview the dashboard.
              </p>
            </div>
          </div>
          <button
            onClick={handleSeedDemoData}
            disabled={seeding}
            className="btn"
            style={{
              background: '#fbbf24', color: '#0b0f18',
              fontSize: '0.85rem', padding: '8px 18px',
              fontWeight: '700', border: 'none', borderRadius: '8px',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {seeding ? 'Seeding...' : 'Seed Demo Data'}
          </button>
        </div>
      )}

      {/* ── KPI HIGHLIGHTS (2 cards) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>

        {/* KPI 1: Monthly Revenue */}
        <div className="card" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '13px', borderRadius: '12px', flexShrink: 0 }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Revenue (This Month)
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--apple-text-primary)', marginTop: '2px' }}>
              ${kpis.currentMonthRev.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.74rem', color: kpis.revChange >= 0 ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
              {kpis.revChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {kpis.revChange >= 0 ? '+' : ''}{kpis.revChange.toFixed(1)}% vs last month
            </div>
          </div>
        </div>

        {/* KPI 2: Active Team Members */}
        <div className="card" style={{ padding: '22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', padding: '13px', borderRadius: '12px', flexShrink: 0 }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Active Team Members
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--apple-text-primary)', marginTop: '2px' }}>
              {kpis.totalActiveUsers}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
              Excluding platform administrators
            </div>
          </div>
        </div>
      </div>

      {/* ── REVENUE DISTRIBUTION (full-width, own filter inside) ── */}
      <div style={{ width: '100%' }}>
        <RevenueTrendChart revenues={nonAdminRevenues} teams={teams} />
      </div>

      {/* ── TARGET VS ACTUAL + TEAM RADAR ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: '24px' }}>
        <div style={{ minWidth: 0 }}>
          <TargetVsActualChart
            targets={targets}
            revenues={nonAdminRevenues}
            memberships={memberships}
            profiles={profiles}
            teams={teams}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <TeamRadarChart data={radarData.radarData} rawTeams={radarData.rawTeams} />
        </div>
      </div>

      {/* ── DIS COMPLIANCE HEATMAP ── */}
      <div style={{ width: '100%' }}>
        <ComplianceHeatmap
          disReports={disReports}
          profiles={profiles}
          memberships={memberships}
          teams={teams}
          currentDateStr={currentDateStr}
          holidays={holidays}
        />
      </div>

      {/* ── PERFORMER RANKINGS (full-width) ── */}
      <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>Performer Rankings & Trends</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Track performance indicators, streaks, and sparkline trends across the last 6 months.
            </p>
          </div>

          {/* Top / Needs Attention toggles */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--apple-bg)', border: '1px solid var(--apple-border)', borderRadius: '16px', padding: '2px' }}>
            <button
              onClick={() => setPerformerTab('top')}
              style={{
                padding: '5px 14px', borderRadius: '14px', border: 'none',
                background: performerTab === 'top' ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
                color: performerTab === 'top' ? '#34d399' : 'var(--text-secondary)',
                fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer',
              }}
            >
              Top Performers
            </button>
            <button
              onClick={() => setPerformerTab('attention')}
              style={{
                padding: '5px 14px', borderRadius: '14px', border: 'none',
                background: performerTab === 'attention' ? 'rgba(248, 113, 113, 0.15)' : 'transparent',
                color: performerTab === 'attention' ? '#f87171' : 'var(--text-secondary)',
                fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer',
              }}
            >
              Needs Attention ({needsAttentionPerformers.length})
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--apple-border)', color: 'var(--text-secondary)' }}>
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
                  <tr key={usr.id} style={{ borderBottom: '1px solid var(--apple-border)', color: 'var(--apple-text-primary)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: idx === 0 ? '#fbbf24' : idx === 1 ? 'var(--apple-text-secondary)' : idx === 2 ? '#cd7f32' : 'var(--text-secondary)' }}>
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
                        fontSize: '0.65rem', fontWeight: '700',
                        padding: '2px 7px', borderRadius: '4px',
                        background: usr.status === 'Rising' ? 'rgba(52,211,153,0.12)' : usr.status === 'Declining' ? 'rgba(248,113,113,0.12)' : 'var(--apple-bg-secondary)',
                        color: usr.status === 'Rising' ? '#34d399' : usr.status === 'Declining' ? '#f87171' : 'var(--text-secondary)',
                      }}>
                        {usr.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                needsAttentionPerformers.map((usr) => (
                  <tr key={usr.id} style={{ borderBottom: '1px solid var(--apple-border)', color: 'var(--apple-text-primary)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#f87171' }}>⚠️</td>
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
                      <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
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

      {/* ── GRANULAR ANALYTICS ── */}
      <div className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>Granular Analytics</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Weekly breakdown and source distribution across all active teams.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              color: 'var(--apple-text-primary)', fontSize: '0.85rem', cursor: 'pointer',
              background: 'var(--apple-bg)', padding: '6px 12px',
              borderRadius: '8px', border: '1px solid var(--apple-border)',
              minHeight: '44px',
            }}>
              <input
                type="checkbox"
                checked={analyticsIsAllTime}
                onChange={e => setAnalyticsIsAllTime(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#3b82f6' }}
              />
              All Time
            </label>
            <select
              value={analyticsTeamId}
              onChange={e => setAnalyticsTeamId(e.target.value)}
              style={{
                padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                border: '1px solid var(--apple-border)',
                cursor: 'pointer', minHeight: '44px',
              }}
            >
              <option value="all">All Teams</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select
              value={analyticsMonth}
              onChange={e => setAnalyticsMonth(Number(e.target.value))}
              disabled={analyticsIsAllTime}
              style={{
                padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                border: '1px solid var(--apple-border)',
                opacity: analyticsIsAllTime ? 0.5 : 1,
                cursor: analyticsIsAllTime ? 'not-allowed' : 'pointer',
                minHeight: '44px',
              }}
            >
              {MONTH_NAMES.map((name, idx) => <option key={idx} value={idx}>{name}</option>)}
            </select>
            <select
              value={analyticsYear}
              onChange={e => setAnalyticsYear(Number(e.target.value))}
              disabled={analyticsIsAllTime}
              style={{
                padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                border: '1px solid var(--apple-border)',
                opacity: analyticsIsAllTime ? 0.5 : 1,
                cursor: analyticsIsAllTime ? 'not-allowed' : 'pointer',
                minHeight: '44px',
              }}
            >
              {getAvailableYears().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: analyticsIsAllTime ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
          {/* Weekly Analytics */}
          {!analyticsIsAllTime && (
            <div style={{ background: 'var(--apple-bg-secondary)', border: '1px solid var(--apple-border)', borderRadius: '12px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: 'var(--apple-text-primary)' }}>Weekly Breakdown</h4>
              {weeklyData.length > 0 ? (
                <div style={{ height: 250, width: '100%', minWidth: 0, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        cursor={{ fill: 'var(--apple-bg-secondary)' }}
                        contentStyle={{ background: 'var(--apple-card-bg)', border: '1px solid var(--apple-border)', borderRadius: '8px', color: 'var(--apple-text-primary)' }}
                        itemStyle={{ color: 'var(--apple-text-primary)' }}
                        formatter={(val) => `$${Number(val).toFixed(2)}`}
                      />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', background: 'var(--apple-bg)', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                  Weekly data not available for this period.
                </div>
              )}
            </div>
          )}

          {/* Source Breakdown */}
          <div style={{ background: 'var(--apple-bg-secondary)', border: '1px solid var(--apple-border)', borderRadius: '12px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: 'var(--apple-text-primary)' }}>Source Breakdown</h4>
            {sourceData.length > 0 ? (
              <div style={{ height: 250, width: '100%', minWidth: 0, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sourceData.map((_, index) => {
                        const colors = ['#30d5c8', '#3b82f6', '#fbbf24', '#f87171', '#a855f7', '#64748b']
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      })}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ background: 'var(--apple-card-bg)', border: '1px solid var(--apple-border)', borderRadius: '8px', color: 'var(--apple-text-primary)' }}
                      itemStyle={{ color: 'var(--apple-text-primary)' }}
                      formatter={(val) => `$${Number(val).toFixed(2)}`}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', background: 'var(--apple-bg)', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                Source data not available for this period.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
