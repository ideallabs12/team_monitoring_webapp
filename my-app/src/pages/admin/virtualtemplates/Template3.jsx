import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Copy, Download, RefreshCw, Upload, Eye, Edit3,
  Mail, User, Building2, Percent, Tag, FileText, Save,
  CheckCircle2, Palette, ArrowLeft
} from 'lucide-react'

/* ════════════════════════════════════════════════════════════
   COLOR THEMES
   ─────────────────────────────────────────────────────────
   To add a new theme in future, add an entry to this object.
   Every theme must supply ALL the keys below.
   ════════════════════════════════════════════════════════════ */
const THEMES = {
  theme1: {
    id: 'theme1',
    name: 'Theme 1',
    label: 'Amber Dark',
    preview: ['#241a14', '#e8a13a', '#c9beb2'],
    bgOuter: '#1c1410',
    bgCard: '#241a14',
    bgSection: '#2e2119',
    borderMuted: '#4a3520',
    borderAccent: '#e8a13a',
    accent: '#e8a13a',
    accentText: '#241a14',
    textPrimary: '#ffffff',
    textSecondary: '#c9beb2',
    textMuted: '#9c8f80',
    textLabel: '#8a7a6a',
    accentGlow: 'rgba(232,161,58,0.18)',
    logoFilter: 'sepia(1) saturate(3) hue-rotate(5deg) brightness(0.85) drop-shadow(0 0 10px rgba(232,161,58,0.5))',
    linkedinBg: '#0A66C2',
  },
  theme2: {
    id: 'theme2',
    name: 'Theme 2',
    label: 'Forest Gold',
    preview: ['#ffffff', '#1a5c2a', '#d4af37'],
    bgOuter: '#f0f4f0',
    bgCard: '#ffffff',
    bgSection: '#f5faf5',
    borderMuted: '#c2d8c2',
    borderAccent: '#1a5c2a',
    accent: '#d4af37',
    accentText: '#1a3a1a',
    textPrimary: '#1a3a1a',
    textSecondary: '#2d5a27',
    textMuted: '#5a7a5a',
    textLabel: '#4a6b4a',
    accentGlow: 'rgba(212,175,55,0.18)',
    logoFilter: 'drop-shadow(0 2px 10px rgba(26,92,42,0.3))',
    linkedinBg: '#0A66C2',
  },
  theme_wyn: {
    id: 'theme_wyn',
    name: 'WYN Theme',
    label: 'Navy Sky',
    preview: ['#FFFFFF', '#00256B', '#38BDF8'],
    bgOuter: '#F0F4F8',
    bgCard: '#FFFFFF',
    bgSection: '#F8FAFC',
    borderMuted: '#E2E8F0',
    borderAccent: '#00256B',
    accent: '#00256B',
    accentBg: 'linear-gradient(135deg, #00256B, #38BDF8)',
    accentText: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textLabel: '#475569',
    accentGlow: 'rgba(0,37,107,0.15)',
    logoFilter: 'drop-shadow(0 2px 8px rgba(0,37,107,0.1))',
    linkedinBg: '#0A66C2',
  },
  theme_icon: {
    id: 'theme_icon',
    name: 'ICON Theme',
    label: 'Ice Blue',
    preview: ['#F0F7F9', '#002C74', '#FFFFFF'],
    bgOuter: '#E2EEF3',
    bgCard: '#F0F7F9',
    bgSection: '#FFFFFF',
    borderMuted: '#C2DFE9',
    borderAccent: '#002C74',
    accent: '#002C74',
    accentText: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textLabel: '#475569',
    accentGlow: 'rgba(0,44,116,0.18)',
    logoFilter: 'drop-shadow(0 0 10px rgba(0,44,116,0.1))',
    linkedinBg: '#0A66C2',
  },
  theme_idias: {
    id: 'theme_idias',
    name: 'iDIAS Theme',
    label: 'White Orange',
    preview: ['#FFFFFF', '#FE5B00', '#000000'],
    bgOuter: '#F9FAFB',
    bgCard: '#FFFFFF',
    bgSection: '#F8F9FA',
    borderMuted: '#E5E7EB',
    borderAccent: '#FE5B00',
    accent: '#FE5B00',
    accentBg: 'linear-gradient(135deg, #FE5B00, #FF823A)',
    accentText: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#374151',
    textMuted: '#6B7280',
    textLabel: '#4B5563',
    accentGlow: 'rgba(254,91,0,0.15)',
    logoFilter: 'drop-shadow(0 2px 8px rgba(254,91,0,0.15))',
    linkedinBg: '#0A66C2',
  },
  theme_prosummits: {
    id: 'theme_prosummits',
    name: 'PROSUMMITS Theme',
    label: 'Rainbow Light',
    preview: ['#FFFFFF', '#FF3366', '#3399FF'],
    bgOuter: '#F3F4F6',
    bgCard: '#FFFFFF',
    bgSection: '#F9FAFB',
    borderMuted: '#E5E7EB',
    borderAccent: '#FF3366',
    accent: '#FF3366',
    accentBg: 'linear-gradient(135deg, #FF0000, #FF7F00, #FACC15, #10B981, #3B82F6, #8B5CF6)',
    accentText: '#FFFFFF',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    textLabel: '#374151',
    accentGlow: 'rgba(255,51,102,0.15)',
    logoFilter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))',
    linkedinBg: '#0A66C2',
  },
  theme_wynxtalks: {
    id: 'theme_wynxtalks',
    name: 'WYNxtalks Theme',
    label: 'Dark Magenta',
    preview: ['#000000', '#E51A66', '#FFFFFF'],
    bgOuter: '#050505',
    bgCard: '#000000',
    bgSection: '#111111',
    borderMuted: '#2A2A2A',
    borderAccent: '#E51A66',
    accent: '#E51A66',
    accentText: '#FFFFFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    textLabel: '#6B7280',
    accentGlow: 'rgba(229,26,102,0.18)',
    logoFilter: 'drop-shadow(0 2px 10px rgba(229,26,102,0.2))',
    linkedinBg: '#0A66C2',
  },
  theme_next: {
    id: 'theme_next',
    name: 'NEXT Theme',
    label: 'Sky Cyber',
    preview: ['#001E3C', '#279DEE', '#E7F2FF'],
    bgOuter: '#0A1929',
    bgCard: '#001E3C',
    bgSection: '#072C54',
    borderMuted: '#134074',
    borderAccent: '#279DEE',
    accent: '#279DEE',
    accentText: '#FFFFFF',
    textPrimary: '#F0F7FF',
    textSecondary: '#99CCF3',
    textMuted: '#66B2EC',
    textLabel: '#B3D9F8',
    accentGlow: 'rgba(39,157,238,0.25)',
    logoFilter: 'drop-shadow(0 0 10px rgba(39,157,238,0.3))',
    linkedinBg: '#0A66C2',
  },
  theme_voice: {
    id: 'theme_voice',
    name: 'VOICE Theme',
    label: 'Royal Purple',
    preview: ['#FFFFFF', '#270275', '#B6B6B7'],
    bgOuter: '#EBE9F1',
    bgCard: '#FFFFFF',
    bgSection: '#F8F7FA',
    borderMuted: '#DCD8E7',
    borderAccent: '#270275',
    accent: '#270275',
    accentText: '#FFFFFF',
    textPrimary: '#1E1B29',
    textSecondary: '#4F4A61',
    textMuted: '#7A758F',
    textLabel: '#39344A',
    accentGlow: 'rgba(39,2,117,0.15)',
    logoFilter: 'drop-shadow(0 0 10px rgba(39,2,117,0.15))',
    linkedinBg: '#0A66C2',
  }
}

