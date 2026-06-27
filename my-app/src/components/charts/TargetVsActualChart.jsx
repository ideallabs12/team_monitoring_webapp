import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LabelList
} from 'recharts'
import { getLastNMonths } from '../../utils/revenueUtils'
import { calculateTargetVsActual } from '../../utils/analyticsUtils'

const PERIOD_OPTIONS = [
  { label: 'This Month', value: 1 },
  { label: '2M', value: 2 },
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '12M', value: 12 },
]

function formatValue(val) {
  if (!val && val !== 0) return ''
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`
  return `$${val}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  const target = payload.find(p => p.dataKey === 'Target')?.value || 0
  const actual = payload.find(p => p.dataKey === 'Actual')?.value || 0
  const pct = target > 0 ? Math.round((actual / target) * 100) : 0
  const attColor = pct >= 100 ? '#34d399' : pct >= 75 ? '#fbbf24' : '#f87171'

  return (
    <div style={{
      background: 'var(--apple-card-bg)',
      border: '1px solid var(--apple-border)',
      padding: '14px 18px',
      borderRadius: '12px',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
      fontFamily: 'Inter, sans-serif',
      minWidth: '210px',
    }}>
      <p style={{ color: 'var(--apple-text-secondary)', margin: '0 0 10px 0', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--apple-text-secondary)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3b82f6', flexShrink: 0 }} />
            Target
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--apple-text-primary)' }}>
            {target.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--apple-text-secondary)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981', flexShrink: 0 }} />
            Actual
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--apple-text-primary)' }}>
            {actual.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
        <div style={{ height: '1px', background: 'var(--apple-border)', margin: '3px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.84rem', color: 'var(--apple-text-secondary)' }}>Attainment</span>
          <span style={{ fontSize: '0.92rem', fontWeight: '800', color: target > 0 ? attColor : 'var(--apple-text-secondary)' }}>
            {target > 0 ? `${pct}%` : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  )
}

const GlassBar = (props) => {
  const { fill, x, y, width, height } = props;
  if (height <= 0 || isNaN(height) || width <= 0 || isNaN(width)) return null;

  return (
    <g>
      {/* Outer subtle glow */}
      <rect x={x - 2} y={y - 2} width={width + 4} height={height + 2} fill={fill} opacity={0.15} rx={6} />
      
      {/* Main bar body */}
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} />
      
      {/* 3D Glass inner highlight on the left edge to simulate a cylinder */}
      <rect x={x} y={y} width={Math.max(1, width * 0.25)} height={height} fill="#ffffff" opacity={0.2} rx={4} />
      
      {/* Top glossy cap */}
      <rect x={x + 1} y={y + 1} width={Math.max(1, width - 2)} height={Math.min(6, height - 1)} fill="#ffffff" opacity={0.35} rx={2} />
    </g>
  );
};

