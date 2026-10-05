import React, { useState, useEffect } from 'react';
import { Users, Mail, Calendar, AlertCircle, CheckCircle, RefreshCcw, Save, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAILY_LIMIT = 300;

export default function UserMailingRoster() {
  const [teamsData, setTeamsData] = useState({});
  const [schedule, setSchedule] = useState({});
  const [slots, setSlots] = useState({}); // { "Team A": [ { id: 1, member: '', amount: 0 } ] }
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: teamsRes } = await supabase.from('teams').select('*').order('name');
        const { data: profilesRes } = await supabase.from('profiles').select('id, first_name, last_name, team_id');

        if (teamsRes && profilesRes) {
          // Filter out peercite and signature
          const validTeams = teamsRes.filter(t => {
            const name = t.name?.toLowerCase() || '';
            return !name.includes('peercite') && !name.includes('signature');
          });

          // Group members by team
          const teamsObj = {};
          validTeams.forEach(t => {
            const members = profilesRes
              .filter(p => p.team_id === t.id)
              .map(p => `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown User');
            
            // Only add teams that have members
            if (members.length > 0) {
              teamsObj[t.name] = members.sort();
            }
          });

          const teamNames = Object.keys(teamsObj).sort(); // Sort to ensure consistent ordering
          
          // Calculate which week we are currently in (using a fixed epoch)
          const baseEpoch = new Date('2024-01-01T00:00:00Z').getTime();
          const msPerWeek = 7 * 24 * 60 * 60 * 1000;
          const currentWeekNumber = Math.floor((Date.now() - baseEpoch) / msPerWeek) + weekOffset;

          // Assign to schedule (looping through available teams based on week number)
          const newSchedule = {};
          DAYS.forEach((day, index) => {
            if (teamNames.length > 0) {
              const teamIndex = (currentWeekNumber * DAYS.length + index) % teamNames.length;
              newSchedule[day] = teamNames[teamIndex];
            } else {
              newSchedule[day] = 'No Team Available';
            }
          });

          // Fetch saved allocations from database for this week
          const { data: dbRoster } = await supabase
            .from('mass_mailing_roster')
            .select('*')
            .eq('week_number', currentWeekNumber);

          const dbSlots = {};
          if (dbRoster) {
            dbRoster.forEach(row => {
              dbSlots[row.team_name] = row.allocations || [];
            });
          }

          // Initialize slots as empty arrays or from DB
          setSlots(prev => {
            const newSlots = { ...prev };
            teamNames.forEach(team => {
              if (dbSlots[team] && dbSlots[team].length > 0) {
                newSlots[team] = dbSlots[team];
              } else if (!newSlots[team]) {
                newSlots[team] = []; // Start empty
              }
            });
            return newSlots;
          });

          setTeamsData(teamsObj);
          setSchedule(newSchedule);
        }
      } catch (err) {
        console.error("Error fetching roster data:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [weekOffset]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const baseEpoch = new Date('2024-01-01T00:00:00Z').getTime();
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const currentWeekNumber = Math.floor((Date.now() - baseEpoch) / msPerWeek) + weekOffset;

      const payload = {
        week_number: currentWeekNumber,
        day_of_week: selectedDay,
        team_name: selectedTeam,
        allocations: slots[selectedTeam] || [],
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('mass_mailing_roster')
        .upsert(payload, { onConflict: 'week_number, day_of_week' });
        
      if (error) throw error;
      
      alert(`Roster for ${selectedDay} saved successfully!`);
    } catch (error) {
      console.error("Error saving roster:", error);
      alert('Failed to save roster.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNumSlotsChange = (team, count) => {
    setSlots(prev => {
      const current = prev[team] || [];
      const newSlots = [];
      for (let i = 0; i < count; i++) {
        if (i < current.length) {
          newSlots.push(current[i]);
        } else {
          newSlots.push({ id: Date.now() + i, member: '', amount: 0 });
        }
      }
      return { ...prev, [team]: newSlots };
    });
  };

  const handleSlotMemberChange = (team, index, memberName) => {
    setSlots(prev => {
      const teamSlots = [...(prev[team] || [])];
      teamSlots[index] = { ...teamSlots[index], member: memberName };
      return { ...prev, [team]: teamSlots };
    });
  };

  const handleSlotAmountChange = (team, index, amount) => {
    const val = parseInt(amount) || 0;
    setSlots(prev => {
      const teamSlots = [...(prev[team] || [])];
      teamSlots[index] = { ...teamSlots[index], amount: val };
      return { ...prev, [team]: teamSlots };
    });
  };

  const handleEqualize = (team) => {
    setSlots(prev => {
      const teamSlots = [...(prev[team] || [])];
      if (teamSlots.length === 0) return prev;
      
      const baseShare = Math.floor(DAILY_LIMIT / teamSlots.length);
      let remainder = DAILY_LIMIT % teamSlots.length;
      
      const newTeamSlots = teamSlots.map(slot => {
        const amt = baseShare + (remainder > 0 ? 1 : 0);
        remainder = remainder > 0 ? remainder - 1 : 0;
        return { ...slot, amount: amt };
      });
      
      return { ...prev, [team]: newTeamSlots };
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--apple-text-secondary)' }}>
        Loading Roster...
      </div>
    );
  }

  const selectedTeam = schedule[selectedDay];
  const teamMembers = teamsData[selectedTeam] || [];
  const teamSlots = slots[selectedTeam] || [];
  const totalAllocated = teamSlots.reduce((sum, slot) => sum + (slot.amount || 0), 0);
  const remaining = DAILY_LIMIT - totalAllocated;
  const isOverLimit = totalAllocated > DAILY_LIMIT;
  const hasUnderLimit = teamSlots.some(s => s.amount < 50);

  // Track which members are already assigned to disable them in dropdowns
  const assignedMembers = teamSlots.map(s => s.member).filter(Boolean);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--apple-text-primary)', width: '100%', minWidth: 0 }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.02em' }}>Mass Mailing Roster</h1>
          <p style={{ color: 'var(--apple-text-secondary)', fontSize: '1.1rem' }}>Manage daily email limits and team allocations (Max {DAILY_LIMIT}/day).</p>
        </div>
        
        {/* Week Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--apple-card-bg)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
          <button 
            onClick={() => setWeekOffset(prev => prev - 1)}
            style={{ background: 'transparent', border: 'none', color: 'var(--apple-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontWeight: '600', fontSize: '1rem', minWidth: '100px', textAlign: 'center' }}>
            {weekOffset === 0 ? 'Current Week' : weekOffset > 0 ? `Week +${weekOffset}` : `Week ${weekOffset}`}
          </span>
          <button 
            onClick={() => setWeekOffset(prev => prev + 1)}
            style={{ background: 'transparent', border: 'none', color: 'var(--apple-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      {Object.keys(teamsData).length === 0 ? (
        <div style={{ background: 'var(--apple-card-bg)', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--apple-border)' }}>
          <p style={{ color: 'var(--apple-text-secondary)', fontSize: '1.1rem' }}>No eligible teams found with assigned members.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', minWidth: 0 }}>
          
          {/* Topbar: Days */}
          <div style={{ 
            display: 'flex', gap: '8px', paddingBottom: '12px', width: '100%'
          }}>
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  padding: '12px 8px',
                  borderRadius: '16px',
                  background: selectedDay === day ? 'var(--apple-blue)' : 'var(--apple-card-bg)',
                  color: selectedDay === day ? '#fff' : 'var(--apple-text-primary)',
                  border: `1px solid ${selectedDay === day ? 'transparent' : 'var(--apple-border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: '1 1 0',
                  minWidth: 0,
                  boxShadow: selectedDay === day ? '0 4px 15px rgba(0, 122, 255, 0.3)' : '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '1.05rem', marginBottom: '4px' }}>{day}</div>
                <div style={{ fontSize: '0.8rem', opacity: selectedDay === day ? 0.9 : 0.6, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{schedule[day]}</div>
              </button>
            ))}
          </div>

          {/* Main Content: Allocations */}
          <div style={{ 
            background: 'var(--apple-card-bg)', 
            border: '1px solid var(--apple-border)', 
            borderRadius: '24px', 
            padding: '32px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '600', marginBottom: '4px' }}>{selectedTeam}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <Users size={16} color="var(--apple-text-secondary)" />
                  <select 
                    value={teamSlots.length}
                    onChange={(e) => handleNumSlotsChange(selectedTeam, parseInt(e.target.value))}
                    style={{
                      background: 'var(--apple-bg)', border: '1px solid var(--apple-border)', color: 'var(--apple-text-primary)',
                      padding: '6px 12px', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    <option value={0}>0 Members Participating</option>
                    {[...Array(Math.min(6, teamMembers.length)).keys()].map(n => (
                      <option key={n+1} value={n+1}>{n+1} Members Participating</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--apple-text-secondary)', marginBottom: '4px' }}>Limit Status</div>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', 
                  color: isOverLimit ? '#ff453a' : (remaining === 0 && teamSlots.length > 0 ? '#34d399' : 'var(--apple-blue)'),
                  fontWeight: '700', fontSize: '1.4rem'
                }}>
                  {isOverLimit ? <AlertCircle /> : <CheckCircle />}
                  {totalAllocated} / {DAILY_LIMIT}
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--apple-border)', 
              padding: '16px', borderRadius: '12px', marginBottom: '24px', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
            }}>
              <span style={{ fontSize: '0.95rem', color: 'var(--apple-text-secondary)' }}>
                {teamSlots.length === 0 ? 'Select participating members above to start assigning limits.' :
                  (isOverLimit ? 
                    `Exceeding limit by ${totalAllocated - DAILY_LIMIT} emails.` : 
                    `${remaining} emails remaining to allocate.`)}
              </span>
              <button 
                onClick={() => handleEqualize(selectedTeam)}
                disabled={teamSlots.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px',
                  background: 'var(--apple-card-bg)', border: '1px solid var(--apple-border)',
                  color: teamSlots.length === 0 ? 'var(--apple-text-secondary)' : 'var(--apple-text-primary)', 
                  cursor: teamSlots.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem', fontWeight: '500',
                  transition: 'background 0.2s',
                  opacity: teamSlots.length === 0 ? 0.5 : 1
                }}
              >
                <RefreshCcw size={16} /> Equalize Split
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {teamSlots.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: '12px', border: '1px dashed var(--apple-border)' }}>
                  <p style={{ color: 'var(--apple-text-secondary)', marginBottom: '12px' }}>No slots created yet.</p>
                  <button 
                    onClick={() => handleNumSlotsChange(selectedTeam, 1)}
                    style={{ background: 'var(--apple-blue)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <UserPlus size={16} /> Add First Member Slot
                  </button>
                </div>
              ) : (
                teamSlots.map((slot, index) => (
                  <div key={slot.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
                    padding: '16px 20px', borderRadius: '12px',
                    border: '1px solid var(--apple-border)',
                    background: 'var(--apple-card-bg)',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '200px' }}>
                      <div style={{ 
                        width: '36px', height: '36px', borderRadius: '50%', 
                        background: slot.member ? 'var(--apple-blue)' : 'var(--apple-border)', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '600', fontSize: '0.9rem'
                      }}>
                        {slot.member ? slot.member.charAt(0).toUpperCase() : '?'}
                      </div>
                      
                      <select
                        value={slot.member || ''}
                        onChange={(e) => handleSlotMemberChange(selectedTeam, index, e.target.value)}
                        style={{
                          background: 'var(--apple-bg)', border: '1px solid var(--apple-border)', color: 'var(--apple-text-primary)',
                          padding: '8px 12px', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontSize: '1rem',
                          flex: 1, fontWeight: '500'
                        }}
                      >
                        <option value="" disabled>Select Team Member</option>
                        {teamMembers.map(m => (
                          <option key={m} value={m} disabled={m !== slot.member && assignedMembers.includes(m)}>
                            {m} {assignedMembers.includes(m) && m !== slot.member ? '(Assigned)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--apple-text-secondary)' }}>Contacts:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Mail size={16} color="var(--apple-text-secondary)" />
                          <input
                            type="number"
                            min="0"
                            max={DAILY_LIMIT}
                            value={slot.amount || 0}
                            onChange={(e) => handleSlotAmountChange(selectedTeam, index, e.target.value)}
                            style={{
                              width: '80px', padding: '8px 12px', borderRadius: '8px',
                              border: `1px solid ${isOverLimit || slot.amount < 50 ? '#ff453a' : 'var(--apple-border)'}`,
                              background: 'transparent', color: 'var(--apple-text-primary)',
                              textAlign: 'right', fontSize: '1rem', fontWeight: '600',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                      {slot.amount < 50 && (
                        <span style={{ fontSize: '0.75rem', color: '#ff453a', fontWeight: '500' }}>Minimum 50 required</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleSave}
                disabled={isOverLimit || teamSlots.length === 0 || hasUnderLimit || isSaving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 24px', borderRadius: '12px',
                  background: isOverLimit || teamSlots.length === 0 || hasUnderLimit || isSaving ? 'var(--apple-border-strong)' : 'var(--apple-blue)', 
                  color: '#fff', border: 'none',
                  cursor: isOverLimit || teamSlots.length === 0 || hasUnderLimit || isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '1rem', fontWeight: '600',
                  transition: 'opacity 0.2s',
                  opacity: isOverLimit || teamSlots.length === 0 || hasUnderLimit || isSaving ? 0.6 : 1
                }}
              >
                {isSaving ? <RefreshCcw size={18} /> : <Save size={18} />} 
                {isSaving ? 'Saving...' : 'Save Roster'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