const COMPANIES = [
  {
    id: 'WYN',
    name: 'WYN conferences',
    handle: '@WYNconferences',
    website: 'www.wynconferences.com',
    linkedin: 'https://www.linkedin.com/company/wyn-global-conferences/posts/?feedView=all',
    logo: '/company_logos/WYN.jpg'
  },
  {
    id: 'ICON',
    name: 'ICON conferences',
    handle: '@ICONconferences',
    website: 'www.iconconferences.org',
    linkedin: 'https://www.linkedin.com/company/icon-global-conferences/',
    logo: '/company_logos/ICON.jpg'
  },
  {
    id: 'IDIAS',
    name: 'iDIAS conferences',
    handle: '@iDIASconferences',
    website: 'www.idias.org',
    linkedin: 'https://www.linkedin.com/company/idias-global-conferences/',
    logo: '/company_logos/IDIAS.jpg'
  },
  {
    id: 'PROSUMMITS',
    name: 'PROSUMMITS',
    handle: '@PROSUMMITS',
    website: 'www.prosummits.org',
    linkedin: 'https://www.linkedin.com/company/prosummits-hybrid-conferences/posts/?feedView=all',
    logo: '/company_logos/PROSUMMITS.jpg'
  },
  {
    id: 'WYNXTALKS',
    name: 'WYNxtalks',
    handle: '@WYNxtalks',
    website: 'www.wynxtalks.com',
    linkedin: 'https://www.linkedin.com/company/wynxtalks/posts/?feedView=all',
    logo: '/company_logos/WYNXTALKS.jpg'
  },
  {
    id: 'NEXT',
    name: 'NEXT CONFERENCES',
    handle: '@NEXTCONFERENCES',
    website: 'www.nextconferences.org',
    linkedin: 'https://www.linkedin.com/company/next-premier-conferences/posts/?feedView=all',
    logo: '/company_logos/NEXT.jpg'
  },
  {
    id: 'VOICE',
    name: 'VOICETALKS',
    handle: '@VOICETALKS',
    website: 'www.voicetalks.org',
    linkedin: 'https://www.linkedin.com/company/voicetalks/',
    logo: '/company_logos/VOICE.jpg'
  }
]

/* ════════════════════════════════════════════════════════════
   DEFAULT FIELD VALUES
   ════════════════════════════════════════════════════════════ */
const DEFAULT_FIELDS = {
  companyId: 'WYN',
  speakerName: 'Dr. Emma Abalogun',
  focusAreas: 'Leadership, Health, Global Impact',
  peerScore: '81.2%',
  speakerImageUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
}

/* ════════════════════════════════════════════════════════════
   HTML BUILDER  — all colors driven by `theme`
   ════════════════════════════════════════════════════════════ */
