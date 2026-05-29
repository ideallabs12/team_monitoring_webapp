import { ClipboardList } from 'lucide-react'

export default function AdminAuditLogs() {
  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
          <ClipboardList size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">Audit Logs</h1>
          <p className="admin-page-subtitle">Track all admin and user actions across the platform.</p>
        </div>
      </div>

      <div className="admin-coming-soon-card">
        <div className="admin-coming-soon-icon">🔍</div>
        <h2>Audit Log Viewer</h2>
        <p>
          This section will display a full audit trail of all critical actions — logins,
          data changes, revenue updates, team modifications, and admin overrides.
        </p>
        <div className="admin-coming-soon-badge">Coming Soon</div>
      </div>
    </div>
  )
}
