import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function PageTracker({ user }) {
  const location = useLocation();

  useEffect(() => {
    // Only track if there is a logged in user
    if (!user) return;

    // Ignore root and complete-profile as they are transitional
    if (location.pathname === '/' || location.pathname === '/complete-profile') return;

    const getPageName = (pathname) => {
      if (pathname === '/home') return 'Home';
      if (pathname === '/team') return 'Team';
      if (pathname === '/revenue') return 'Revenue';
      if (pathname === '/historical-revenue') return 'Historical Revenue';
      if (pathname === '/revenue-history') return 'Revenue History';
      if (pathname === '/dis') return 'Daily Information System';
      if (pathname === '/team-analytics') return 'Team Analytics';
      if (pathname === '/team-management') return 'Team Management';
      if (pathname === '/team-dis-report') return 'Team DIS Report';
      if (pathname === '/leaderboard') return 'Leaderboard';
      if (pathname === '/milestones') return 'Milestones';
      if (pathname === '/sales-analytics') return 'Sales Analytics';
      if (pathname === '/reviews') return 'Reviews';
      if (pathname === '/profile') return 'Profile Settings';
      
      // Admin paths
      if (pathname.startsWith('/admin/home')) return 'Admin Home';
      if (pathname.startsWith('/admin/teams')) return 'Admin Teams';
      if (pathname.startsWith('/admin/users')) return 'Admin Users';
      if (pathname.startsWith('/admin/revenue')) return 'Admin Revenue';
      if (pathname.startsWith('/admin/dis')) return 'Admin DIS';
      if (pathname.startsWith('/admin/analytics')) return 'Admin Analytics';
      if (pathname.startsWith('/admin/events')) return 'Admin Events';
      if (pathname.startsWith('/admin/reviews')) return 'Admin Reviews';
      if (pathname.startsWith('/admin/auditlogs')) return 'Admin Audit Logs';
      if (pathname.startsWith('/admin/settings')) return 'Admin Settings';

      return pathname; // Fallback to just the path
    };

    const trackPage = async () => {
      try {
        const pageName = getPageName(location.pathname);
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action_type: 'page_view',
          details: {
            path: location.pathname,
            page_name: pageName
          }
        });
      } catch (err) {
        console.error("Error tracking page view:", err);
      }
    };

    trackPage();
  }, [location.pathname, user]);

  return null; // This component doesn't render anything
}
