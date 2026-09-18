import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Edit,
  Image as ImageIcon,
  Clock,
  Calendar,
  Trash2,
  Plus,
  Power,
  Search,
  BarChart3,
  RotateCcw,
  X
} from 'lucide-react'

export default function AdminReviews() {
  const { user, featureAccess } = useOutletContext() || {}
  const [searchParams, setSearchParams] = useSearchParams()

  const canManageReviews = user?.email === 'signatureglobalconferences@gmail.com' || featureAccess === null || !!featureAccess?.reviews
  const canManageWriteUps = user?.email === 'signatureglobalconferences@gmail.com' || featureAccess === null || !!featureAccess?.writeUps

  // Determine active tab from URL query param, defaulting gracefully based on permissions
  const tabParam = searchParams.get('tab')
  const defaultTab = canManageReviews ? 'approvals' : (canManageWriteUps ? 'write-ups' : 'approvals')
  const activeTab = tabParam ? (tabParam === 'write-ups' ? 'write-ups' : 'approvals') : defaultTab

  const handleTabChange = (tab) => {
    setSearchParams({ tab })
  }

  // ── Shared / General State ──
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])

  // ── Approvals State (Reviews) ──
  const [reviews, setReviews] = useState([])
  const [writeUps, setWriteUps] = useState([])
  const [filterStatus, setFilterStatus] = useState('pending')
  const [selectedWriteUpId, setSelectedWriteUpId] = useState('all')
  const [filterTeam, setFilterTeam] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReview, setSelectedReview] = useState(null)
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, reviewId: null, feedback: '' })

  // ── Campaigns State (Events / Write-Ups) ──
  const [events, setEvents] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetTeamId, setTargetTeamId] = useState('all')
  const [socialPlatform, setSocialPlatform] = useState('')
  const [socialUrl, setSocialUrl] = useState('')
  const [collectEmail, setCollectEmail] = useState(false)
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // ── Load All Data ──
  const loadAllData = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const [reviewsRes, eventsRes, teamsRes] = await Promise.all([
        supabase
          .from('reviews')
          .select(`
            *,
            events ( title, is_active ),
            profiles ( first_name, last_name, email ),
            teams ( name )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('events')
          .select('*, teams(name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('teams')
          .select('id, name')
          .order('name')
      ])

      if (reviewsRes.error) throw reviewsRes.error
      setReviews(reviewsRes.data || [])

      if (eventsRes.error) throw eventsRes.error
      const eventsData = eventsRes.data || []
      setEvents(eventsData)
      setWriteUps(eventsData)

      if (!teamsRes.error) {
        setTeams(teamsRes.data || [])
      }
    } catch (err) {
      console.error('Error loading reviews and events:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false

    async function fetchInitialData() {
      try {
        const [reviewsRes, eventsRes, teamsRes] = await Promise.all([
          supabase
            .from('reviews')
            .select(`
              *,
              events ( title, is_active ),
              profiles ( first_name, last_name, email ),
              teams ( name )
            `)
            .order('created_at', { ascending: false }),
          supabase
            .from('events')
            .select('*, teams(name)')
            .order('created_at', { ascending: false }),
          supabase
            .from('teams')
            .select('id, name')
            .order('name')
        ])

        if (ignore) return

        if (reviewsRes.error) throw reviewsRes.error
        setReviews(reviewsRes.data || [])

        if (eventsRes.error) throw eventsRes.error
        const eventsData = eventsRes.data || []
        setEvents(eventsData)
        setWriteUps(eventsData)

        if (!teamsRes.error) {
          setTeams(teamsRes.data || [])
        }
      } catch (err) {
        console.error('Error loading reviews and events:', err)
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    fetchInitialData()

    return () => {
      ignore = true
    }
  }, [])

  // ── Approvals Actions ──
  const handleApprove = async (id) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'approved', admin_feedback: null, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      setReviews(reviews.map(r => r.id === id ? { ...r, status: 'approved', admin_feedback: null } : r))
    } catch (err) {
      console.error('Error approving review:', err)
      alert('Failed to approve review.')
    }
  }

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to completely reject this review without feedback?')) return
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status: 'rejected', admin_feedback: null, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      setReviews(reviews.map(r => r.id === id ? { ...r, status: 'rejected', admin_feedback: null } : r))
    } catch (err) {
      console.error('Error rejecting review:', err)
      alert('Failed to reject review.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this review? The user will need to write a new one.')) return
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id)

      if (error) throw error
      setReviews(reviews.filter(r => r.id !== id))
    } catch (err) {
      console.error('Error deleting review:', err)
      alert('Failed to delete review.')
    }
  }

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          status: 'feedback',
          admin_feedback: feedbackModal.feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', feedbackModal.reviewId)

      if (error) throw error

      setReviews(reviews.map(r => r.id === feedbackModal.reviewId ? { ...r, status: 'feedback', admin_feedback: feedbackModal.feedback } : r))
      setFeedbackModal({ isOpen: false, reviewId: null, feedback: '' })
    } catch (err) {
      console.error('Error providing feedback:', err)
      alert('Failed to provide feedback.')
    }
  }

  // ── Campaigns Actions ──
  const handleSubmitEvent = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const eventData = {
        title,
        description,
        target_team_id: targetTeamId === 'all' ? null : targetTeamId,
        social_platform: socialPlatform || null,
        social_url: socialPlatform ? socialUrl : null,
        collect_email: collectEmail,
        allow_multiple_submissions: allowMultiple
      }

      if (editingEventId) {
        // Update existing
        const { data, error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEventId)
          .select('*, teams(name)')
          .single()

        if (error) throw error

        setEvents(events.map(ev => ev.id === editingEventId ? data : ev))
        setWriteUps(writeUps.map(ev => ev.id === editingEventId ? data : ev))
        setMessage({ type: 'success', text: 'Write-Up updated successfully!' })
      } else {
        // Insert new
        eventData.is_active = true

        const { data, error } = await supabase
          .from('events')
          .insert([eventData])
          .select('*, teams(name)')
          .single()

        if (error) throw error

        setEvents([data, ...events])
        setWriteUps([data, ...writeUps])
        setMessage({ type: 'success', text: 'Write-Up created successfully!' })
      }

      handleCancelEdit()
    } catch (err) {
      console.error('Error saving event:', err)
      setMessage({ type: 'error', text: 'Failed to save write-up.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClick = (ev) => {
    setEditingEventId(ev.id)
    setTitle(ev.title)
    setDescription(ev.description || '')
    setTargetTeamId(ev.target_team_id || 'all')
    setSocialPlatform(ev.social_platform || '')
    setSocialUrl(ev.social_url || '')
    setCollectEmail(ev.collect_email || false)
    setAllowMultiple(ev.allow_multiple_submissions || false)
    setShowCreate(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setTitle('')
    setDescription('')
    setTargetTeamId('all')
    setSocialPlatform('')
    setSocialUrl('')
    setCollectEmail(false)
    setAllowMultiple(false)
    setEditingEventId(null)
    setShowCreate(false)
  }

  const toggleEventStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      setEvents(events.map(ev => ev.id === id ? { ...ev, is_active: !currentStatus } : ev))
      setWriteUps(writeUps.map(ev => ev.id === id ? { ...ev, is_active: !currentStatus } : ev))
    } catch (err) {
      console.error('Error toggling status:', err)
      alert('Failed to update event status.')
    }
  }

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event? This will also delete all associated reviews.')) return

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error

      setEvents(events.filter(ev => ev.id !== id))
      setWriteUps(writeUps.filter(ev => ev.id !== id))
    } catch (err) {
      console.error('Error deleting event:', err)
      alert('Failed to delete event.')
    }
  }

  const handleDownloadCSV = async (eventId, eventTitle) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          created_at,
          title,
          speaker_name,
          speaker_email,
          photo_url,
          status,
          profiles(first_name, last_name, email),
          teams(name)
        `)
        .eq('event_id', eventId)

      if (error) throw error

      if (!data || data.length === 0) {
        alert('No reviews found for this write-up.')
        return
      }

      // Convert to CSV
      const headers = ['Date', 'User First Name', 'User Last Name', 'User Email', 'Team', 'Speaker Name', 'Speaker Email', 'Review Title', 'Photo Link', 'Status']
      const rows = data.map(r => [
        new Date(r.created_at).toLocaleDateString(),
        r.profiles?.first_name || '',
        r.profiles?.last_name || '',
        r.profiles?.email || '',
        r.teams?.name || 'No Team',
        r.speaker_name || '',
        r.speaker_email || '',
        `"${(r.title || '').replace(/"/g, '""')}"`,
        r.photo_url || 'No Photo',
        r.status || ''
      ])

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_reviews.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Error downloading CSV:', err)
      alert('Failed to download data.')
    }
  }

  // ── Approvals Derived Filters ──
  const availableTeams = useMemo(() => {
    const teamsSet = new Set()
    reviews.forEach(r => {
      if (r.teams?.name) teamsSet.add(r.teams.name)
    })
    return Array.from(teamsSet).sort()
  }, [reviews])

  const availableUsers = useMemo(() => {
    const usersMap = new Map()
    reviews.forEach(r => {
      if (filterTeam !== 'all' && r.teams?.name !== filterTeam) return
      const userName = `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.trim()
      if (userName && r.user_id) {
        usersMap.set(r.user_id, userName)
      }
    })
    return Array.from(usersMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [reviews, filterTeam])

  const pendingReviewsCount = useMemo(() => {
    return reviews.filter(r => r.status === 'pending').length
  }, [reviews])

  const statusCounts = useMemo(() => {
    const counts = { pending: 0, feedback: 0, approved: 0, rejected: 0, all: 0 }
    reviews.forEach(r => {
      if (selectedWriteUpId !== 'all' && String(r.event_id) !== String(selectedWriteUpId)) return
      if (filterTeam !== 'all' && r.teams?.name !== filterTeam) return
      if (filterUser !== 'all' && String(r.user_id) !== filterUser) return
      counts.all++
      if (r.status in counts) {
        counts[r.status]++
      }
    })
    return counts
  }, [reviews, selectedWriteUpId, filterTeam, filterUser])

  const filteredReviews = useMemo(() => {
    let result = reviews

    if (selectedWriteUpId !== 'all') {
      result = result.filter(r => String(r.event_id) === String(selectedWriteUpId))
    }

    if (filterStatus !== 'all' && filterStatus !== 'analysis') {
      result = result.filter(r => r.status === filterStatus)
    }

    if (filterTeam !== 'all') {
      result = result.filter(r => r.teams?.name === filterTeam)
    }

    if (filterUser !== 'all') {
      result = result.filter(r => String(r.user_id) === filterUser)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r => {
        const userName = `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.toLowerCase()
        const speakerName = (r.speaker_name || '').toLowerCase()
        return userName.includes(q) || speakerName.includes(q)
      })
    }

    return result
  }, [reviews, filterStatus, selectedWriteUpId, filterTeam, filterUser, searchQuery])

  const analyticsData = useMemo(() => {
    if (filterStatus !== 'analysis') return null

    const totalReviews = filteredReviews.length
    const approvedReviews = filteredReviews.filter(r => r.status === 'approved').length
    const rejectedReviews = filteredReviews.filter(r => r.status === 'rejected').length
    const pendingReviews = filteredReviews.filter(r => r.status === 'pending').length
    const feedbackReviews = filteredReviews.filter(r => r.status === 'feedback').length

    const userMap = {}
    filteredReviews.forEach(r => {
      const userId = r.user_id || (r.profiles?.email) || 'Unknown'
      if (!userMap[userId]) {
        userMap[userId] = {
          name: `${r.profiles?.first_name || 'Unknown'} ${r.profiles?.last_name || ''}`.trim(),
          email: r.profiles?.email,
          count: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
          feedback: 0,
          team: r.teams?.name || 'No Team'
        }
      }
      userMap[userId].count++
      if (r.status === 'approved') userMap[userId].approved++
      if (r.status === 'rejected') userMap[userId].rejected++
      if (r.status === 'pending') userMap[userId].pending++
      if (r.status === 'feedback') userMap[userId].feedback++
    })

    const userStats = Object.values(userMap).sort((a, b) => b.count - a.count)

    return {
      totalReviews,
      approvedReviews,
      rejectedReviews,
      pendingReviews,
      feedbackReviews,
      userStats
    }
  }, [filteredReviews, filterStatus])

  if (loading && reviews.length === 0 && events.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', gap: '16px' }}>
        <RefreshCw size={36} className="spin-anim" style={{ color: 'var(--apple-accent-blue)' }} />
        <div style={{ color: 'var(--apple-text-secondary)', fontSize: '1.05rem', fontWeight: '500' }}>Loading Reviews & Campaigns...</div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)' }}>
      {/* ===== HEADER SECTION ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="apple-kicker">Review System</div>
          <h1 className="apple-title-large">Reviews &amp; Write-Ups</h1>
          <p className="apple-lead" style={{ margin: 0 }}>
            Manage review campaigns, moderate submissions, and approve team write-ups.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={loadAllData}
            disabled={loading}
            className="apple-btn apple-btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>

          {activeTab === 'write-ups' && canManageWriteUps && (
            <button
              onClick={() => {
                if (showCreate) {
                  handleCancelEdit()
                } else {
                  setShowCreate(true)
                }
              }}
              className="apple-btn apple-btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {showCreate ? 'Cancel' : <><Plus size={16} /> Create Write-Up</>}
            </button>
          )}
        </div>
      </div>

      {/* ===== IN-PAGE SEGMENTED TABS ===== */}
      <div style={{
        display: 'inline-flex',
        padding: '4px',
        background: 'var(--apple-input-bg, rgba(0,0,0,0.04))',
        borderRadius: '12px',
        border: '1px solid var(--apple-border)',
        marginBottom: '20px',
        maxWidth: '100%',
        gap: '4px',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => handleTabChange('approvals')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: activeTab === 'approvals' ? '600' : '500',
            background: activeTab === 'approvals' ? 'var(--apple-card, #ffffff)' : 'transparent',
            color: activeTab === 'approvals' ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)',
            boxShadow: activeTab === 'approvals' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <CheckCircle size={16} style={{ color: activeTab === 'approvals' ? 'var(--apple-accent-blue)' : 'inherit' }} />
          <span>Review Approvals</span>
          {pendingReviewsCount > 0 && (
            <span style={{
              background: 'var(--apple-accent-orange)',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: '700',
              padding: '1px 7px',
              borderRadius: '999px'
            }}>
              {pendingReviewsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('write-ups')}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: activeTab === 'write-ups' ? '600' : '500',
            background: activeTab === 'write-ups' ? 'var(--apple-card, #ffffff)' : 'transparent',
            color: activeTab === 'write-ups' ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)',
            boxShadow: activeTab === 'write-ups' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Calendar size={16} style={{ color: activeTab === 'write-ups' ? 'var(--apple-accent-blue)' : 'inherit' }} />
          <span>Write-Up Campaigns</span>
          <span style={{
            background: 'rgba(0,0,0,0.06)',
            color: 'var(--apple-text-secondary)',
            fontSize: '0.72rem',
            fontWeight: '600',
            padding: '1px 7px',
            borderRadius: '999px'
          }}>
            {events.length}
          </span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: REVIEW APPROVALS & SUBMISSIONS
         ======================================================== */}
      {activeTab === 'approvals' && (
        <div>
          {/* Unified Approvals Control & Filter Card */}
          <div className="reviews-toolbar-card">
            {/* ROW 1: Status Tabs + Analytics Toggle in ONE cohesive bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              {/* Status Segmented Control */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--apple-input-bg, rgba(0,0,0,0.04))',
                borderRadius: '10px',
                padding: '3px',
                gap: '2px',
                overflowX: 'auto',
                maxWidth: '100%'
              }}>
                {[
                  { id: 'pending', label: 'Pending', count: statusCounts.pending, dotColor: '#ff9500' },
                  { id: 'feedback', label: 'Needs Revision', count: statusCounts.feedback, dotColor: '#bf5af2' },
                  { id: 'approved', label: 'Approved', count: statusCounts.approved, dotColor: '#34c759' },
                  { id: 'rejected', label: 'Rejected', count: statusCounts.rejected, dotColor: '#ff3b30' },
                  { id: 'all', label: 'All Reviews', count: statusCounts.all, dotColor: '#0071e3' },
                ].map(st => {
                  const isActive = filterStatus === st.id
                  return (
                    <button
                      key={st.id}
                      onClick={() => setFilterStatus(st.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '7px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.83rem',
                        fontWeight: isActive ? '600' : '500',
                        background: isActive ? 'var(--apple-card, #ffffff)' : 'transparent',
                        color: isActive ? 'var(--apple-text-primary)' : 'var(--apple-text-secondary)',
                        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: st.dotColor,
                        display: 'inline-block'
                      }} />
                      <span>{st.label}</span>
                      <span style={{
                        fontSize: '0.73rem',
                        fontWeight: '700',
                        padding: '1px 6px',
                        borderRadius: '999px',
                        background: isActive ? `${st.dotColor}18` : 'rgba(0,0,0,0.05)',
                        color: isActive ? st.dotColor : 'var(--apple-text-secondary)'
                      }}>
                        {st.count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* View Switcher: Analytics Toggle */}
              <button
                onClick={() => setFilterStatus(filterStatus === 'analysis' ? 'pending' : 'analysis')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: filterStatus === 'analysis' ? '1px solid var(--apple-accent-blue)' : '1px solid var(--apple-border)',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: '600',
                  background: filterStatus === 'analysis' ? 'var(--apple-accent-blue)' : 'transparent',
                  color: filterStatus === 'analysis' ? '#ffffff' : 'var(--apple-text-primary)',
                  boxShadow: filterStatus === 'analysis' ? '0 2px 6px rgba(0, 113, 227, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <BarChart3 size={15} />
                <span>{filterStatus === 'analysis' ? 'Back to Submissions' : 'Analytics Overview'}</span>
              </button>
            </div>

            {/* ROW 2: Filter Toolbar (Campaign, Team, User, Search) */}
            {filterStatus !== 'analysis' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                paddingTop: '14px',
                borderTop: '1px solid var(--apple-border)'
              }}>
                {/* Search Input */}
                <div style={{ position: 'relative', flex: '2 1 240px', minWidth: '220px' }}>
                  <Search size={15} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--apple-text-secondary)',
                    pointerEvents: 'none'
                  }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search applicant, reviewer, speaker..."
                    className="reviews-filter-input has-icon"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: 'var(--apple-text-secondary)',
                        display: 'flex',
                        padding: '4px'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Campaign Dropdown */}
                <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
                  <select
                    value={selectedWriteUpId}
                    onChange={(e) => setSelectedWriteUpId(e.target.value)}
                    className="reviews-filter-select"
                  >
                    <option value="all">All Campaigns</option>
                    {writeUps.map(wu => (
                      <option key={wu.id} value={wu.id}>{wu.title}</option>
                    ))}
                  </select>
                </div>

                {/* Team Dropdown */}
                <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
                  <select
                    value={filterTeam}
                    onChange={(e) => {
                      setFilterTeam(e.target.value)
                      setFilterUser('all')
                    }}
                    className="reviews-filter-select"
                  >
                    <option value="all">All Teams</option>
                    {availableTeams.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* User Dropdown */}
                <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
                  <select
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="reviews-filter-select"
                  >
                    <option value="all">All Users</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters button */}
                {(selectedWriteUpId !== 'all' || filterTeam !== 'all' || filterUser !== 'all' || searchQuery.trim() !== '') && (
                  <button
                    onClick={() => {
                      setSelectedWriteUpId('all')
                      setFilterTeam('all')
                      setFilterUser('all')
                      setSearchQuery('')
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      height: '42px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--apple-border)',
                      background: 'transparent',
                      color: 'var(--apple-accent-blue)',
                      fontSize: '0.84rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            )}

            {/* Results count & status summary */}
            {filterStatus !== 'analysis' && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
                color: 'var(--apple-text-secondary)',
                paddingTop: '2px'
              }}>
                <div>
                  Showing <strong style={{ color: 'var(--apple-text-primary)' }}>{filteredReviews.length}</strong> {filteredReviews.length === 1 ? 'review' : 'reviews'}
                  {(selectedWriteUpId !== 'all' || filterTeam !== 'all' || filterUser !== 'all' || searchQuery.trim() !== '') && ' (filtered)'}
                </div>
                {selectedWriteUpId !== 'all' && (
                  <div style={{ fontSize: '0.78rem' }}>
                    Campaign: <span style={{ color: 'var(--apple-accent-blue)', fontWeight: '600' }}>
                      {writeUps.find(w => String(w.id) === String(selectedWriteUpId))?.title || 'Selected'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Analytics View */}
          {filterStatus === 'analysis' && analyticsData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="apple-card" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)' }}>Total Reviews</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--apple-text-primary)' }}>{analyticsData.totalReviews}</div>
                </div>
                <div className="apple-card" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--apple-accent-green)' }}>Approved</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--apple-accent-green)' }}>{analyticsData.approvedReviews}</div>
                </div>
                <div className="apple-card" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--apple-accent-orange)' }}>Needs Revision</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--apple-accent-orange)' }}>{analyticsData.feedbackReviews}</div>
                </div>
                <div className="apple-card" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--apple-accent-red)' }}>Rejected</div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--apple-accent-red)' }}>{analyticsData.rejectedReviews}</div>
                </div>
              </div>

              <div className="apple-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '16px' }}>Submissions by User</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--apple-border)', textAlign: 'left', color: 'var(--apple-text-secondary)' }}>
                        <th style={{ padding: '10px 12px' }}>User</th>
                        <th style={{ padding: '10px 12px' }}>Team</th>
                        <th style={{ padding: '10px 12px' }}>Total</th>
                        <th style={{ padding: '10px 12px' }}>Approved</th>
                        <th style={{ padding: '10px 12px' }}>Pending</th>
                        <th style={{ padding: '10px 12px' }}>Needs Revision</th>
                        <th style={{ padding: '10px 12px' }}>Rejected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.userStats.map((st, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--apple-border)' }}>
                          <td style={{ padding: '12px' }}><strong>{st.name}</strong> <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)' }}>{st.email}</div></td>
                          <td style={{ padding: '12px' }}>{st.team}</td>
                          <td style={{ padding: '12px', fontWeight: '700' }}>{st.count}</td>
                          <td style={{ padding: '12px', color: 'var(--apple-accent-green)' }}>{st.approved}</td>
                          <td style={{ padding: '12px' }}>{st.pending}</td>
                          <td style={{ padding: '12px', color: 'var(--apple-accent-orange)' }}>{st.feedback}</td>
                          <td style={{ padding: '12px', color: 'var(--apple-accent-red)' }}>{st.rejected}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Reviews List */}
          {filterStatus !== 'analysis' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
              {filteredReviews.map((rev) => (
                <div key={rev.id} className="apple-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {rev.events?.title || 'Unknown Campaign'}
                      </div>
                      <h3 style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: '600' }}>{rev.title || 'Untitled Submission'}</h3>
                    </div>
                    <span className={`apple-badge ${
                      rev.status === 'approved' ? 'apple-badge-green' :
                      rev.status === 'rejected' ? 'apple-badge-red' :
                      rev.status === 'feedback' ? 'apple-badge-orange' : 'apple-badge-blue'
                    }`} style={{ fontSize: '0.65rem' }}>
                      {rev.status === 'feedback' ? 'Needs Revision' : rev.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Submitted by:</strong> {rev.profiles?.first_name || ''} {rev.profiles?.last_name || ''} ({rev.teams?.name || 'No Team'})</div>
                    {rev.speaker_name && <div><strong>Speaker:</strong> {rev.speaker_name} {rev.speaker_email && `(${rev.speaker_email})`}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={12} /> {new Date(rev.created_at).toLocaleString()}
                    </div>
                  </div>

                  {rev.photo_url && (
                    <div
                      onClick={() => setSelectedReview(rev)}
                      style={{
                        position: 'relative', height: '140px', borderRadius: '8px', overflow: 'hidden',
                        background: 'rgba(0,0,0,0.2)', cursor: 'pointer', border: '1px solid var(--apple-border)'
                      }}
                      title="Click to view full photo"
                    >
                      <img src={rev.photo_url} alt="Review Screenshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.6)',
                        color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        <ImageIcon size={12} /> View Photo
                      </div>
                    </div>
                  )}

                  {rev.admin_feedback && (
                    <div style={{ padding: '10px 12px', background: 'rgba(255, 159, 10, 0.08)', border: '1px solid rgba(255, 159, 10, 0.2)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--apple-accent-orange)' }}>
                      <strong>Feedback Sent:</strong> {rev.admin_feedback}
                    </div>
                  )}

                  {/* Actions */}
                  {canManageReviews && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--apple-border)', flexWrap: 'wrap' }}>
                      {rev.status !== 'approved' && (
                        <button
                          onClick={() => handleApprove(rev.id)}
                          className="apple-btn apple-btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                      )}

                      <button
                        onClick={() => setFeedbackModal({ isOpen: true, reviewId: rev.id, feedback: rev.admin_feedback || '' })}
                        className="apple-btn apple-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Edit size={14} /> Request Revision
                      </button>

                      {rev.status !== 'rejected' && (
                        <button
                          onClick={() => handleReject(rev.id)}
                          className="apple-btn apple-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--apple-accent-red)' }}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(rev.id)}
                        className="apple-btn apple-btn-danger"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--apple-accent-red)' }}
                        title="Delete Review"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filteredReviews.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 20px', color: 'var(--apple-text-secondary)', background: 'var(--apple-card)', borderRadius: '16px', border: '1px solid var(--apple-border)' }}>
                  No reviews found for the selected criteria.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: WRITE-UP CAMPAIGNS (EVENTS)
         ======================================================== */}
      {activeTab === 'write-ups' && (
        <div>
          {message.text && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
              background: message.type === 'success' ? 'rgba(48,213,200,0.08)' : 'rgba(255,69,58,0.08)',
              border: `1px solid ${message.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)'}`,
              color: message.type === 'success' ? 'var(--apple-accent-green)' : 'var(--apple-accent-red)',
              fontSize: '0.88rem', fontWeight: '500'
            }}>
              {message.text}
            </div>
          )}

          {/* Create/Edit Campaign Form */}
          {showCreate && canManageWriteUps && (
            <div className="apple-card" style={{ padding: '24px', marginBottom: '30px', borderTop: '3px solid var(--apple-accent-blue)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} style={{ color: 'var(--apple-accent-blue)' }} />
                {editingEventId ? 'Edit Write-Up Campaign' : 'New Write-Up Campaign'}
              </h3>
              <form onSubmit={handleSubmitEvent} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label className="apple-form-label">Write-Up Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q3 Global Conference Feedback"
                    required
                    className="apple-form-control"
                  />
                </div>

                <div>
                  <label className="apple-form-label">Target Team</label>
                  <select
                    className="apple-form-control"
                    value={targetTeamId}
                    onChange={(e) => setTargetTeamId(e.target.value)}
                  >
                    <option value="all">All Teams</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="apple-form-label">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide context and guidelines for users submitting reviews..."
                    rows={3}
                    className="apple-form-control"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="collectEmail"
                      checked={collectEmail}
                      onChange={(e) => setCollectEmail(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', appearance: 'auto', display: 'block' }}
                    />
                    <label htmlFor="collectEmail" className="apple-form-label" style={{ margin: 0, cursor: 'pointer' }}>
                      Collect Speaker Info (Name &amp; Email)
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="allowMultiple"
                      checked={allowMultiple}
                      onChange={(e) => setAllowMultiple(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', appearance: 'auto', display: 'block' }}
                    />
                    <label htmlFor="allowMultiple" className="apple-form-label" style={{ margin: 0, cursor: 'pointer' }}>
                      Allow Multiple Submissions (Users can submit multiple reviews)
                    </label>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label className="apple-form-label">Social Media Platform (Optional)</label>
                    <select
                      className="apple-form-control"
                      value={socialPlatform}
                      onChange={(e) => {
                        const platform = e.target.value
                        setSocialPlatform(platform)
                        if (platform === 'Facebook') setSocialUrl('https://facebook.com')
                        else if (platform === 'Instagram') setSocialUrl('https://instagram.com')
                        else if (platform === 'LinkedIn') setSocialUrl('https://linkedin.com')
                        else if (platform === 'Reddit') setSocialUrl('https://reddit.com')
                        else if (platform === 'Twitter') setSocialUrl('https://twitter.com')
                        else if (platform === 'Website') setSocialUrl('https://')
                        else setSocialUrl('')
                      }}
                    >
                      <option value="">None</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Reddit">Reddit</option>
                      <option value="Twitter">Twitter</option>
                      <option value="Website">Website URL</option>
                    </select>
                  </div>

                  {socialPlatform && (
                    <div>
                      <label className="apple-form-label">{socialPlatform} URL</label>
                      <input
                        type="url"
                        value={socialUrl}
                        onChange={(e) => setSocialUrl(e.target.value)}
                        placeholder="https://..."
                        required
                        className="apple-form-control"
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="apple-btn apple-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !title.trim()}
                    className="apple-btn apple-btn-primary"
                  >
                    {submitting ? 'Saving...' : editingEventId ? 'Update Write-Up' : 'Save Write-Up'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Campaigns Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
            {events.map((ev) => (
              <div key={ev.id} className="apple-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: ev.is_active ? 'var(--apple-accent-green)' : 'var(--apple-text-secondary)' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{ev.title}</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--apple-text-secondary)', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>Created {new Date(ev.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span style={{ color: ev.teams?.name ? 'var(--apple-accent-blue)' : 'var(--apple-text-primary)' }}>
                        {ev.teams?.name ? `Target: ${ev.teams.name}` : 'Target: All Teams'}
                      </span>
                    </div>
                  </div>
                  <span className={`apple-badge ${ev.is_active ? 'apple-badge-green' : 'apple-badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                    {ev.is_active ? 'Active' : 'Closed'}
                  </span>
                </div>

                {ev.social_platform && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--apple-accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="apple-badge apple-badge-blue" style={{ fontSize: '0.65rem' }}>
                      Target: {ev.social_platform}
                    </span>
                    <a href={ev.social_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--apple-accent-blue)', textDecoration: 'underline' }}>
                      {ev.social_url.length > 30 ? ev.social_url.substring(0, 30) + '...' : ev.social_url}
                    </a>
                  </div>
                )}

                {ev.description && (
                  <p style={{ margin: 0, color: 'var(--apple-text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', flexGrow: 1 }}>
                    {ev.description}
                  </p>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--apple-border)' }}>
                  {canManageWriteUps && (
                    <>
                      <button
                        onClick={() => handleEditClick(ev)}
                        className="apple-btn apple-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', justifyContent: 'center' }}
                      >
                        <Edit size={14} /> Edit
                      </button>

                      <button
                        onClick={() => toggleEventStatus(ev.id, ev.is_active)}
                        className={`apple-btn ${ev.is_active ? 'apple-btn-secondary' : 'apple-btn-primary'}`}
                        style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', justifyContent: 'center' }}
                      >
                        <Power size={14} /> {ev.is_active ? 'Turn Off' : 'Turn On'}
                      </button>

                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="apple-btn apple-btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--apple-accent-red)', flex: '1 1 auto', justifyContent: 'center' }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDownloadCSV(ev.id, ev.title)}
                    className="apple-btn apple-btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 100%', justifyContent: 'center', marginTop: '4px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Download Excel (CSV)
                  </button>
                </div>
              </div>
            ))}

            {events.length === 0 && !loading && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--apple-text-secondary)', fontStyle: 'italic', background: 'var(--apple-card)', borderRadius: '16px', border: '1px solid var(--apple-border)' }}>
                No review write-up campaigns created yet. Click &ldquo;Create Write-Up&rdquo; to launch your first one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== PHOTO PREVIEW MODAL ===== */}
      {selectedReview && createPortal(
        <div
          onClick={() => setSelectedReview(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="apple-card"
            style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Submission Photo</h3>
              <button onClick={() => setSelectedReview(null)} className="apple-btn apple-btn-secondary" style={{ padding: '4px 10px' }}>
                Close
              </button>
            </div>
            <img src={selectedReview.photo_url} alt="Review Full" style={{ width: '100%', borderRadius: '8px', objectFit: 'contain', maxHeight: '60vh' }} />
            <div style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>
              <div><strong>User:</strong> {selectedReview.profiles?.first_name} {selectedReview.profiles?.last_name}</div>
              <div><strong>Campaign:</strong> {selectedReview.events?.title}</div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===== FEEDBACK MODAL ===== */}
      {feedbackModal.isOpen && createPortal(
        <div
          onClick={() => setFeedbackModal({ isOpen: false, reviewId: null, feedback: '' })}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="apple-card"
            style={{ maxWidth: '500px', width: '100%', padding: '24px' }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '1.15rem' }}>Request Revision</h3>
            <p style={{ color: 'var(--apple-text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Explain what the user needs to correct. The status will be marked as &ldquo;Needs Revision&rdquo;.
            </p>
            <form onSubmit={handleFeedbackSubmit}>
              <textarea
                value={feedbackModal.feedback}
                onChange={e => setFeedbackModal({ ...feedbackModal, feedback: e.target.value })}
                placeholder="e.g. Please provide a clear screenshot of the published review showing your name and rating."
                required
                rows={4}
                className="apple-form-control"
                style={{ resize: 'vertical', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFeedbackModal({ isOpen: false, reviewId: null, feedback: '' })}
                  className="apple-btn apple-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="apple-btn apple-btn-primary">
                  Send Feedback
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
