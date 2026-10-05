export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--apple-border)',
      padding: '48px 0 32px',
      background: 'var(--apple-bg)',
      color: 'var(--apple-text-secondary)',
      fontSize: '0.9rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: '40px'
      }}>
        {/* --- First Half (Brand & Copyright) --- */}
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', background: '#fff' }}>
              <img src="/allhands_logo_cropped.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <h3 style={{ color: 'var(--apple-text-primary)', fontSize: '1.2rem', fontWeight: '700', letterSpacing: '-0.02em' }}>
              All-Hands Platform
            </h3>
          </div>
          <p style={{ lineHeight: '1.6', maxWidth: '350px', marginBottom: '24px' }}>
            Empowering teams with actionable analytics, seamless team management, and automated operations.
          </p>
          <p>&copy; {new Date().getFullYear()} IdealLabs. All rights reserved.</p>
        </div>

        {/* --- Second Half (Links & Resources) --- */}
        <div style={{ flex: '1 1 400px', display: 'flex', gap: '64px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h4 style={{ color: 'var(--apple-text-primary)', fontWeight: '600', marginBottom: '16px', fontSize: '0.95rem' }}>Platform</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><a href="/home" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}>Dashboard</a></li>
              <li><a href="/leaderboard" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}>Leaderboard</a></li>
              <li><a href="/team" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}>Teams</a></li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ color: 'var(--apple-text-primary)', fontWeight: '600', marginBottom: '16px', fontSize: '0.95rem' }}>Resources</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><a href="#" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}>Help Center</a></li>
              <li><a href="#" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}>System Status</a></li>
              <li><a href="#" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}>Contact Admin</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