export default function TargetVsActualChart({
  targets = [],
  revenues = [],
  memberships = [],
  profiles = [],
  teams = [],
}) {
  const [period, setPeriod] = useState(6)
  const [selectedTeamId, setSelectedTeamId] = useState('all')

  const months = useMemo(() => getLastNMonths(period).reverse(), [period])

  const data = useMemo(() =>
    calculateTargetVsActual(targets, revenues, months, selectedTeamId, memberships, profiles, teams),
    [targets, revenues, months, selectedTeamId, memberships, profiles, teams]
  )

  const totalTarget = data.reduce((s, d) => s + d.Target, 0)
  const totalActual = data.reduce((s, d) => s + d.Actual, 0)
  const attainmentPct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0

  let badgeColor = '#94a3b8'
  let badgeBg = 'rgba(148,163,184,0.1)'
  let attainmentDesc = 'No Targets Set'
  let badgeBorder = 'rgba(148,163,184,0.2)'
  if (totalTarget > 0) {
    if (attainmentPct >= 100) {
      badgeColor = '#34d399'; badgeBg = 'rgba(52,211,153,0.1)'; attainmentDesc = 'Target Met ✓'; badgeBorder = 'rgba(52,211,153,0.25)'
    } else if (attainmentPct >= 75) {
      badgeColor = '#fbbf24'; badgeBg = 'rgba(251,191,36,0.1)'; attainmentDesc = 'Near Target'; badgeBorder = 'rgba(251,191,36,0.25)'
    } else {
      badgeColor = '#f87171'; badgeBg = 'rgba(248,113,113,0.1)'; attainmentDesc = 'Below Target'; badgeBorder = 'rgba(248,113,113,0.25)'
    }
  }

  const isEmpty = totalTarget === 0 && totalActual === 0

  return (
    <div className="card" style={{ padding: '24px', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: '18px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>
          Target vs Actual Revenue
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
          Comparing monthly team targets with finalized actual revenues.
        </p>
      </div>

      {/* ── FULL ROW ATTAINMENT BANNER ── */}
      {totalTarget > 0 && (
        <div style={{
          background: badgeBg,
          border: `1px solid ${badgeBorder}`,
          padding: '16px 24px',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          width: '100%'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>Overall Attainment</div>
            <div style={{ fontSize: '0.9rem', color: badgeColor, fontWeight: '600', marginTop: '4px' }}>{attainmentDesc}</div>
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: '800', color: badgeColor, lineHeight: 1 }}>{attainmentPct}%</div>
        </div>
      )}

      {/* ── FILTER ROW ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>

        {/* Period pills */}
        <div style={{
          display: 'flex', gap: '3px',
          background: 'var(--apple-bg)',
          border: '1px solid var(--apple-border)',
          borderRadius: '20px',
          padding: '3px',
        }}>
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              style={{
                padding: '5px 12px',
                borderRadius: '16px',
                border: 'none',
                background: period === opt.value
                  ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                  : 'transparent',
                color: period === opt.value ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.77rem',
                fontWeight: '600',
                transition: 'all 0.18s ease',
                boxShadow: period === opt.value ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Team selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Team:</span>
          <select
            value={selectedTeamId}
            onChange={e => setSelectedTeamId(e.target.value)}
            style={{
              padding: '5px 28px 5px 10px',
              fontSize: '0.77rem',
              borderRadius: '8px',
              background: 'var(--apple-card)',
              color: 'var(--apple-text-primary)',
              border: '1px solid var(--apple-border)',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
            }}
          >
            <option value="all">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── BAR CHART ── */}
      {isEmpty ? (
        <div style={{
          height: 300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.88rem',
          gap: '8px',
          background: 'rgba(255,255,255,0.01)',
          borderRadius: '10px',
          border: '1px dashed var(--apple-border)',
        }}>
          <span style={{ fontSize: '1.8rem' }}>📊</span>
          <span>No revenue or target data for this period.</span>
        </div>
      ) : (
        <div style={{ width: '100%', minWidth: 0, minHeight: 0 }}>
          {/* DESKTOP VIEW: Bar Chart */}
          <div className="target-chart-desktop" style={{ width: '100%', height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 30, right: 10, left: -5, bottom: 5 }}
                barCategoryGap="25%"
                barGap={8}
              >
              <defs>
                <linearGradient id="tvaColorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="tvaColorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.7} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--apple-border)"
                vertical={false}
              />
              <XAxis
                dataKey="period"
                stroke="transparent"
                tick={{ fill: '#64748b', fontSize: '0.74rem', fontWeight: '500' }}
                axisLine={false}
                tickLine={false}
                dy={12}
              />
              <YAxis
                stroke="transparent"
                tick={{ fill: '#64748b', fontSize: '0.74rem' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatValue}
                dx={0}
                width={45}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.025)', radius: 4 }}
              />

              {/* ── TARGET BAR ── */}
              <Bar
                name="Target"
                dataKey="Target"
                fill="url(#tvaColorTarget)"
                shape={<GlassBar />}
                maxBarSize={48}
                animationDuration={700}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey="Target"
                  position="top"
                  formatter={formatValue}
                  style={{ fill: '#60a5fa', fontSize: '0.68rem', fontWeight: '600' }}
                  dy={-8}
                />
              </Bar>

              {/* ── ACTUAL BAR ── */}
              <Bar
                name="Actual Revenue"
                dataKey="Actual"
                fill="url(#tvaColorActual)"
                shape={<GlassBar />}
                maxBarSize={48}
                animationDuration={900}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey="Actual"
                  position="top"
                  formatter={formatValue}
                  style={{ fill: '#10b981', fontSize: '0.68rem', fontWeight: '800' }}
                  dy={-8}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>

          {/* MOBILE VIEW: Grid of Progress Bars (2 in a row) */}
          <div className="target-list-mobile no-scrollbar" style={{ width: '100%', maxHeight: '400px', overflowY: 'auto', flexDirection: 'row', flexWrap: 'wrap', gap: '16px', paddingRight: '4px' }}>
            {data.slice().reverse().map(d => {
              const target = d.Target || 0;
              const actual = d.Actual || 0;
              const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
              return (
                <div key={d.period} style={{ width: 'calc(50% - 8px)', padding: '12px', background: 'var(--apple-card)', borderRadius: '12px', border: '1px solid var(--apple-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--apple-text-primary)' }}>{d.period}</span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>Target: <span style={{ color: '#3b82f6' }}>{formatValue(target)}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '10px', background: 'rgba(59,130,246,0.15)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #047857)', borderRadius: '5px', transition: 'width 1s ease-out' }} />
                    </div>
                    <span style={{ fontWeight: '800', color: '#10b981', fontSize: '0.9rem', minWidth: '35px', textAlign: 'right' }}>{formatValue(actual)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LEGEND ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        marginTop: '16px',
        paddingTop: '14px',
        borderTop: '1px solid var(--apple-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '12px', height: '12px', borderRadius: '3px', flexShrink: 0,
            background: 'linear-gradient(180deg, #3b82f6, #1e3a8a)',
          }} />
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Target</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '12px', height: '12px', borderRadius: '3px', flexShrink: 0,
            background: 'linear-gradient(180deg, #10b981, #064e3b)',
          }} />
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Actual Revenue</span>
        </div>
        {totalTarget > 0 && (
          <div style={{ fontSize: '0.78rem', color: '#64748b', flexGrow: 1, textAlign: 'right' }}>
            Total Target: <strong style={{ color: '#60a5fa' }}>{formatValue(totalTarget)}</strong>
            &nbsp;·&nbsp;
            Total Actual: <strong style={{ color: '#34d399' }}>{formatValue(totalActual)}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
