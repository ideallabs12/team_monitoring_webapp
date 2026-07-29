import React from 'react'
import { Search, Filter } from 'lucide-react'

export default function AttendanceFilterBar({
  teams,
  users,
  selectedTeam,
  setSelectedTeam,
  selectedUser,
  setSelectedUser,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  selectedDate,
  setSelectedDate
}) {
  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '12px', 
      marginBottom: '20px', 
      padding: '16px', 
      background: 'var(--apple-card)', 
      borderRadius: '16px',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--apple-text-secondary)', fontWeight: '600', marginRight: '8px' }}>
        <Filter size={16} /> Filters
      </div>

      <input 
        type="date" 
        value={selectedDate} 
        onChange={(e) => setSelectedDate(e.target.value)} 
        className="apple-input" 
        style={{ flex: '1 1 150px', border: '1px solid var(--apple-border)' }}
      />

      <div style={{ position: 'relative', flex: '1 1 200px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--apple-text-secondary)' }} />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="apple-input"
          style={{ paddingLeft: '36px', width: '100%', border: '1px solid var(--apple-border)' }}
        />
      </div>

      <select 
        value={selectedTeam} 
        onChange={(e) => setSelectedTeam(e.target.value)} 
        className="apple-input" 
        style={{ flex: '1 1 150px', border: '1px solid var(--apple-border)' }}
      >
        <option value="all">All Teams</option>
        {teams.map(team => (
          <option key={team.id} value={team.id}>{team.name}</option>
        ))}
      </select>

      <select 
        value={selectedUser} 
        onChange={(e) => setSelectedUser(e.target.value)} 
        className="apple-input" 
        style={{ flex: '1 1 150px', border: '1px solid var(--apple-border)' }}
        disabled={selectedTeam === 'all'}
      >
        <option value="all">All Users in Team</option>
        {users.map(user => (
          <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
        ))}
      </select>

      <select 
        value={statusFilter} 
        onChange={(e) => setStatusFilter(e.target.value)} 
        className="apple-input" 
        style={{ flex: '1 1 150px', border: '1px solid var(--apple-border)' }}
      >
        <option value="all">All Statuses</option>
        <option value="late">Late Arrivals</option>
        <option value="early">Early Departures</option>
        <option value="exception">With Exceptions</option>
      </select>
    </div>
  )
}
