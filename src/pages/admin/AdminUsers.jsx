import { Users } from 'lucide-react'

export default function AdminUsers() {
  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
          <Users size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">Users</h1>
          <p className="admin-page-subtitle">Manage platform users, roles, and permissions.</p>
        </div>
      </div>

      <div className="admin-coming-soon-card">
        <div className="admin-coming-soon-icon">👥</div>
        <h2>User Management</h2>
        <p>
          This section will allow you to view all registered users, manage their roles,
          reset passwords, deactivate accounts, and monitor activity.
        </p>
        <div className="admin-coming-soon-badge">Coming Soon</div>
      </div>
    </div>
  )
}