function buildHtml(fields, theme) {
  const t = theme || THEMES.theme_wyn
  const company = COMPANIES.find(c => c.id === fields.companyId) || COMPANIES[0]
  
  return `<!DOCTYPE html>
<html style="height:100%;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Speak Today. Inspire Tomorrow.</title>
</head>
<body style="margin:0; padding:40px 0; background-color:${t.bgOuter}; font-family: Arial, Helvetica, sans-serif;">
<table id="pdf-page" role="presentation" width="800" align="center" cellpadding="0" cellspacing="0" style="background-color:${t.bgCard}; width:800px; height:1131px; margin:0 auto; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
<tr><td align="center" style="vertical-align:top; height:100%; padding:0;">
<table role="presentation" width="100%" height="100%" cellpadding="0" cellspacing="0" style="background-color:${t.bgCard}; width:100%; height:100%;">

  <!-- Header -->
  <tr>
    <td style="background:${t.accentBg || t.accent}; padding:28px 40px 24px 40px; border-bottom:1px solid ${t.borderMuted}; position:relative; overflow:hidden;">
      <div style="position:absolute; top:-50px; right:-50px; width:170px; height:170px; border-radius:50%; background:radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);"></div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <!-- Left: Badge + Headline -->
          <td valign="middle" style="padding-right:16px; width: 75%;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 14px 0;">
              <tr>
                <td style="background-color:${t.accentText}; border-radius:16px; padding:4px 14px;">
                  <p style="margin:0; font-size:11px; font-weight:bold; letter-spacing:2.5px; color:${t.accent}; font-family: Arial, sans-serif;">${company.name.split('').join(' ').toUpperCase()}</p>
                </td>
              </tr>
            </table>
            <p style="margin:0; font-size:28px; font-weight:bold; line-height:1.25; color:${t.accentText}; font-family: Arial, sans-serif;">🎙️ One Minute to Your Next Speaking Opportunity.</p>
          </td>
          <!-- Right: Logo -->
          <td valign="middle" align="right" style="width: 25%;">
            <img src="${company.logo}" style="width: 130px; object-fit:contain; border-radius: 8px; background-color: #fff; padding: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);" alt="Logo">
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Score Card -->
  <tr>
    <td style="padding:32px 40px 10px 40px;">
      <p style="margin:0 0 12px 0; font-size:16.5px; font-weight:bold; color:${t.accent}; font-family: Arial, sans-serif;">🎉 Congratulations ${fields.speakerName},</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${t.bgSection}; border:1px solid ${t.borderMuted}; border-radius:10px;">
        <tr>
          <td width="60" style="padding:12px 0 12px 14px; border-right:1px solid ${t.borderMuted};">
            <img src="${fields.speakerImageUrl}" width="46" height="46" alt="Speaker" style="border-radius:50%; display:block; border:2px solid ${t.accent};">
          </td>
          <td style="padding:12px 14px; border-right:1px solid ${t.borderMuted};">
            <p style="margin:0 0 3px 0; font-size:11px; font-weight:bold; letter-spacing:1px; color:${t.textLabel}; font-family: Arial, sans-serif;">KEY FOCUS AREAS</p>
            <p style="margin:0; font-size:13.5px; color:${t.textSecondary}; font-family: Arial, sans-serif;">${fields.focusAreas}</p>
          </td>
          <td width="120" align="center" style="padding:0;">
            <table role="presentation" width="100%" height="100%" cellpadding="0" cellspacing="0" style="background:${t.accentBg || t.accent}; height:100%;">
              <tr>
                <td align="center" style="padding:14px 10px;">
                  <p style="margin:0 0 2px 0; font-size:10.5px; font-weight:bold; letter-spacing:1px; color:${t.accentText}; font-family: Arial, sans-serif;">PEER SCORE</p>
                  <p style="margin:0; font-size:22px; font-weight:bold; color:${t.accentText}; font-family: Arial, sans-serif;">${fields.peerScore}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Intro paragraph -->
  <tr>
    <td style="padding:24px 40px 10px 40px;">
      <p style="margin:0; font-size:16px; line-height:1.5; color:${t.textPrimary}; font-family: Arial, sans-serif;">
        Convert your virtual talk into a <b style="color:${t.accent};">complimentary in-person speaking opportunity</b> by sharing a 1-minute testimonial on <span style="color:${t.accent}; text-decoration:underline;">LinkedIn</span>. It also helps increase your <b style="color:${t.accent};">peer score</b>.
      </p>
    </td>
  </tr>

  <!-- Combined Action Box -->
  <tr>
    <td style="padding:28px 40px 12px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${t.bgSection}; border:1px solid ${t.borderAccent}; border-radius:12px;">
        
        <!-- Top Part: Keynote Speaker Invitation -->
        <tr>
          <td style="padding:20px 26px 16px 26px;">
            <p style="margin:0 0 8px 0; font-size:14px; font-weight:bold; letter-spacing:2px; color:${t.accent}; font-family: Arial, sans-serif;">KEYNOTE SPEAKER INVITATION</p>
            <p style="margin:0; font-size:14px; color:${t.textSecondary}; line-height:1.55; font-family: Arial, sans-serif;">Share your testimonial and get a chance to be nominated as an in-person Keynote Speaker — includes complimentary 3-night stay and other speaker benefits.</p>
          </td>
        </tr>
        
        <!-- Divider -->
        <tr>
          <td style="padding: 0 26px;">
            <div style="height:1px; background-color:${t.borderMuted};"></div>
          </td>
        </tr>

        <!-- Bottom Part: LinkedIn CTA -->
        <tr>
          <td style="padding:16px 26px 20px 26px;">
            <p style="margin:0 0 10px 0; font-size:14px; font-weight:bold; letter-spacing:2px; color:${t.accent}; font-family: Arial, sans-serif;">IT TAKES LESS THAN 1 MINUTE!</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="middle" style="font-size:14px; line-height:1.55; color:${t.textSecondary}; font-family: Arial, sans-serif;">
                  Post on LinkedIn — a short write-up or a 30-second video — and tag <b style="color:${t.textPrimary};">${company.handle}</b>
                </td>
                <td width="130" valign="middle" align="right">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td id="linkedin-btn" align="center" style="background-color:${t.linkedinBg}; border-radius:8px; padding: 10px 14px; font-size:14px; font-weight:bold; color:#ffffff; font-family: Arial, sans-serif;">
                        <a href="${company.linkedin}" target="_blank" style="color:#ffffff; text-decoration:none; display:block;">Go to LinkedIn</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Quote -->
  <tr>
    <td style="padding:32px 40px 14px 40px; text-align:center;">
      <p style="margin:0; font-size:21px; font-weight:bold; line-height:1.4; color:${t.textPrimary}; font-family: Arial, sans-serif;">
        <span style="color:${t.accent};">&#8220;</span>SHARE TODAY. INSPIRE TOMORROW.<br><span style="color:${t.accent};">SPEAK AGAIN.</span><span style="color:${t.accent};">&#8221;</span>
      </p>
      <p style="margin:10px 0 0 0; font-size:12px; color:${t.textMuted}; font-family: Arial, sans-serif;">Selected testimonials will also be featured on the ${fields.companyName} website and official social media channels.</p>
    </td>
  </tr>

  <!-- Spacer to push footer down -->
  <tr>
    <td style="height: 100%;"></td>
  </tr>

  <!-- 3-Step Timeline -->
  <tr>
    <td style="padding: 10px 40px 30px 40px;">
      <p style="margin:0 0 24px 0; font-size:15px; font-weight:bold; letter-spacing:1px; color:${t.accent}; text-align:center; font-family: Arial, sans-serif;">INSTRUCTIONS</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          
          <!-- Step 1 -->
          <td width="33.33%" valign="top" align="center" style="padding: 0 12px; position:relative;">
            <div style="position:absolute; top: 17px; left: 50%; width: 100%; height: 2px; background-color: ${t.borderMuted}; z-index: 1;"></div>
            <div style="width:36px; height:36px; border-radius:50%; background:${t.accentBg || t.accent}; color:${t.accentText}; text-align:center; line-height:36px; font-size:15px; font-weight:bold; font-family: Arial, sans-serif; margin: 0 auto 12px auto; position: relative; z-index: 2;">1</div>
            <p style="margin:0 0 6px 0; font-size:16px; font-weight:bold; color:${t.textPrimary}; font-family: Arial, sans-serif;">Post on LinkedIn</p>
            <p style="margin:0; font-size:13.5px; line-height:1.4; color:${t.textSecondary}; font-family: Arial, sans-serif;">Share a video or photo of the conference you attended.</p>
          </td>

          <!-- Step 2 -->
          <td width="33.33%" valign="top" align="center" style="padding: 0 12px; position:relative;">
            <div style="position:absolute; top: 17px; left: 50%; width: 100%; height: 2px; background-color: ${t.borderMuted}; z-index: 1;"></div>
            <div style="width:36px; height:36px; border-radius:50%; background:${t.accentBg || t.accent}; color:${t.accentText}; text-align:center; line-height:36px; font-size:15px; font-weight:bold; font-family: Arial, sans-serif; margin: 0 auto 12px auto; position: relative; z-index: 2;">2</div>
            <p style="margin:0 0 6px 0; font-size:16px; font-weight:bold; color:${t.textPrimary}; font-family: Arial, sans-serif;">Tag Us</p>
            <p style="margin:0; font-size:13.5px; line-height:1.4; color:${t.textSecondary}; font-family: Arial, sans-serif;">Make sure to tag <a href="${company.linkedin}" style="color:${t.accent}; text-decoration:none;">${company.handle}</a> in your post.</p>
          </td>

          <!-- Step 3 (No outgoing line) -->
          <td width="33.33%" valign="top" align="center" style="padding: 0 12px; position:relative;">
            <div style="width:36px; height:36px; border-radius:50%; background:${t.accentBg || t.accent}; color:${t.accentText}; text-align:center; line-height:36px; font-size:15px; font-weight:bold; font-family: Arial, sans-serif; margin: 0 auto 12px auto; position: relative; z-index: 2;">3</div>
            <p style="margin:0 0 6px 0; font-size:16px; font-weight:bold; color:${t.textPrimary}; font-family: Arial, sans-serif;">Submit</p>
            <p style="margin:0; font-size:13.5px; line-height:1.4; color:${t.textSecondary}; font-family: Arial, sans-serif;">share you post link with us</p>
          </td>

        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:28px 40px 30px 40px; border-top:1px solid ${t.borderMuted};">
      <p style="margin:0 0 3px 0; font-size:14px; color:${t.accent}; font-family: Arial, sans-serif;">Warm regards,</p>
      <p style="margin:0 0 3px 0; font-size:15px; font-weight:bold; color:${t.textPrimary}; font-family: Arial, sans-serif;">Women Leadership & Women Health Global Conference</p>
      <p style="margin:0; font-size:14px; color:${t.textSecondary}; font-family: Arial, sans-serif;">${company.name}</p>
    </td>
  </tr>

  <!-- Website bar -->
  <tr>
    <td id="website-btn" style="background:${t.accentBg || t.accent}; padding:12px; text-align:center;">
      <a href="https://${company.website}" style="margin:0; font-size:13px; letter-spacing:1px; font-weight:bold; color:${t.accentText}; font-family: Arial, sans-serif; text-decoration:none;">${company.website.toUpperCase()}</a>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

/* ════════════════════════════════════════════════════════════
   FIELD CONFIG
   ════════════════════════════════════════════════════════════ */
const FIELD_CONFIG = [
  { key: 'speakerName', label: 'Speaker Name', icon: User, placeholder: 'Full name with title', wide: false },
  { key: 'focusAreas', label: 'Focus Areas', icon: Tag, placeholder: 'Leadership, Health, ...', wide: false },
  { key: 'peerScore', label: 'Peer Score', icon: Percent, placeholder: '81.2%', wide: false },
]

/* ════════════════════════════════════════════════════════════
   SHARED STYLES
   ════════════════════════════════════════════════════════════ */
const inputBase = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', borderRadius: '8px',
  background: '#111', border: '1px solid #2a2a2a',
  color: '#fff', fontSize: '0.875rem', outline: 'none',
  transition: 'border-color 0.15s', fontFamily: 'inherit',
}
const labelStyle = {
  display: 'block', fontSize: '0.72rem', fontWeight: 700,
  color: '#e8a13a', marginBottom: '6px',
  letterSpacing: '0.06em', textTransform: 'uppercase',
}

/* ════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function Template3() {
  const navigate = useNavigate()
  const isAdminRoute = window.location.hash.startsWith('#/admin')
  const [draft, setDraft] = useState({ ...DEFAULT_FIELDS })
  const [saved, setSaved] = useState({ ...DEFAULT_FIELDS })
  const [draftThemeId, setDraftThemeId] = useState('theme_wyn')
  const [savedThemeId, setSavedThemeId] = useState('theme_wyn')
  const [activeTab, setActiveTab] = useState('edit')
  const [savedToast, setSavedToast] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState('preview')
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const fileInputRef = useRef(null)
  const iframeRef = useRef(null)

  const savedTheme = THEMES[savedThemeId] || THEMES.theme_wyn
  const savedHtml = buildHtml(saved, savedTheme)

  /* ── handlers ─────────────────────────────────────────────── */
  const handleChange = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    
    // Auto-select the corresponding company theme
    if (key === 'companyId') {
      const correspondingThemeId = `theme_${value.toLowerCase()}`
      if (THEMES[correspondingThemeId]) {
        setDraftThemeId(correspondingThemeId)
      }
    }
    
    setHasUnsaved(true)
  }

  const handleThemeChange = (id) => {
    setDraftThemeId(id)
    setHasUnsaved(true)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => handleChange('speakerImageUrl', ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    setSaved({ ...draft })
    setSavedThemeId(draftThemeId)
    setHasUnsaved(false)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2500)
  }

  const handleReset = () => {
    setDraft({ ...DEFAULT_FIELDS })
    setDraftThemeId('theme_wyn')
    setHasUnsaved(true)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(savedHtml).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }

  /* ── Helper: fetch any URL as a base64 data URL ─────────────
     html2canvas cannot paint cross-origin images inside an iframe
     (CORS taints the canvas). Pre-converting to data: URIs bypasses this. */
  const toDataUrl = async (url) => {
    if (!url || url.startsWith('data:')) return url  // already embedded
    try {
      const res = await fetch(url, { mode: 'cors' })
      const blob = await res.blob()
      return await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
    } catch {
      return url  // fallback: keep original URL (may still be blank in canvas)
    }
  }

  /* ── PDF download: iframe → html2canvas → jsPDF (single page, no trailing space) */
  const handleDownload = async () => {
    if (generating) return
    setGenerating(true)

    const filename = (saved.speakerName || 'Speaker')
      .replace(/[^a-zA-Z0-9\s.]/g, '')
      .trim()
      .replace(/\s+/g, '-')

    try {
      // ── Pre-fetch images as data URLs to avoid CORS blank spots ──
      const speakerDataUrl = await toDataUrl(saved.speakerImageUrl)

      let pdfHtml = savedHtml
      if (speakerDataUrl !== saved.speakerImageUrl) {
        pdfHtml = pdfHtml.replace(
          new RegExp(saved.speakerImageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          speakerDataUrl
        )
      }

      // ── PDF download uses the native full-width HTML ──────────
      // The savedHtml is inherently full-width now, no injection needed.


      const iframe = document.createElement('iframe')
      iframe.style.cssText = [
        'position:fixed', 'top:0', 'left:0',
        'width:1000px', 'height:2000px',   // Large enough to hold the 800px centered page
        'border:none', 'visibility:hidden', 'z-index:-1',
      ].join(';')
      document.body.appendChild(iframe)

      try {
        const iDoc = iframe.contentDocument || iframe.contentWindow.document
        iDoc.open(); iDoc.write(pdfHtml); iDoc.close()

        // Wait for full load
        await new Promise(resolve => {
          if (iframe.contentDocument.readyState === 'complete') return resolve()
          iframe.contentWindow.onload = resolve
          setTimeout(resolve, 1500)
        })
        await new Promise(r => setTimeout(r, 300))

        // ── Capture exactly the A4 page container ──
        const pdfPage = iframe.contentDocument.getElementById('pdf-page')
        
        const html2canvas = (await import('html2canvas')).default
        const { jsPDF } = await import('jspdf')

        const canvas = await html2canvas(pdfPage, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: savedTheme.bgCard,
          windowWidth: 1000,
          windowHeight: 2000,
          logging: false,
        })

        const scaleFactor = 2
        const pxW = canvas.width / scaleFactor
        const pxH = canvas.height / scaleFactor

        const pdf = new jsPDF({ unit: 'px', format: [pxW, pxH], hotfixes: ['px_scaling'] })
        const pgW = pdf.internal.pageSize.getWidth()
        const pgH = pdf.internal.pageSize.getHeight()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pgW, pgH)
        
        // Map the button coordinates to add a clickable link in the PDF
        const activeCompany = COMPANIES.find(c => c.id === saved.companyId) || COMPANIES[0]
        
        const btn = iframe.contentDocument.getElementById('linkedin-btn')
        if (btn && activeCompany.linkedin) {
          const pageRect = pdfPage.getBoundingClientRect()
          const btnRect = btn.getBoundingClientRect()
          
          // getBoundingClientRect returns CSS pixels, which directly matches our PDF units
          const linkX = btnRect.left - pageRect.left
          const linkY = btnRect.top - pageRect.top
          const linkW = btnRect.width
          const linkH = btnRect.height
          
          pdf.link(linkX, linkY, linkW, linkH, { url: activeCompany.linkedin })
        }

        const webBtn = iframe.contentDocument.getElementById('website-btn')
        if (webBtn && activeCompany.website) {
          const pageRect = pdfPage.getBoundingClientRect()
          const btnRect = webBtn.getBoundingClientRect()
          const linkX = btnRect.left - pageRect.left
          const linkY = btnRect.top - pageRect.top
          const linkW = btnRect.width
          const linkH = btnRect.height
          pdf.link(linkX, linkY, linkW, linkH, { url: `https://${activeCompany.website}` })
        }

        pdf.save(`${filename}.pdf`)

      } finally {
        document.body.removeChild(iframe)
      }
    } finally {
      setGenerating(false)
    }
  }

  /* ── UI ───────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--apple-bg, #0f0f0f)', padding: '24px 24px 40px', boxSizing: 'border-box' }}>

      {/* Back Button */}
      <button
        onClick={() => {
          const isAdminRoute = window.location.hash.startsWith('#/admin')
          navigate(isAdminRoute ? '/admin/virtual-events' : '/virtual-events')
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'transparent', border: 'none', color: 'var(--apple-text-secondary, #888)',
          cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, padding: '0',
          marginBottom: '20px', transition: 'color 0.2s ease'
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--apple-text-primary, #fff)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--apple-text-secondary, #888)'}
      >
        <ArrowLeft size={16} /> Back to Templates
      </button>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #e8a13a, #d4881e)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(232,161,58,0.35)', flexShrink: 0
        }}>
          <Mail size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--apple-text-primary, #fff)', letterSpacing: '-0.02em' }}>Virtual Events</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--apple-text-secondary, #888)' }}>Build and preview the speaker email template</p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0',
        background: 'var(--card-bg, #1a1a1a)',
        border: '1px solid var(--apple-border, #2a2a2a)',
        borderRadius: '14px', padding: '6px',
        marginBottom: '20px', width: 'fit-content', position: 'relative',
      }}>
        {[{ id: 'edit', label: 'Edit', icon: Edit3 }, { id: 'view', label: 'View', icon: Eye }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 28px', borderRadius: '10px', border: 'none',
            cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, transition: 'all 0.18s',
            background: activeTab === tab.id ? 'linear-gradient(135deg, #e8a13a, #d4881e)' : 'transparent',
            color: activeTab === tab.id ? '#241a14' : '#888',
            boxShadow: activeTab === tab.id ? '0 2px 12px rgba(232,161,58,0.35)' : 'none',
          }}>
            <tab.icon size={15} />
            {tab.label}
            {tab.id === 'edit' && hasUnsaved && (
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: activeTab === 'edit' ? '#241a14' : '#e8a13a',
                display: 'inline-block', marginLeft: '2px'
              }} />
            )}
          </button>
        ))}

        {savedToast && (
          <div style={{
            position: 'absolute', left: 'calc(100% + 12px)', top: '50%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '10px',
            background: 'rgba(52,199,89,0.15)', border: '1px solid rgba(52,199,89,0.35)',
            color: '#34c759', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            <CheckCircle2 size={14} /> Saved — View updated
          </div>
        )}
      </div>

      {/* ══════════════════ EDIT TAB ══════════════════ */}
      {activeTab === 'edit' && (
        <div style={{
          background: 'var(--card-bg, #1a1a1a)',
          border: '1px solid var(--apple-border, #2a2a2a)',
          borderRadius: '16px', overflow: 'hidden',
        }}>
          {/* Edit toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '16px 24px', borderBottom: '1px solid var(--apple-border, #2a2a2a)',
            background: 'rgba(232,161,58,0.04)',
          }}>
            <Edit3 size={15} color="#e8a13a" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--apple-text-primary, #fff)' }}>Template Fields</span>
            {hasUnsaved && (
              <span style={{
                fontSize: '0.72rem', padding: '2px 8px', borderRadius: '20px',
                background: 'rgba(232,161,58,0.15)', color: '#e8a13a',
                border: '1px solid rgba(232,161,58,0.3)', fontWeight: 600,
              }}>Unsaved changes</span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button onClick={handleReset} style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 14px', borderRadius: '8px',
                background: 'transparent', border: '1px solid #2a2a2a',
                color: '#888', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#e8a13a'; e.currentTarget.style.color = '#e8a13a' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#888' }}
              >
                <RefreshCw size={12} /> Reset
              </button>
              <button onClick={handleSave} style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '7px 20px', borderRadius: '8px', border: 'none',
                background: hasUnsaved ? 'linear-gradient(135deg, #e8a13a, #d4881e)' : 'rgba(232,161,58,0.2)',
                color: hasUnsaved ? '#241a14' : '#e8a13a',
                cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700,
                boxShadow: hasUnsaved ? '0 3px 14px rgba(232,161,58,0.4)' : 'none',
              }}>
                <Save size={14} /> Save Changes
              </button>
            </div>
          </div>

          {/* Form body */}
          <div style={{ padding: '28px 32px' }}>

            {/* ── COLOR THEME PICKER ── */}
            {isAdminRoute && (
              <>
                <div style={{ marginBottom: '28px' }}>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <Palette size={12} /> Color Theme
                  </label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {Object.values(THEMES).map(theme => {
                      const isSelected = draftThemeId === theme.id
                      return (
                        <button
                          key={theme.id}
                          onClick={() => handleThemeChange(theme.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px', borderRadius: '12px', cursor: 'pointer',
                            border: isSelected ? '2px solid #e8a13a' : '2px solid #2a2a2a',
                            background: isSelected ? 'rgba(232,161,58,0.1)' : '#111',
                            transition: 'all 0.15s',
                            boxShadow: isSelected ? '0 0 0 3px rgba(232,161,58,0.2)' : 'none',
                          }}
                        >
                          {/* Color swatches */}
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {theme.preview.map((color, i) => (
                              <div key={i} style={{
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: color,
                                border: '1px solid rgba(255,255,255,0.15)',
                              }} />
                            ))}
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isSelected ? '#e8a13a' : '#ccc' }}>
                              {theme.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '1px' }}>
                              {theme.label}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 size={14} color="#e8a13a" style={{ marginLeft: 'auto' }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div style={{ height: '1px', background: '#2a2a2a', marginBottom: '28px' }} />
              </>
            )}

            {/* ── Speaker Image ── */}
            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>Speaker Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img
                  src={draft.speakerImageUrl} alt="Speaker"
                  style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #e8a13a', objectFit: 'cover', flexShrink: 0 }}
                  onError={e => { e.target.src = 'https://randomuser.me/api/portraits/women/68.jpg' }}
                />
                <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text" value={draft.speakerImageUrl}
                    onChange={e => handleChange('speakerImageUrl', e.target.value)}
                    placeholder="Paste image URL..."
                    style={{ ...inputBase, flex: 1 }}
                    onFocus={e => e.target.style.borderColor = '#e8a13a'}
                    onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                  />
                  <button onClick={() => fileInputRef.current?.click()} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                    padding: '9px 16px', borderRadius: '8px',
                    background: 'rgba(232,161,58,0.12)', border: '1px solid rgba(232,161,58,0.3)',
                    color: '#e8a13a', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,161,58,0.22)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,161,58,0.12)'}
                  >
                    <Upload size={14} /> Upload
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: '#2a2a2a', marginBottom: '28px' }} />

            {/* ── Company Dropdown ── */}
            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>
                <Building2 size={11} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
                Company
              </label>
              <select
                value={draft.companyId}
                onChange={e => handleChange('companyId', e.target.value)}
                style={{ ...inputBase, cursor: 'pointer', appearance: 'none' }}
                onFocus={e => e.target.style.borderColor = '#e8a13a'}
                onBlur={e => e.target.style.borderColor = '#2a2a2a'}
              >
                {COMPANIES.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>

            {/* ── Two-column field grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 28px' }}>
              {FIELD_CONFIG.map(({ key, label, icon: Icon, placeholder, wide }) => (
                <div key={key} style={{ gridColumn: wide ? '1 / -1' : 'auto' }}>
                  <label style={labelStyle}>
                    <Icon size={11} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
                    {label}
                  </label>
                  {wide ? (
                    <textarea
                      value={draft[key]}
                      onChange={e => handleChange(key, e.target.value)}
                      placeholder={placeholder}
                      rows={key === 'footerNote' ? 3 : 2}
                      style={{ ...inputBase, resize: 'vertical', lineHeight: '1.5' }}
                      onFocus={e => e.target.style.borderColor = '#e8a13a'}
                      onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                    />
                  ) : (
                    <input
                      type="text" value={draft[key]}
                      onChange={e => handleChange(key, e.target.value)}
                      placeholder={placeholder}
                      style={inputBase}
                      onFocus={e => e.target.style.borderColor = '#e8a13a'}
                      onBlur={e => e.target.style.borderColor = '#2a2a2a'}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Bottom save bar */}
            <div style={{
              marginTop: '32px', paddingTop: '20px',
              borderTop: '1px solid #2a2a2a',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px',
            }}>
              {hasUnsaved && <span style={{ fontSize: '0.8rem', color: '#666' }}>Changes not saved yet — won't appear in View until saved.</span>}
              <button onClick={handleSave} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 28px', borderRadius: '10px', border: 'none',
                background: hasUnsaved ? 'linear-gradient(135deg, #e8a13a, #d4881e)' : 'rgba(232,161,58,0.2)',
                color: hasUnsaved ? '#241a14' : '#e8a13a',
                cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700,
                boxShadow: hasUnsaved ? '0 4px 18px rgba(232,161,58,0.45)' : 'none',
              }}
                onMouseEnter={e => { if (hasUnsaved) e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ VIEW TAB ══════════════════ */}
      {activeTab === 'view' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* View toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
            background: 'var(--card-bg, #1a1a1a)',
            border: '1px solid var(--apple-border, #2a2a2a)',
            borderRadius: '12px', padding: '10px 16px',
          }}>
            <div style={{ display: 'flex', gap: '4px', background: '#0f0f0f', borderRadius: '8px', padding: '3px' }}>
              {[{ id: 'preview', label: 'Preview', icon: Eye }, { id: 'code', label: 'HTML Code', icon: FileText }].map(t => (
                <button key={t.id} onClick={() => setViewMode(t.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.15s',
                  background: viewMode === t.id ? '#e8a13a' : 'transparent',
                  color: viewMode === t.id ? '#241a14' : '#888',
                }}>
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
            </div>

            {/* Active theme badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '20px',
              background: 'rgba(232,161,58,0.08)', border: '1px solid rgba(232,161,58,0.2)',
            }}>
              <div style={{ display: 'flex', gap: '3px' }}>
                {savedTheme.preview.map((c, i) => (
                  <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                ))}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#e8a13a', fontWeight: 600 }}>{savedTheme.name}</span>
            </div>

            {hasUnsaved && (
              <span style={{
                fontSize: '0.78rem', padding: '4px 10px', borderRadius: '20px',
                background: 'rgba(255,159,10,0.12)', color: '#ff9f0a',
                border: '1px solid rgba(255,159,10,0.3)', fontWeight: 600,
              }}>⚠ Unsaved edits not reflected — save first</span>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button onClick={handleCopy} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                border: '1px solid #2a2a2a',
                background: copied ? 'rgba(52,199,89,0.15)' : 'transparent',
                color: copied ? '#34c759' : '#888',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
              }}>
                <Copy size={13} /> {copied ? 'Copied!' : 'Copy HTML'}
              </button>
              <button
                onClick={handleDownload}
                disabled={generating}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 18px', borderRadius: '8px', border: 'none',
                  background: generating ? 'rgba(232,161,58,0.3)' : 'linear-gradient(135deg, #e8a13a, #d4881e)',
                  color: '#241a14', cursor: generating ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem', fontWeight: 700,
                  boxShadow: generating ? 'none' : '0 3px 12px rgba(232,161,58,0.4)',
                  opacity: generating ? 0.7 : 1,
                }}
              >
                <Download size={13} />
                {generating ? 'Generating…' : 'Download PDF'}
              </button>
            </div>
          </div>

          {/* Preview / Code panel */}
          <div style={{
            background: 'var(--card-bg, #1a1a1a)',
            border: '1px solid var(--apple-border, #2a2a2a)',
            borderRadius: '16px', overflow: 'hidden',
          }}>
            {viewMode === 'preview' ? (
              <iframe
                ref={iframeRef}
                srcDoc={savedHtml}
                title="Email Preview"
                scrolling="no"
                style={{ width: '100%', border: 'none', display: 'block', height: '200px' }}
                sandbox="allow-same-origin"
                onLoad={() => {
                  try {
                    const doc = iframeRef.current?.contentWindow?.document
                    if (doc) {
                      const h = doc.documentElement.scrollHeight || doc.body.scrollHeight
                      iframeRef.current.style.height = h + 'px'
                    }
                  } catch (e) {
                    console.warn('Failed to resize iframe:', e)
                  }
                }}
              />
            ) : (
              <pre style={{
                margin: 0, padding: '24px',
                fontSize: '0.75rem', lineHeight: '1.65',
                color: '#c9beb2', fontFamily: "'Fira Code', 'Courier New', monospace",
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {savedHtml}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
