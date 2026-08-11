import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ArrowLeft, User, Mail, Phone, Link as LinkIcon, Building, Ticket, FileText, CheckCircle2, Save } from 'lucide-react';

export default function AddSpeaker({ user }) {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    social_profile_link: '',
    connected_from_company_id: '',
    source: 'LinkedIn',
    status: 'Not Responded',
    notes: '',
  });

  if (!user) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>Loading user details...</div>;
  }

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const { data } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      setCompanies(data || []);
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');

    try {
      if (!formData.name.trim()) {
        throw new Error('Speaker full name is required.');
      }

      const slugBase = formData.name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').replace(/^-+|-+$/g, '');
      const generatedSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;

      const speakerPayload = {
        name: formData.name.trim(),
        slug: generatedSlug,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        social_profile_link: formData.social_profile_link.trim() || null,
        connected_from_company_id: formData.connected_from_company_id || null,
        source: formData.source,
        status: formData.status,
        notes: formData.status !== 'Not Responded' ? (formData.notes.trim() || null) : null,
        owner_user_id: user.id,
      };

      const { data, error } = await supabase
        .schema('speakers_crm')
        .from('speakers')
        .insert([speakerPayload])
        .select();

      if (error) {
        if (error.code === '23505' || error.message.includes('unique')) {
          throw new Error('A speaker with this email address or social profile link already exists in the CRM.');
        }
        // If slug column doesn't exist yet in Supabase schema, retry without slug column
        if (error.message.includes('slug') || error.code === '42703') {
          delete speakerPayload.slug;
          const retryRes = await supabase.schema('speakers_crm').from('speakers').insert([speakerPayload]).select();
          if (retryRes.error) throw retryRes.error;
          const retrySpeaker = retryRes.data?.[0];
          if (retrySpeaker) {
            navigate(`/crm/speakers/${retrySpeaker.id}`);
            return;
          }
        }
        throw error;
      }

      const createdSpeaker = data?.[0];

      if (createdSpeaker) {
        await supabase
          .schema('speakers_crm')
          .from('activity_timeline')
          .insert([
            {
              speaker_id: createdSpeaker.id,
              action_type: 'Speaker Created',
              description: `Speaker profile created by ${user?.email || 'User'}.`,
            },
          ]);

        navigate(`/crm/speakers/${createdSpeaker.slug || createdSpeaker.id}`);
      } else {
        navigate('/crm/speakers');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create speaker profile.');
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: '#ffffff',
    border: '1.5px solid #cbd5e1',
    borderRadius: '10px',
    color: '#0f172a',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.88rem',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '6px',
  };

  return (
    <div className="crm-page" style={{ paddingBottom: '80px', width: '100%' }}>
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

      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>
          Add New Speaker Lead
        </h1>
        <p style={{ color: '#64748b', margin: '6px 0 0 0', fontSize: '1rem' }}>
          Fill in the details below to add a new speaker to the CRM. Duplicate email and social profile detection is active.
        </p>
      </div>

      {errorMessage && (
        <div
          style={{
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            padding: '14px 18px',
            borderRadius: '12px',
            marginBottom: '24px',
            fontSize: '0.95rem',
            fontWeight: '600',
          }}
        >
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Full-Width Form Card */}
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '36px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
          boxSizing: 'border-box',
        }}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Section 1: Basic Identity */}
          <div>
            <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={22} style={{ color: '#0071e3' }} /> Basic Profile Details
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>
                  Speaker Full Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sarah Jenkins"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    placeholder="sarah@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 019-2834"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Social Profile Link</label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.social_profile_link}
                    onChange={(e) => setFormData({ ...formData, social_profile_link: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Outreach & Lead Source */}
          <div>
            <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building size={22} style={{ color: '#0071e3' }} /> Outreach & Lead Source
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Connected From Company (Brand)</label>
                <select
                  value={formData.connected_from_company_id}
                  onChange={(e) => setFormData({ ...formData, connected_from_company_id: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Select Connecting Brand</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Lead Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  style={inputStyle}
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Ads">Ads</option>
                  <option value="Email">Email</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Initial Status & Context */}
          <div>
            <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={22} style={{ color: '#0071e3' }} /> Initial Status & Context
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Initial Main Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Not Responded">Not Responded (Invitation Sent)</option>
                  <option value="Responded">Responded (In Conversation)</option>
                  <option value="Call Booked">Call Booked</option>
                  <option value="Payment Pending">Payment Pending</option>
                  <option value="Registered">Registered</option>
                </select>
              </div>

              {formData.status !== 'Not Responded' && (
                <div>
                  <label style={labelStyle}>Initial Conversation Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Record speaker responses or initial conversation details..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', paddingTop: '16px', borderTop: '2px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={() => navigate('/crm/speakers')}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                borderRadius: '10px',
                padding: '12px 24px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #0071e3 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 28px',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 113, 227, 0.3)',
              }}
            >
              <Save size={18} /> {saving ? 'Creating Speaker Profile...' : 'Save & Open Speaker Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
