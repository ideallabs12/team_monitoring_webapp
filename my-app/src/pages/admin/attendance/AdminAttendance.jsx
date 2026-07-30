import { useState, useEffect } from 'react'
import { supabase } from '../../../supabaseClient'
import { Settings, FileText } from 'lucide-react'
import AttendanceFilterBar from './AttendanceFilterBar'
import AttendanceLogsList from './AttendanceLogsList'
import AttendanceSettings from './AttendanceSettings'

export default function AdminAttendance() {
  const [logs, setLogs] = useState([])
  const [officeLocations, setOfficeLocations] = useState([])
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  
  const [loading, setLoading] = useState(true)
  
  // Filtering state
  const [search, setSearch] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('all')
  const [selectedUser, setSelectedUser] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  
  const [activeTab, setActiveTab] = useState('logs') // 'logs' or 'settings'

  useEffect(() => {
    fetchData()

    const channel = supabase.channel('admin-attendance-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, (payload) => {
        console.log('Real-time attendance log update received:', payload)
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [logsRes, locRes, teamsRes, profilesRes] = await Promise.all([
        supabase
          .from('attendance_logs')
          .select(`
            *,
            profiles:user_id (id, first_name, last_name, email, team_id)
          `)
          .eq('attendance_date', selectedDate)
          .order('created_at', { ascending: false }),
        supabase.from('office_locations').select('*').eq('is_active', true),
        supabase.from('teams').select('*'),
        supabase.from('profiles').select('id, first_name, last_name, team_id')
      ])

      if (logsRes.error) throw logsRes.error
      
      setLogs(logsRes.data || [])
      setOfficeLocations(locRes.data || [])
      setTeams(teamsRes.data || [])
      setUsers(profilesRes.data || [])
      
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this attendance log? This action cannot be undone.')) return
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .delete()
        .eq('id', logId)

      if (error) throw error
      
      setLogs(logs.filter(log => log.id !== logId))
    } catch (err) {
      console.error('Failed to delete log:', err)
      alert('Failed to delete log.')
    }
  }

  // Filter users for the user dropdown based on selected team
  const availableUsers = selectedTeam === 'all' 
    ? users 
    : users.filter(u => u.team_id === selectedTeam)

  // Reset selected user if team changes and user is not in the team
  useEffect(() => {
    if (selectedTeam !== 'all' && selectedUser !== 'all') {
      const userExistsInTeam = availableUsers.some(u => u.id === selectedUser)
      if (!userExistsInTeam) {
        setSelectedUser('all')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam])

  // Derive late/early for filtering logic
  const isLogLate = (log) => {
    const inTime = new Date(log.check_in_time)
    const inMinutes = inTime.getHours() * 60 + inTime.getMinutes()
    return inMinutes > 580 // 9:40 AM
  }

  const isLogEarly = (log) => {
    if (!log.check_out_time) return false
    const outTime = new Date(log.check_out_time)
    const outMinutes = outTime.getHours() * 60 + outTime.getMinutes()
    return outMinutes < 1080 // 6:00 PM
  }

  // Apply all filters
  const filteredLogs = logs.filter(log => {
    // 1. Team Filter
    if (selectedTeam !== 'all') {
      if (log.profiles?.team_id !== selectedTeam) return false
    }

    // 2. User Filter
    if (selectedUser !== 'all') {
      if (log.user_id !== selectedUser) return false
    }

    // 3. Status Filter (DB Status or Computed Time Status)
    if (statusFilter === 'pending' && log.status !== 'pending_approval') return false
    if (statusFilter === 'present' && log.status !== 'present') return false
    if (statusFilter === 'rejected' && log.status !== 'rejected') return false
    if (statusFilter === 'late' && !isLogLate(log)) return false
    if (statusFilter === 'early' && !isLogEarly(log)) return false
    if (statusFilter === 'exception' && !log.exception_reason) return false
    
    // 4. Search Filter
    if (search) {
      const query = search.toLowerCase()
      const name = `${log.profiles?.first_name || ''} ${log.profiles?.last_name || ''}`.toLowerCase()
      const email = (log.profiles?.email || '').toLowerCase()
      if (!name.includes(query) && !email.includes(query)) return false
    }

    return true
  })

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="apple-title-large" style={{ marginBottom: '8px' }}>Attendance Dashboard</h1>
          <p style={{ color: 'var(--apple-text-secondary)', margin: 0 }}>Review daily punch-ins, approve exceptions, and track analytics.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setActiveTab('logs')}
            className="apple-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: activeTab === 'logs' ? 'var(--apple-card)' : 'transparent', color: activeTab === 'logs' ? '#fff' : 'var(--apple-text-secondary)', border: 'none' }}
          >
            <FileText size={16} /> Logs & Analytics
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="apple-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: activeTab === 'settings' ? 'var(--apple-card)' : 'transparent', color: activeTab === 'settings' ? '#fff' : 'var(--apple-text-secondary)', border: 'none' }}
          >
            <Settings size={16} /> Settings
          </button>
        </div>
      </div>

      {activeTab === 'logs' ? (
        <>
          <AttendanceFilterBar 
            teams={teams}
            users={availableUsers}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            search={search}
            setSearch={setSearch}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />

          <AttendanceLogsList 
            logs={filteredLogs}
            loading={loading}
            officeLocations={officeLocations}
            handleDeleteLog={handleDeleteLog}
          />
        </>
      ) : (
        <AttendanceSettings />
      )}
    </div>
  )
}
