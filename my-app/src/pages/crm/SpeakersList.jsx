import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Search, Plus, ExternalLink, Filter, User, Building, PhoneCall, Tag, Calendar, CheckCircle2, Clock } from 'lucide-react';

export default function SpeakersList({ user }) {
  const navigate = useNavigate();

  const [speakers, setSpeakers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');

  if (!user) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>Loading user details...</div>;
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Teams/Companies
      const { data: companiesData } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      setCompanies(companiesData || []);

      // 2. Fetch Speakers
      const { data: speakersData, error } = await supabase
        .schema('speakers_crm')
        .from('speakers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (speakersData && speakersData.length > 0) {
        // Fetch Profiles, Teams, and Sub-statuses to enrich
        const [{ data: profs }, { data: subStats }] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name, email'),
          supabase.schema('speakers_crm').from('sub_statuses').select('id, name'),
        ]);

        const profMap = (profs || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
        const teamMap = (companiesData || []).reduce((acc, t) => ({ ...acc, [t.id]: t }), {});
        const subMap = (subStats || []).reduce((acc, s) => ({ ...acc, [s.id]: s }), {});

        const enriched = speakersData.map((sp) => ({
          ...sp,
          owner: profMap[sp.owner_user_id] || null,
          company: teamMap[sp.connected_from_company_id] || null,
          sub_status: subMap[sp.sub_status_id] || null,
        }));

        setSpeakers(enriched);
      } else {
        setSpeakers([]);
      }
    } catch (err) {
      console.error('Error fetching CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSpeakers = speakers.filter((sp) => {
    const matchesSearch =
      sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sp.email && sp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sp.social_profile_link && sp.social_profile_link.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || sp.status === statusFilter;
    const matchesCompany = companyFilter === 'ALL' || sp.connected_from_company_id === companyFilter;

    return matchesSearch && matchesStatus && matchesCompany;
  });

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Registered':
      case 'Closed-Won':
        return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      case 'Payment Pending':
      case 'Call Booked':
        return { bg: '#fef9c3', color: '#a16207', border: '#fef08a' };
      case 'Responded':
        return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Closed-Lost':
        return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div className="crm-page" style={{ width: '100%', paddingBottom: '60px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.5px', margin: 0, color: '#0f172a' }}>
            Speakers CRM
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Manage lead invitations, responses, calls, packages & registrations.
          </p>
        </div>

        <button
          onClick={() => navigate('/crm/speakers/new')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #0071e3 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 20px',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 113, 227, 0.3)',
          }}
        >
          <Plus size={18} /> Add New Speaker
        </button>
      </div>

      {/* Controls Bar: Search & Filters */}
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '18px 22px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          boxSizing: 'border-box',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '240px' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
          />
          <input
            type="text"
            placeholder="Search by name, email, or profile link..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 42px',
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              color: '#0f172a',
              fontSize: '0.92rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter Group */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} style={{ color: '#64748b' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Not Responded">Not Responded</option>
              <option value="Responded">Responded</option>
              <option value="Call Booked">Call Booked</option>
              <option value="Payment Pending">Payment Pending</option>
              <option value="Registered">Registered</option>
              <option value="Closed-Won">Closed-Won</option>
              <option value="Closed-Lost">Closed-Lost</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={16} style={{ color: '#64748b' }} />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              style={{
                background: '#ffffff',
                color: '#0f172a',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            >
              <option value="ALL">All Connecting Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Speakers Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          Loading speakers CRM database...
        </div>
      ) : filteredSpeakers.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '2px dashed #cbd5e1',
          }}
        >
          <User size={40} style={{ color: '#94a3b8', marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#1e293b' }}>No speakers found</h3>
          <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.9rem' }}>
            {searchTerm || statusFilter !== 'ALL' || companyFilter !== 'ALL'
              ? 'Try adjusting your search or filters.'
              : 'Click "Add New Speaker" to create your first record.'}
          </p>
          <button
            onClick={() => navigate('/crm/speakers/new')}
            style={{
              background: '#0071e3',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Add New Speaker Lead
          </button>
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#475569', fontWeight: '700' }}>Speaker</th>
                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#475569', fontWeight: '700' }}>Connected From</th>
                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#475569', fontWeight: '700' }}>Mode / Source</th>
                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#475569', fontWeight: '700' }}>Status & Stage</th>
                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#475569', fontWeight: '700' }}>Owner</th>
                <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#475569', fontWeight: '700' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpeakers.map((sp) => {
                const badge = getStatusBadgeColor(sp.status);
                const isOwner = sp.owner_user_id === user?.id;
                const ownerName = sp.owner
                  ? `${sp.owner.first_name || ''} ${sp.owner.last_name || ''}`.trim() || sp.owner.email
                  : 'Unknown Owner';

                const speakerSlug = sp.slug || (sp.name ? sp.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-') : sp.id);

                return (
                  <tr
                    key={sp.id}
                    onClick={() => navigate(`/crm/speakers/${speakerSlug}`)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.98rem' }}>{sp.name}</div>
                      <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '2px' }}>
                        {sp.email || 'No email added'}
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px', color: '#334155', fontSize: '0.9rem' }}>
                      {sp.company?.name ? (
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#334155',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.82rem',
                            fontWeight: '600',
                          }}
                        >
                          {sp.company.name}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>N/A</span>
                      )}
                    </td>

                    <td style={{ padding: '16px 20px', color: '#475569', fontSize: '0.88rem', fontWeight: '500' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: sp.attendance_mode === 'Virtual' ? '#f3e8ff' : '#eff6ff',
                          color: sp.attendance_mode === 'Virtual' ? '#7c3aed' : '#2563eb',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          marginBottom: '4px',
                        }}
                      >
                        {sp.attendance_mode || 'In-Person'}
                      </span>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{sp.source}</div>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {sp.status}
                        </span>
                        {sp.status === 'Not Responded' && (
                          <span style={{ color: '#0284c7', fontSize: '0.75rem', fontWeight: '700' }}>
                            Follow-up {sp.followup_count || 0}/5
                          </span>
                        )}
                        {sp.sub_status?.name && (
                          <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: '500' }}>
                            ↳ {sp.sub_status.name}
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.88rem', color: isOwner ? '#2563eb' : '#475569', fontWeight: isOwner ? '700' : '500' }}>
                          {isOwner ? 'You' : ownerName}
                        </span>
                        {isOwner && (
                          <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bfdbfe', fontWeight: '600' }}>
                            Owner
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/crm/speakers/${speakerSlug}`);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#0071e3',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                        }}
                      >
                        View <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
