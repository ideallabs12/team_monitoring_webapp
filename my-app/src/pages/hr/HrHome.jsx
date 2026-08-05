import React from 'react'
import { Users, UserCheck, MapPin, Trophy } from 'lucide-react'

export default function HrHome() {
  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div className="admin-page-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
          <Users size={24} />
        </div>
        <div>
          <h1 className="admin-page-title">HR Dashboard</h1>
          <p className="admin-page-subtitle">
            Welcome to the Human Resources portal. Overview of personnel and activity.
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        
        {/* Placeholder Stat Cards */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--card-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Users size={20} />
            </div>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Manage Employees</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Access the user directory to view and manage team assignments and access.</p>
        </div>

        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--card-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <MapPin size={20} />
            </div>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Track Attendance</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Review daily punch-ins, work locations, and overall attendance records.</p>
        </div>

        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--card-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
              <Trophy size={20} />
            </div>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Review Milestones</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Monitor employee achievements, milestones, and leaderboard rankings.</p>
        </div>

      </div>
    </div>
  )
}
