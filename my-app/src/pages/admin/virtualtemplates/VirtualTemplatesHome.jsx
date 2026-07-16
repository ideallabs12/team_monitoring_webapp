import { useNavigate } from 'react-router-dom'
import { LayoutTemplate, ChevronRight, Mail } from 'lucide-react'

export default function VirtualTemplatesHome() {
  const navigate = useNavigate()

  const templates = [
    {
      id: 'template1',
      name: 'Template 1',
      description: 'One Minute to Your Next Speaking Opportunity',
      icon: Mail,
      color: '#e8a13a',
    },
    {
      id: 'template2',
      name: 'Template 2',
      description: 'Experimental UI Template',
      icon: LayoutTemplate,
      color: '#10b981', // green accent to differentiate
    },
    // Future templates can be added here
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--apple-bg, #0f0f0f)', padding: '24px 24px 40px', boxSizing: 'border-box' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #e8a13a, #d4881e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(232,161,58,0.35)', flexShrink: 0
        }}>
          <LayoutTemplate size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--apple-text-primary, #fff)', letterSpacing: '-0.02em' }}>Virtual Templates</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--apple-text-secondary, #888)' }}>Select a template to build and download</p>
        </div>
      </div>

      {/* Templates Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            onClick={() => navigate(`/admin/virtual-events/${tpl.id}`)}
            style={{
              background: 'var(--card-bg, #1a1a1a)',
              border: '1px solid var(--apple-border, #2a2a2a)',
              borderRadius: '16px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = tpl.color
              e.currentTarget.style.boxShadow = `0 8px 24px ${tpl.color}15`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.borderColor = 'var(--apple-border, #2a2a2a)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: `${tpl.color}15`, color: tpl.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <tpl.icon size={20} />
              </div>
              <ChevronRight size={18} color="#666" />
            </div>
            
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'var(--apple-text-primary, #fff)' }}>
              {tpl.name}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--apple-text-secondary, #888)', lineHeight: '1.4' }}>
              {tpl.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
