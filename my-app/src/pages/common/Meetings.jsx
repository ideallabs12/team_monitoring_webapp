import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Calendar, Clock, User, Mail, FileText, List, Link as LinkIcon, CheckCircle, AlignLeft } from 'lucide-react';

export default function Meetings({ user }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [activeSection, setActiveSection] = useState('summary');

  useEffect(() => {
    fetchMeetings();
  }, [selectedDate]);

  useEffect(() => {
    if (selectedMeeting) {
      setActiveSection('summary');
    }
  }, [selectedMeeting]);

  const fetchMeetings = async () => {
    setLoading(true);
    setSelectedMeeting(null);
    try {
      // Attempt to sync meetings for the selected date
      try {
        await supabase.functions.invoke('sync-fathom-date', {
          body: { date: selectedDate }
        });
      } catch (syncErr) {
        console.error('Error syncing Fathom meetings:', syncErr);
      }

      const { data, error } = await supabase
        .from('fathom_meetings')
        .select('*')
        .eq('meeting_date', selectedDate)
        .order('meeting_time', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const parseActionItems = (items) => {
    if (!items) return [];
    if (typeof items === 'string') {
      try { return JSON.parse(items); } catch(e) { return [items]; }
    }
    return Array.isArray(items) ? items : [items];
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    
    // Strip markdown formatting and Fathom's video timestamp links
    let cleanText = text
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      .replace(/\*\*/g, '') // Remove bold
      .replace(/^#+\s+/gim, '') // Remove headers
      .replace(/^\s+-\s/gim, '- '); // Fix spacing on list items

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {cleanText.split('\n').map((line, i) => {
          line = line.trim();
          if (!line) return null;
          
          const isListItem = line.startsWith('-');
          return (
            <div key={i} style={{ 
              marginLeft: isListItem ? '16px' : '0',
              fontWeight: (!isListItem && !line.includes(':') && line.length < 50) ? '600' : '400',
              color: (!isListItem && !line.includes(':') && line.length < 50) ? 'var(--apple-text-primary)' : 'inherit',
              marginTop: (!isListItem && !line.includes(':') && line.length < 50 && i !== 0) ? '12px' : '0'
            }}>
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTranscript = (transcriptData) => {
    if (!transcriptData) return <p style={{ fontStyle: 'italic', opacity: 0.7 }}>No transcript available for this meeting.</p>;
    
    let parsed = transcriptData;
    if (typeof transcriptData === 'string') {
      try {
        parsed = JSON.parse(transcriptData);
      } catch (e) {
        // Not JSON, just normal text
        return transcriptData.split('\n').map((line, i) => (
          <p key={i} style={{ marginBottom: '8px' }}>{line}</p>
        ));
      }
    }

    if (Array.isArray(parsed)) {
      return parsed.map((item, i) => (
        <div key={i} style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontWeight: '600', color: 'var(--apple-text-primary)' }}>{item.speaker?.display_name || item.speaker?.name || 'Unknown Speaker'}</span>
            {item.timestamp && <span style={{ fontSize: '0.8rem', color: 'var(--apple-text-secondary)', background: 'var(--apple-bg)', padding: '2px 6px', borderRadius: '4px' }}>{item.timestamp}</span>}
          </div>
          <p style={{ color: 'var(--apple-text-secondary)', lineHeight: '1.5', margin: 0 }}>{item.text || item.content || JSON.stringify(item)}</p>
        </div>
      ));
    }
    
    // Fallback
    return <p>{String(transcriptData)}</p>;
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s var(--apple-ease)', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.02em', color: 'var(--apple-text-primary)' }}>
          Meeting Recordings
        </h1>
        <p style={{ color: 'var(--apple-text-secondary)', fontSize: '1.1rem' }}>
          Access transcripts, summaries, and action items from Fathom meetings.
        </p>
      </div>

      <div className="apple-card" style={{ marginBottom: '24px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Calendar size={24} color="var(--apple-text-secondary)" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="meeting-date" style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>
            Select Date
          </label>
          <input 
            type="date" 
            id="meeting-date"
            value={selectedDate}
            onChange={handleDateChange}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid var(--apple-border)',
              background: 'var(--apple-bg-secondary)',
              color: 'var(--apple-text-primary)',
              fontSize: '1rem',
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Meetings List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px' }}>Meetings on {selectedDate}</h2>
          
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>Loading meetings...</div>
          ) : meetings.length === 0 ? (
            <div className="apple-card" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>
              <Calendar size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>No meetings found for this date.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {meetings.map((meeting) => (
                <div 
                  key={meeting.id}
                  className={`apple-card ${selectedMeeting?.id === meeting.id ? 'active' : ''}`}
                  onClick={() => setSelectedMeeting(meeting)}
                  style={{
                    padding: '12px 20px',
                    cursor: 'pointer',
                    border: selectedMeeting?.id === meeting.id ? '2px solid var(--apple-accent-blue)' : '1px solid var(--apple-border)',
                    transition: 'all 0.2s ease',
                    transform: selectedMeeting?.id === meeting.id ? 'scale(1.02)' : 'scale(1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '1.05rem', color: 'var(--apple-text-primary)' }}>
                    <User size={16} color="var(--apple-accent-blue)" />
                    {meeting.speaker_name || 'Unknown Speaker'}
                  </div>
                  {meeting.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--apple-text-secondary)', borderLeft: '1px solid var(--apple-border)', paddingLeft: '16px' }}>
                      <Mail size={14} /> {meeting.email}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', borderLeft: '1px solid var(--apple-border)', paddingLeft: '16px' }}>
                    <Clock size={14} />
                    {meeting.meeting_time ? meeting.meeting_time.substring(0,5) : 'Time unknown'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Meeting Details Pane */}
        <div style={{ width: '100%' }}>
          {selectedMeeting ? (
            <div className="apple-card" style={{ padding: '28px', animation: 'fadeIn 0.3s var(--apple-ease)' }}>
              
              <div style={{ borderBottom: '1px solid var(--apple-border)', paddingBottom: '20px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '8px' }}>
                  {selectedMeeting.speaker_name}'s Meeting
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--apple-text-secondary)', fontSize: '0.9rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} /> {selectedMeeting.meeting_date}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> {selectedMeeting.meeting_time?.substring(0,5)}</span>
                  {selectedMeeting.fathom_link && (
                    <a href={selectedMeeting.fathom_link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--apple-accent-blue)', textDecoration: 'none', fontWeight: '500' }}>
                      <LinkIcon size={16} /> View Video
                    </a>
                  )}
                </div>
              </div>

              {(() => {
                const availableSections = [
                  { 
                    id: 'summary', 
                    title: 'Summary', 
                    icon: <AlignLeft size={20} color="#a855f7" />, 
                    isAvailable: !!selectedMeeting.summary,
                    content: selectedMeeting.summary ? renderMarkdown(selectedMeeting.summary) : null
                  },
                  { 
                    id: 'action_items', 
                    title: 'Actionables', 
                    icon: <CheckCircle size={20} color="var(--apple-accent-green)" />, 
                    isAvailable: selectedMeeting.action_items && parseActionItems(selectedMeeting.action_items).length > 0,
                    content: selectedMeeting.action_items ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {parseActionItems(selectedMeeting.action_items).map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'var(--apple-bg)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
                            <div style={{ marginTop: '2px', color: 'var(--apple-accent-green)' }}><CheckCircle size={18} /></div>
                            <div style={{ lineHeight: '1.5', color: 'var(--apple-text-primary)', fontSize: '0.95rem' }}>
                              {typeof item === 'string' ? item : (
                                <div>
                                  <strong>{item.description || item.text}</strong>
                                  {item.assignee?.name && <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--apple-text-secondary)', background: 'var(--apple-bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>Assignee: {item.assignee.name}</span>}
                                  {item.recording_playback_url && <a href={item.recording_playback_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--apple-accent-blue)', textDecoration: 'none' }}>View</a>}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null
                  },
                  { 
                    id: 'transcript', 
                    title: 'Transcript', 
                    icon: <FileText size={20} color="var(--apple-accent-blue)" />, 
                    isAvailable: true,
                    content: (
                      <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
                        {renderTranscript(selectedMeeting.transcript)}
                      </div>
                    )
                  }
                ].filter(s => s.isAvailable);
                
                // If the activeSection is not available, fallback, but respect null (all closed)
                const currentActive = activeSection === null 
                  ? null 
                  : (availableSections.some(s => s.id === activeSection) ? activeSection : availableSections[0]?.id);
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.3s ease' }}>
                    {availableSections.map((section) => {
                      const isActive = section.id === currentActive;
                      return (
                        <div key={section.id} style={{ display: 'flex', flexDirection: 'column' }}>
                          <div 
                            onClick={() => setActiveSection(isActive ? null : section.id)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '12px', 
                              padding: '16px 20px',
                              background: isActive ? 'var(--apple-bg-secondary)' : 'transparent',
                              border: '1px solid var(--apple-border)',
                              borderRadius: isActive ? '12px 12px 0 0' : '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              userSelect: 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            {section.icon}
                            <h3 style={{ fontSize: '1.15rem', fontWeight: '600', margin: 0, color: 'var(--apple-text-primary)' }}>
                              {section.title}
                            </h3>
                          </div>
                          {isActive && (
                            <div style={{ 
                              background: 'var(--apple-bg-secondary)', 
                              border: '1px solid var(--apple-border)',
                              borderTop: 'none',
                              borderRadius: '0 0 12px 12px',
                              padding: '24px',
                              lineHeight: '1.6', 
                              color: 'var(--apple-text-secondary)', 
                              fontSize: '0.95rem'
                            }}>
                              {section.content}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>
          ) : (
            <div className="apple-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--apple-text-secondary)' }}>
              <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ fontSize: '1.1rem' }}>Select a meeting to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
