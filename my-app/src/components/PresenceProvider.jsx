import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const PresenceContext = createContext({
  onlineUsers: {}
});

export const usePresence = () => useContext(PresenceContext);

export const PresenceProvider = ({ user, children }) => {
  const [onlineUsers, setOnlineUsers] = useState({});

  useEffect(() => {
    if (!user) {
      setOnlineUsers({});
      return;
    }

    // Connect to a shared presence channel
    const channel = supabase.channel('online-users');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        
        // Flatten state into a simpler dictionary mapping user_id -> profile data
        const users = {};
        for (const id in state) {
          // state[id] is an array of presences for that id (e.g. if they have multiple tabs open)
          if (state[id] && state[id].length > 0) {
            users[state[id][0].user_id] = state[id][0];
          }
        }
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(prev => {
          const updated = { ...prev };
          newPresences.forEach(p => {
            updated[p.user_id] = p;
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setOnlineUsers(prev => {
          const updated = { ...prev };
          // We don't remove immediately here just relying on sync is usually better 
          // because a user might just close one tab but keep another open.
          // But to be responsive, we can let the sync event handle the actual deletion 
          // to accurately account for multiple tabs.
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Fetch profile info to broadcast
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', user.id)
            .single();

          const presenceData = {
            user_id: user.id,
            email: user.email,
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            online_at: new Date().toISOString()
          };

          await channel.track(presenceData);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return (
    <PresenceContext.Provider value={{ onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
};
