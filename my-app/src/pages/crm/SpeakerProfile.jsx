import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import {
  ArrowLeft,
  User,
  Building,
  Mail,
  Phone,
  Link as LinkIcon,
  PhoneCall,
  Calendar,
  DollarSign,
  Lock,
  CheckCircle2,
  Clock,
  MessageSquare,
  Package as PackageIcon,
  Ticket,
  FileText,
  AlertTriangle,
  Send,
  Plus,
  Save,
  CheckSquare,
  Square,
  Trash2,
  UserCheck
} from 'lucide-react';

export default function SpeakerProfile({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [speaker, setSpeaker] = useState(null);
  const [salesExecs, setSalesExecs] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [subStatuses, setSubStatuses] = useState([]);
  const [packages, setPackages] = useState([]);
  const [calls, setCalls] = useState([]);
  const [registration, setRegistration] = useState(null);
  const [deliverables, setDeliverables] = useState([]);
  const [timeline, setTimeline] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Admin Reassign State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState('');
  const [reassigning, setReassigning] = useState(false);

  // New Deliverable State
  const [newDeliverableName, setNewDeliverableName] = useState('');

  // Call form state
  const [newCall, setNewCall] = useState({
    call_date: '',
    call_status: 'Completed',
    outcome_notes: '',
    payment_deadline: '',
    sales_executive_id: '',
    requested_assets: [],
  });

  // Package & Financials state
  const [finState, setFinState] = useState({
    package_id: '',
    total_amount: 0,
    amount_paid: 0,
    expected_payment_date: '',
    invoice_shared_date: '',
  });

  useEffect(() => {
    fetchSpeakerDetails();
  }, [id]);

  const fetchSpeakerDetails = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [compRes, subRes, pkgRes, profsRes, execsRes] = await Promise.all([
        supabase.from('teams').select('id, name').order('name').then((r) => r.data || []).catch(() => []),
        supabase.schema('speakers_crm').from('sub_statuses').select('*').then((r) => r.data || []).catch(() => []),
        supabase.schema('speakers_crm').from('packages').select('*').then((r) => r.data || []).catch(() => []),
        supabase.from('profiles').select('id, first_name, last_name, email, platform_role').then((r) => r.data || []).catch(() => []),
        supabase.schema('speakers_crm').from('sales_executives').select('*').order('name').then((r) => r.data || []).catch(() => []),
      ]);

      setCompanies(compRes);
      setSubStatuses(subRes);
      setPackages(pkgRes);
      setProfiles(profsRes);
      setSalesExecs(execsRes);

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      let spData = null;
      let spErr = null;

      if (isUUID) {
        const res = await supabase
          .schema('speakers_crm')
          .from('speakers')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        spData = res.data;
        spErr = res.error;
      } else {
        const res = await supabase
          .schema('speakers_crm')
          .from('speakers')
          .select('*')
          .eq('slug', id)
          .maybeSingle();
        spData = res.data;
        spErr = res.error;

        if (!spData) {
          const rawName = decodeURIComponent(id).replace(/-/g, ' ');
          const fallbackRes = await supabase
            .schema('speakers_crm')
            .from('speakers')
            .select('*')
            .ilike('name', `%${rawName}%`)
            .limit(1)
            .maybeSingle();
          spData = fallbackRes.data;
          spErr = fallbackRes.error;
        }
      }

      if (spErr || !spData) {
        console.error('Speaker fetch error:', spErr);
        if (!silent) setSpeaker(null);
        if (!silent) setLoading(false);
        return;
      }

      const speakerId = spData.id;

      // Enrich speaker record with Owner, Company (Team), and Sub-status
      let owner = null;
      if (spData.owner_user_id) {
        const { data: oData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, platform_role')
          .eq('id', spData.owner_user_id)
          .maybeSingle();
        owner = oData;
      }

      let company = null;
      if (spData.connected_from_company_id) {
        const { data: cData } = await supabase
          .from('teams')
          .select('id, name')
          .eq('id', spData.connected_from_company_id)
          .maybeSingle();
        company = cData;
      }

      let sub_status = null;
      if (spData.sub_status_id) {
        const { data: sData } = await supabase
          .schema('speakers_crm')
          .from('sub_statuses')
          .select('*')
          .eq('id', spData.sub_status_id)
          .maybeSingle();
        sub_status = sData;
      }

      setSpeaker({
        ...spData,
        owner,
        company,
        sub_status,
      });

      if (spData.payment_deadline) {
        const formattedDeadline = new Date(spData.payment_deadline).toISOString().split('T')[0];
        setNewCall((prev) => ({ ...prev, payment_deadline: formattedDeadline }));
      }

      const { data: callsData } = await supabase
        .schema('speakers_crm')
        .from('calls')
        .select('*')
        .eq('speaker_id', speakerId)
        .order('created_at', { ascending: false })
        .then((r) => r)
        .catch(() => ({ data: [] }));
      setCalls(callsData || []);

      const { data: regData } = await supabase
        .schema('speakers_crm')
        .from('registrations')
        .select('*')
        .eq('speaker_id', speakerId)
        .maybeSingle()
        .then((r) => r)
        .catch(() => ({ data: null }));

      if (regData) {
        setRegistration(regData);
        setFinState({
          package_id: regData.package_id || '',
          total_amount: regData.total_amount || 0,
          amount_paid: regData.amount_paid || 0,
          expected_payment_date: regData.expected_payment_date || '',
          invoice_shared_date: regData.invoice_shared_date || '',
        });

        // Fetch deliverables checklist safely
        const delivData = await supabase
          .schema('speakers_crm')
          .from('registration_deliverables')
          .select('*')
          .eq('registration_id', regData.id)
          .order('created_at', { ascending: true })
          .then((r) => r.data || [])
          .catch(() => []);
        setDeliverables(delivData);
      } else {
        setDeliverables([]);
      }

      const { data: tmData } = await supabase
        .schema('speakers_crm')
        .from('activity_timeline')
        .select('*')
        .eq('speaker_id', speakerId)
        .order('created_at', { ascending: false });
      setTimeline(tmData || []);

    } catch (err) {
      console.error('Error loading speaker profile:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const isAdmin = user?.platform_role === 'admin';
  const isOwner = speaker?.owner_user_id === user?.id || isAdmin;
  const ownerName = speaker?.owner
    ? `${speaker.owner.first_name || ''} ${speaker.owner.last_name || ''}`.trim() || speaker.owner.email
    : 'System User';

  const logActivity = async (actionType, description) => {
    try {
      if (!speaker?.id) return;
      const { error } = await supabase
        .schema('speakers_crm')
        .from('activity_timeline')
        .insert([{ speaker_id: speaker.id, action_type: actionType, description }]);
      if (!error) {
        fetchSpeakerDetails(true);
      }
    } catch (e) {
      console.error('Activity log error:', e);
    }
  };

  // OPTIMISTIC UPDATE WITH ROLLBACK ON WRITE FAILURE
  const handleUpdateSpeaker = async (updatedFields, actionMessage) => {
    if (!isOwner) return;
    
    // Store snapshot of previous state for rollback
    const previousSpeakerState = speaker;

    // Optimistically update React state immediately
    setSpeaker((prev) => (prev ? { ...prev, ...updatedFields } : prev));
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .schema('speakers_crm')
        .from('speakers')
        .update({ ...updatedFields, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Speaker profile updated successfully!' });
      if (actionMessage) {
        logActivity('Profile Updated', actionMessage);
      } else {
        fetchSpeakerDetails(true);
      }
    } catch (err) {
      // ROLLBACK ON FAILURE
      console.error('Update failed, rolling back:', err);
      setSpeaker(previousSpeakerState);
      setMessage({ type: 'error', text: `Failed to update: ${err.message}` });
    }
  };

  const handleReassignOwner = async () => {
    if (!selectedNewOwner || !speaker) return;
    setReassigning(true);
    try {
      const { data, error } = await supabase.rpc('reassign_speaker_owner', {
        p_speaker_id: speaker.id,
        p_new_owner_id: selectedNewOwner,
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Speaker owner successfully reassigned!' });
      setShowReassignModal(false);
      fetchSpeakerDetails(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to reassign owner.' });
    } finally {
      setReassigning(false);
    }
  };

  const handleLogFollowup = async () => {
    if (!isOwner || !speaker) return;
    const currentCount = speaker.followup_count || 0;
    if (currentCount >= 5) {
      setMessage({ type: 'error', text: 'Maximum limit of 5 follow-ups reached for this speaker.' });
      return;
    }
    const nextCount = currentCount + 1;
    const targetSubName = `Follow-up ${nextCount}`;
    const matchingSub = subStatuses.find((s) => s.name === targetSubName && (s.parent_status === 'Not Responded' || !s.parent_status));

    const updates = {
      followup_count: nextCount,
      sub_status_id: matchingSub ? matchingSub.id : speaker.sub_status_id,
    };

    await handleUpdateSpeaker(
      updates,
      `Follow-up #${nextCount} sent to speaker.`
    );
  };

  const handleAddCall = async (e) => {
    e.preventDefault();
    if (!isOwner || !speaker) return;
    setSaving(true);

    try {
      const deadlineVal = newCall.payment_deadline
        ? new Date(newCall.payment_deadline).toISOString()
        : (speaker.payment_deadline || null);

      const assetsList = newCall.requested_assets || [];
      const assetString = assetsList.length > 0
        ? `\n[Requested Details: ${assetsList.join(', ')}]`
        : '';

      const fullNotes = `${newCall.outcome_notes || 'Call completed'}${assetString}`;

      const { error } = await supabase
        .schema('speakers_crm')
        .from('calls')
        .insert([{
          speaker_id: speaker.id,
          sales_executive_id: newCall.sales_executive_id || null,
          call_date: newCall.call_date ? new Date(newCall.call_date).toISOString() : new Date().toISOString(),
          outcome_notes: fullNotes,
          payment_deadline: deadlineVal,
        }]);

      if (error) throw error;

      // Also sync payment_deadline back to speaker record if set
      if (newCall.payment_deadline) {
        await supabase
          .schema('speakers_crm')
          .from('speakers')
          .update({ payment_deadline: deadlineVal, updated_at: new Date().toISOString() })
          .eq('id', speaker.id);
      }

      const selExec = salesExecs.find((s) => s.id === newCall.sales_executive_id);
      logActivity(
        'Call Logged',
        `Call (${newCall.call_status || 'Completed'}) logged by ${selExec?.name || 'Executive'}: "${fullNotes}"`
      );

      setNewCall({
        call_date: '',
        call_status: 'Completed',
        outcome_notes: '',
        payment_deadline: speaker.payment_deadline ? new Date(speaker.payment_deadline).toISOString().split('T')[0] : '',
        sales_executive_id: '',
        requested_assets: [],
      });
      setMessage({ type: 'success', text: 'Call details and requested actionables recorded!' });
      fetchSpeakerDetails(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to log call.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFinancials = async (e) => {
    e.preventDefault();
    if (!isOwner || !speaker) return;
    setSaving(true);

    try {
      const selectedPkg = packages.find((p) => p.id === finState.package_id);
      const attMode = selectedPkg?.type || speaker.attendance_mode || 'In-Person';

      const payload = {
        speaker_id: speaker.id,
        package_id: finState.package_id || null,
        total_amount: parseFloat(finState.total_amount) || 0,
        amount_paid: parseFloat(finState.amount_paid) || 0,
        expected_payment_date: finState.expected_payment_date || null,
        invoice_shared_date: finState.invoice_shared_date || null,
        attendance_mode: attMode,
        updated_at: new Date().toISOString(),
      };

      let regId = registration?.id;
      let error;

      if (regId) {
        ({ error } = await supabase
          .schema('speakers_crm')
          .from('registrations')
          .update(payload)
          .eq('id', regId));
      } else {
        const { data: newReg, error: insErr } = await supabase
          .schema('speakers_crm')
          .from('registrations')
          .insert([payload])
          .select()
          .single();
        error = insErr;
        regId = newReg?.id;
      }

      if (error) throw error;

      // Update attendance_mode on speaker record as well
      await supabase
        .schema('speakers_crm')
        .from('speakers')
        .update({ attendance_mode: attMode, updated_at: new Date().toISOString() })
        .eq('id', speaker.id);

      // Trigger deterministic registration status sync RPC
      await supabase.rpc('sync_speaker_status_from_registration', { p_speaker_id: speaker.id });

      const isRegistered = payload.amount_paid > 0;
      logActivity(
        'Financials Updated',
        `Package: ${selectedPkg?.name || 'Custom'} (${attMode}). Paid $${payload.amount_paid} of $${payload.total_amount}.${isRegistered ? ' Speaker Successfully Registered!' : ''}`
      );

      setMessage({ type: 'success', text: `Package & Registration saved! ${isRegistered ? 'Speaker is officially Registered (' + attMode + ').' : ''}` });
      fetchSpeakerDetails(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save financials.' });
    } finally {
      setSaving(false);
    }
  };

  // DELIVERABLES CHECKLIST HANDLERS
  const handleAddDeliverable = async (e) => {
    e.preventDefault();
    if (!newDeliverableName.trim() || !registration) return;

    try {
      const { error } = await supabase
        .schema('speakers_crm')
        .from('registration_deliverables')
        .insert([{
          registration_id: registration.id,
          deliverable_name: newDeliverableName.trim(),
          is_completed: false,
        }]);

      if (error) throw error;

      setNewDeliverableName('');
      logActivity('Deliverable Added', `Added deliverable requirement: "${newDeliverableName.trim()}"`);
      fetchSpeakerDetails(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to add deliverable.' });
    }
  };

  const handleToggleDeliverable = async (delivId, currentStatus) => {
    if (!isOwner) return;
    try {
      const { error } = await supabase
        .schema('speakers_crm')
        .from('registration_deliverables')
        .update({ is_completed: !currentStatus })
        .eq('id', delivId);

      if (error) throw error;

      logActivity('Deliverable Updated', `Toggled deliverable status to ${!currentStatus ? 'Completed' : 'Pending'}`);
      fetchSpeakerDetails(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update deliverable.' });
    }
  };

  if (loading) {
    return <div style={{ color: '#64748b', padding: '60px 0', textAlign: 'center' }}>Loading speaker profile...</div>;
  }

  if (!speaker) {
    return (
      <div style={{ color: '#dc2626', padding: '60px 0', textAlign: 'center' }}>
        Speaker record not found.
      </div>
    );
  }

  const progressSteps = [
    { label: 'Lead Discovered', key: 'Lead' },
    { label: 'Invitation Sent', key: 'Not Responded' },
    { label: 'Responded', key: 'Responded' },
    { label: 'Call Booked', key: 'Call Booked' },
    { label: 'Payment Pending', key: 'Payment Pending' },
    { label: 'Registered / Closed', key: 'Registered' },
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'Not Responded': return 1;
      case 'Responded': return 2;
      case 'Call Booked': return 3;
      case 'Payment Pending': return 4;
      case 'Registered':
      case 'Closed-Won': return 5;
      case 'Closed-Lost': return 1;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(speaker.status);

  const statusRankMap = {
    'Not Responded': 1,
    'Responded': 2,
    'Call Booked': 3,
    'Payment Pending': 4,
    'Registered': 5,
    'Closed-Won': 6,
    'Closed-Lost': 0,
  };

  const currentRank = statusRankMap[speaker.status] || 1;
  const isCallUnlocked = currentRank >= 2 || currentRank === 0;
  const isFinancialsUnlocked = currentRank >= 3 || currentRank === 0;
  const isDeliverablesUnlocked = registration && (currentRank >= 4 || currentRank === 0);

  const remainingBalance = Math.max(0, (Number(finState.total_amount) || 0) - (Number(finState.amount_paid) || 0));

  // Filter sub-statuses strictly scoped by parent_status
  const scopedSubStatuses = subStatuses.filter(
    (s) => !s.parent_status || s.parent_status === speaker.status
  );

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: '#ffffff',
    border: '1.5px solid #cbd5e1',
    borderRadius: '8px',
    color: '#0f172a',
    fontSize: '0.92rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '6px',
  };

  if (!user) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>Loading user details...</div>;
  }

  return (
    <div className="crm-page" style={{ width: '100%', paddingBottom: '80px' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/crm/speakers')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'transparent',
          border: 'none',
          color: '#475569',
          cursor: 'pointer',
          marginBottom: '20px',
          fontSize: '0.92rem',
          fontWeight: '600',
        }}
      >
        <ArrowLeft size={18} /> Back to Speakers CRM
      </button>

      {/* Ownership Identity Banner */}
      <div
        style={{
          background: isOwner ? '#eff6ff' : '#fef2f2',
          border: isOwner ? '1px solid #bfdbfe' : '1px solid #fecaca',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <User size={20} style={{ color: isOwner ? '#2563eb' : '#dc2626' }} />
          <div>
            <div style={{ fontSize: '0.9rem', color: isOwner ? '#1e40af' : '#991b1b', fontWeight: '700' }}>
              Owner: <span>{ownerName}</span> {isAdmin && <span style={{ color: '#d97706', fontSize: '0.78rem' }}>(Admin Override)</span>}
            </div>
            <div style={{ fontSize: '0.82rem', color: isOwner ? '#3b82f6' : '#ef4444', marginTop: '2px' }}>
              {isOwner
                ? 'Editing rights enabled.'
                : 'Read-Only Mode: You can view details, but only the profile owner or admin can edit.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAdmin && (
            <button
              onClick={() => setShowReassignModal(true)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <UserCheck size={14} /> Reassign Owner
            </button>
          )}

          {!isOwner && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#fee2e2',
                color: '#991b1b',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: '700',
              }}
            >
              <Lock size={14} /> Read-Only
            </span>
          )}
        </div>
      </div>

      {/* Main Header Ticket Card */}
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '28px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>
                {speaker.name}
              </h1>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '12px', color: '#475569', fontSize: '0.92rem' }}>
              {speaker.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                  <Mail size={16} style={{ color: '#0071e3' }} /> {speaker.email}
                </div>
              )}
              {speaker.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                  <Phone size={16} style={{ color: '#0071e3' }} /> {speaker.phone}
                </div>
              )}
              {speaker.company?.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                  <Building size={16} style={{ color: '#0071e3' }} /> Connected via: <strong>{speaker.company.name}</strong>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                <Ticket size={16} style={{ color: '#0071e3' }} /> Mode: <strong style={{ color: speaker.attendance_mode === 'Virtual' ? '#7c3aed' : '#2563eb' }}>{speaker.attendance_mode || 'In-Person'}</strong>
              </div>
              {speaker.payment_deadline && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: '#d97706' }}>
                  <Clock size={16} /> Payment Deadline: {new Date(speaker.payment_deadline).toLocaleDateString()}
                </div>
              )}
              {speaker.social_profile_link && (
                <a
                  href={speaker.social_profile_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#0071e3', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                >
                  <LinkIcon size={14} /> Social Profile
                </a>
              )}
            </div>

            {registration && registration.amount_paid > 0 && (
              <div style={{ marginTop: '16px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={22} style={{ color: '#16a34a' }} />
                <div>
                  <div style={{ color: '#15803d', fontWeight: '800', fontSize: '0.95rem' }}>
                    🎉 Successfully Registered ({speaker.attendance_mode || 'In-Person'})
                  </div>
                  <div style={{ color: '#166534', fontSize: '0.82rem', marginTop: '2px' }}>
                    Amount Paid: <strong>${registration.amount_paid}</strong> of ${registration.total_amount} | Balance: ${Math.max(0, registration.total_amount - registration.amount_paid)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Milestone Tracker */}
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px dashed #e2e8f0' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', marginBottom: '16px', letterSpacing: '0.5px' }}>
            SPEAKER ONBOARDING & REGISTRATION TRACKER
          </div>

          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              position: 'relative',
              padding: '0 10px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '30px',
                right: '30px',
                height: '4px',
                background: '#e2e8f0',
                zIndex: 1,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '30px',
                width: `${(currentStepIdx / (progressSteps.length - 1)) * 90}%`,
                height: '4px',
                background: 'linear-gradient(90deg, #0071e3 0%, #16a34a 100%)',
                zIndex: 2,
                transition: 'width 0.4s ease',
              }}
            />

            {progressSteps.map((step, idx) => {
              const isCompleted = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div
                  key={step.key}
                  style={{
                    position: 'relative',
                    zIndex: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isCompleted || isCurrent ? '#0071e3' : '#ffffff',
                      border: isCurrent
                        ? '3px solid #2563eb'
                        : isCompleted
                        ? '2px solid #0071e3'
                        : '2px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCompleted || isCurrent ? '#ffffff' : '#64748b',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      boxShadow: isCurrent ? '0 0 12px rgba(37, 99, 235, 0.4)' : 'none',
                    }}
                  >
                    {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: isCurrent ? '700' : '500',
                      color: isCurrent ? '#2563eb' : isCompleted ? '#1e293b' : '#64748b',
                      textAlign: 'center',
                      maxWidth: '90px',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {message.text && (
        <div
          style={{
            background: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: message.type === 'error' ? '#dc2626' : '#16a34a',
            border: message.type === 'error' ? '1px solid #fecaca' : '1px solid #bbf7d0',
            padding: '14px 18px',
            borderRadius: '12px',
            marginBottom: '24px',
            fontSize: '0.92rem',
            fontWeight: '600',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Grid Layout: Controls & Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '24px' }}>
        {/* Left Column: Editable Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section 1: Status & Notes */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '0 0 18px 0', color: '#0f172a' }}>
              1. Outreach, Invitation & Speaker Response (Stage 1 & 2)
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Main Status (Pipeline Protected)</label>
                <select
                  disabled={!isOwner}
                  value={speaker.status}
                  onChange={(e) => handleUpdateSpeaker({ status: e.target.value }, `Main status updated to ${e.target.value}`)}
                  style={inputStyle}
                >
                  <option value="Not Responded">Not Responded (Stage 1)</option>
                  <option value="Responded">Responded (Stage 2)</option>
                  <option value="Call Booked">Call Booked (Stage 3)</option>
                  <option value="Payment Pending">Payment Pending (Stage 4)</option>
                  <option value="Registered">Registered (Stage 4)</option>
                  <option value="Closed-Won">Closed-Won</option>
                  <option value="Closed-Lost">Closed-Lost (Terminal)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Dynamic Sub-Status (Scoped to Status)</label>
                <select
                  disabled={!isOwner}
                  value={speaker.sub_status_id || ''}
                  onChange={(e) => {
                    const sel = subStatuses.find((s) => s.id === e.target.value);
                    handleUpdateSpeaker(
                      { sub_status_id: e.target.value || null },
                      `Sub-status updated to "${sel?.name || 'None'}"`
                    );
                  }}
                  style={inputStyle}
                >
                  <option value="">No Sub-Status Selected</option>
                  {scopedSubStatuses.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stage 1 Follow-up Action Tracker */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>
                    Stage 1 Follow-up Sent Tracker:
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: '800', marginLeft: '8px' }}>
                    {speaker.followup_count || 0} of 5 Follow-ups
                  </span>
                </div>
                {isOwner && speaker.status === 'Not Responded' && (speaker.followup_count || 0) < 5 && (
                  <button
                    type="button"
                    onClick={handleLogFollowup}
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    + Log Follow-up #{(speaker.followup_count || 0) + 1}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSent = (speaker.followup_count || 0) >= num;
                  return (
                    <div
                      key={num}
                      style={{
                        flex: 1,
                        height: '6px',
                        borderRadius: '3px',
                        background: isSent ? '#0284c7' : '#cbd5e1',
                        transition: 'background 0.3s ease',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Stage 2 Response Outcome & Pre-Call Deadline */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Speaker Response Outcome (Stage 2)</label>
                <select
                  disabled={!isOwner}
                  value={speaker.speaker_outcome || ''}
                  onChange={(e) =>
                    handleUpdateSpeaker(
                      { speaker_outcome: e.target.value },
                      `Speaker outcome set to "${e.target.value}".`
                    )
                  }
                  style={inputStyle}
                >
                  <option value="">Select Response Outcome</option>
                  <option value="Interested">Interested Speaker</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Paid Speaker">Paid Speaker (Demands Fee)</option>
                  <option value="Doubts / Need Call">Doubts / Schedule Call</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Pre-Call Payment Deadline Date</label>
                <input
                  type="date"
                  disabled={!isOwner}
                  value={speaker.payment_deadline ? new Date(speaker.payment_deadline).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                    handleUpdateSpeaker({ payment_deadline: val }, `Set pre-call payment deadline to ${e.target.value || 'None'}.`);
                  }}
                  style={inputStyle}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  If set in Stage 2 (Interested), carries over automatically into Stage 3 Call Booked.
                </span>
              </div>
            </div>

            {/* Stage 2 Doubts / Booking Call helper box */}
            {speaker.speaker_outcome === 'Doubts / Need Call' && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1e40af', marginBottom: '6px' }}>
                  📞 Speaker has doubts or requested a discussion call:
                </div>
                <p style={{ fontSize: '0.82rem', color: '#1e3a8a', margin: '0 0 10px 0' }}>
                  Share available booking slots link with speaker. When a slot is booked, select one of your sales executives in Section 2 below.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + '/crm/speakers/' + speaker.id);
                    setMessage({ type: 'success', text: 'Speaker profile & booking link copied to clipboard!' });
                  }}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  📋 Copy Speaker Booking Link
                </button>
              </div>
            )}

            {speaker.status !== 'Not Responded' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Conversation Notes</label>
                <textarea
                  disabled={!isOwner}
                  rows={3}
                  defaultValue={speaker.notes || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (speaker.notes || '')) {
                      handleUpdateSpeaker({ notes: e.target.value }, 'Updated conversation notes.');
                    }
                  }}
                  placeholder="Log chat responses, custom quotes, or speaker feedback..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            )}
          </div>

          {/* Section 2: Call Booking & Executive Logs */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: '#0f172a' }}>
                2. Call Booking & Executive Outcome (Stage 3)
              </h2>
              {!isCallUnlocked && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '700' }}>
                  <Lock size={14} /> Stage Locked
                </span>
              )}
            </div>

            {!isCallUnlocked ? (
              <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '12px', padding: '16px', color: '#873800', fontSize: '0.9rem', fontWeight: '600' }}>
                🔒 Update speaker status to <strong>"Responded"</strong> or <strong>"Call Booked"</strong> in Section 1 to unlock Call Booking logs.
              </div>
            ) : (
              <>
                {/* Inherited Deadline Notification Banner */}
                {speaker.payment_deadline ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '0.88rem', color: '#166534', fontWeight: '600' }}>
                    ℹ️ Inherited Payment Deadline from Stage 2: <strong>{new Date(speaker.payment_deadline).toLocaleDateString()}</strong>. You don't have to enter deadline again unless changing it.
                  </div>
                ) : (
                  <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '0.88rem', color: '#b45309', fontWeight: '600' }}>
                    ⚠️ No deadline was set in Stage 2. Please set post-call payment deadline below.
                  </div>
                )}

                {calls.length > 0 && (
                  <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {calls.map((c) => {
                      const exec = salesExecs.find((s) => s.id === c.sales_executive_id);
                      return (
                        <div
                          key={c.id}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '14px 16px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', fontWeight: '600', flexWrap: 'wrap', gap: '8px' }}>
                            <span>
                              <Calendar size={14} inline /> {new Date(c.call_date).toLocaleDateString()} ({c.call_status || 'Completed'}) — Executive: <strong>{exec?.name || 'Assigned Executive'}</strong>
                            </span>
                            {c.payment_deadline && (
                              <span style={{ color: '#d97706' }}>
                                Deadline: {new Date(c.payment_deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '8px 0 0 0', color: '#1e293b', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
                            {c.outcome_notes || 'No call notes entered.'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isOwner && (
                  <form onSubmit={handleAddCall} style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: '#0071e3', fontWeight: '700' }}>Log New Executive Call Outcome</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#475569', fontWeight: '600', marginBottom: '4px' }}>Sales Executive</label>
                        <select
                          value={newCall.sales_executive_id}
                          onChange={(e) => setNewCall({ ...newCall, sales_executive_id: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="">Select Sales Executive</option>
                          {salesExecs.map((exec) => (
                            <option key={exec.id} value={exec.id}>
                              {exec.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#475569', fontWeight: '600', marginBottom: '4px' }}>Call Status</label>
                        <select
                          value={newCall.call_status}
                          onChange={(e) => setNewCall({ ...newCall, call_status: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="Completed">Call Completed</option>
                          <option value="Scheduled">Call Scheduled</option>
                          <option value="Rescheduled">Call Rescheduled</option>
                          <option value="Cancelled">Call Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#475569', fontWeight: '600', marginBottom: '4px' }}>Call Date & Time</label>
                        <input
                          type="datetime-local"
                          value={newCall.call_date}
                          onChange={(e) => setNewCall({ ...newCall, call_date: e.target.value })}
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: '#475569', fontWeight: '600', marginBottom: '4px' }}>Payment Deadline Date</label>
                        <input
                          type="date"
                          value={newCall.payment_deadline}
                          onChange={(e) => setNewCall({ ...newCall, payment_deadline: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </div>

                    {/* Requested Assets Checklist */}
                    <div style={{ marginBottom: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.84rem', color: '#1e293b', fontWeight: '700', marginBottom: '8px' }}>
                        Actionables / Requested Details by Speaker:
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                        {[
                          '📷 Past Conference Gallery',
                          '📊 Keynote Presentation Deck',
                          '📄 Event Brochure & Agenda',
                          '💰 Custom Pricing / Sponsorship Deck',
                          '📌 Detailed Technical Q&A Info',
                        ].map((item) => {
                          const isChecked = (newCall.requested_assets || []).includes(item);
                          return (
                            <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewCall({ ...newCall, requested_assets: [...(newCall.requested_assets || []), item] });
                                  } else {
                                    setNewCall({ ...newCall, requested_assets: (newCall.requested_assets || []).filter((a) => a !== item) });
                                  }
                                }}
                                style={{ accentColor: '#0071e3' }}
                              />
                              {item}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: '#475569', fontWeight: '600', marginBottom: '4px' }}>Executive Call Notes & Actionables</label>
                      <textarea
                        rows={2}
                        placeholder="Log speaker doubts answered, customized terms offered, follow-up actions..."
                        value={newCall.outcome_notes}
                        onChange={(e) => setNewCall({ ...newCall, outcome_notes: e.target.value })}
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        background: '#0071e3',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 18px',
                        fontSize: '0.88rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Log Call Record & Actionables
                    </button>
                  </form>
                )}
              </>
            )}
          </div>

          {/* Section 3: Package Selection & Payment Registration */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: '#0f172a' }}>
                3. Package Selection & Payment Registration (Stage 4)
              </h2>
              {!isFinancialsUnlocked && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '700' }}>
                  <Lock size={14} /> Stage Locked
                </span>
              )}
            </div>

            {!isFinancialsUnlocked ? (
              <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '12px', padding: '16px', color: '#873800', fontSize: '0.9rem', fontWeight: '600' }}>
                🔒 Advance speaker status to <strong>"Call Booked"</strong> in Section 1 to unlock Package Selection & Payment Registration.
              </div>
            ) : (
              <form onSubmit={handleSaveFinancials} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {Number(finState.amount_paid) > 0 && (
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '12px', padding: '14px', color: '#166534', fontWeight: '700', fontSize: '0.92rem' }}>
                    🎉 Payment Received: ${finState.amount_paid} — Speaker is officially <strong>Successfully Registered</strong> as <u>{speaker.attendance_mode || 'In-Person'}</u>!
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Select Package</label>
                    <select
                      disabled={!isOwner}
                      value={finState.package_id}
                      onChange={(e) => {
                        const selectedPkg = packages.find((p) => p.id === e.target.value);
                        setFinState({
                          ...finState,
                          package_id: e.target.value,
                          total_amount: selectedPkg ? selectedPkg.price || selectedPkg.name : finState.total_amount,
                        });
                        if (selectedPkg?.type) {
                          handleUpdateSpeaker({ attendance_mode: selectedPkg.type }, `Set attendance mode to ${selectedPkg.type}`);
                        }
                      }}
                      style={inputStyle}
                    >
                      <option value="">Select Package</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} (${pkg.price || pkg.name}) - {pkg.type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Attendance Mode</label>
                    <select
                      disabled={!isOwner}
                      value={speaker.attendance_mode || 'In-Person'}
                      onChange={(e) => handleUpdateSpeaker({ attendance_mode: e.target.value }, `Updated attendance mode to ${e.target.value}`)}
                      style={inputStyle}
                    >
                      <option value="In-Person">In-Person Attendance</option>
                      <option value="Virtual">Virtual Attendance</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Total Package Price ($)</label>
                    <input
                      type="number"
                      disabled={!isOwner}
                      value={finState.total_amount}
                      onChange={(e) => setFinState({ ...finState, total_amount: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Amount Paid ($)</label>
                    <input
                      type="number"
                      disabled={!isOwner}
                      value={finState.amount_paid}
                      onChange={(e) => setFinState({ ...finState, amount_paid: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Remaining Balance</label>
                    <div
                      style={{
                        padding: '10px 14px',
                        background: remainingBalance > 0 ? '#fef2f2' : '#f0fdf4',
                        border: remainingBalance > 0 ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                        borderRadius: '8px',
                        color: remainingBalance > 0 ? '#dc2626' : '#16a34a',
                        fontWeight: '800',
                        fontSize: '1rem',
                      }}
                    >
                      ${remainingBalance}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Expected Payment Settlement Date</label>
                    <input
                      type="date"
                      disabled={!isOwner}
                      value={finState.expected_payment_date}
                      onChange={(e) => setFinState({ ...finState, expected_payment_date: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Invoice Shared Date</label>
                    <input
                      type="date"
                      disabled={!isOwner}
                      value={finState.invoice_shared_date}
                      onChange={(e) => setFinState({ ...finState, invoice_shared_date: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {isOwner && (
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'linear-gradient(135deg, #0071e3 0%, #2563eb 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 22px',
                      fontSize: '0.92rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {saving ? 'Saving Financials...' : 'Save Package & Registration'}
                  </button>
                )}
              </form>
            )}
          </div>

          {/* Section 4: Deliverables Checklist Sub-Table */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={20} style={{ color: '#0071e3' }} /> 4. Deliverables Checklist
              </h2>
              {!isDeliverablesUnlocked && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '700' }}>
                  <Lock size={14} /> Stage Locked
                </span>
              )}
            </div>

            {!isDeliverablesUnlocked ? (
              <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '12px', padding: '16px', color: '#873800', fontSize: '0.9rem', fontWeight: '600' }}>
                🔒 Complete Package Selection & Payment Registration in Section 3 to unlock Deliverables Checklist.
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {deliverables.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '0.88rem' }}>No deliverables added to checklist yet.</div>
                  ) : (
                    deliverables.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleDeliverable(item.id, item.is_completed)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: item.is_completed ? '#f0fdf4' : '#f8fafc',
                          border: item.is_completed ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          cursor: isOwner ? 'pointer' : 'default',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {item.is_completed ? (
                            <CheckSquare size={18} style={{ color: '#16a34a' }} />
                          ) : (
                            <Square size={18} style={{ color: '#94a3b8' }} />
                          )}
                          <span
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: '600',
                              color: item.is_completed ? '#16a34a' : '#1e293b',
                              textDecoration: item.is_completed ? 'line-through' : 'none',
                            }}
                          >
                            {item.deliverable_name}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            color: item.is_completed ? '#15803d' : '#64748b',
                          }}
                        >
                          {item.is_completed ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {isOwner && (
                  <form onSubmit={handleAddDeliverable} style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="e.g. Press Release Interview, Trophy Plaque, Magazine Feature..."
                      value={newDeliverableName}
                      onChange={(e) => setNewDeliverableName(e.target.value)}
                      style={inputStyle}
                    />
                    <button
                      type="submit"
                      style={{
                        background: '#0071e3',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 18px',
                        fontSize: '0.88rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Add Deliverable
                    </button>
                  </form>
                )}
              </>
            )}
          </div>

        </div>

        {/* Right Column: Activity Timeline */}
        <div>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              position: 'sticky',
              top: '20px',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 18px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} style={{ color: '#0071e3' }} /> Activity Timeline
            </h3>

            {timeline.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.88rem', textAlign: 'center', padding: '20px 0' }}>
                No activities logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '8px',
                    bottom: '8px',
                    width: '2px',
                    background: '#e2e8f0',
                  }}
                />

                {timeline.map((act) => (
                  <div key={act.id} style={{ display: 'flex', gap: '14px', position: 'relative', zIndex: 2 }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: '2px solid #0071e3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0071e3' }} />
                    </div>

                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a' }}>{act.action_type}</div>
                      <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                        {act.description}
                      </p>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500' }}>
                        {new Date(act.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Reassign Owner Modal */}
      {showReassignModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1.2rem', color: '#0f172a' }}>
              Admin: Reassign Speaker Owner
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '16px' }}>
              Select a new profile owner for this speaker.
            </p>

            <select
              value={selectedNewOwner}
              onChange={(e) => setSelectedNewOwner(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select User Profile</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.email})
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => setShowReassignModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleReassignOwner}
                disabled={reassigning || !selectedNewOwner}
                style={{
                  background: '#0071e3',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {reassigning ? 'Reassigning...' : 'Confirm Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
