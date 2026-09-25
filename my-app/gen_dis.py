dis = """\
import { useState, useMemo, useRef } from 'react'
import { Copy, Check, Image as ImageIcon, FileText } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const shareOrDownloadImage = async (dataUrl, filename) => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (isMobile && navigator.share) {
    try {
      const res = await fetch(dataUrl); const blob = await res.blob()
      const file = new File([blob], filename, { type: 'image/jpeg' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return }
    } catch (e) { console.log('Share failed', e) }
  }
  const link = document.createElement('a')
  link.download = filename; link.href = dataUrl
  document.body.appendChild(link); link.click(); document.body.removeChild(link)
}

export default function DisSubmissionStatsModule({ profiles = [], revenues = [], memberships = [], teams = [], disReports = [], loading = false }) {
  const [disFilterMode, setDisFilterMode] = useState('individual')
  const [disSelectedUserId, setDisSelectedUserId] = useState('')
  const [disSelectedTeamId, setDisSelectedTeamId] = useState('')
  const [disStartDate, setDisStartDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [disEndDate, setDisEndDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [disCopied, setDisCopied] = useState(false)
  const [disJpegGenerating, setDisJpegGenerating] = useState(false)
  const [disPdfGenerating, setDisPdfGenerating] = useState(false)
  const disCaptureRef = useRef(null)
  const disPdfCaptureRef = useRef(null)

  const nonAdminProfiles = useMemo(() => profiles.filter(p => p.platform_role !== 'admin' && !p.is_deactivated && !p.exclude_from_analytics), [profiles])

  const disStats = useMemo(() => {
    if (disFilterMode === 'individual' && !disSelectedUserId) return null
    if (disFilterMode === 'team' && !disSelectedTeamId) return null
    if (!disStartDate || !disEndDate) return null

    const start = new Date(disStartDate); start.setHours(0, 0, 0, 0)
    const end = new Date(disEndDate); end.setHours(0, 0, 0, 0)
    let totalDays = 0
    const validDates = []

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) continue
      if (d.getDay() === 6) {
        const dateOfMonth = d.getDate()
        const isFirstSaturday = dateOfMonth <= 7
        const isSecondSaturday = dateOfMonth > 7 && dateOfMonth <= 14
        if (d.getFullYear() === 2026 && d.getMonth() === 6) {
          if (isFirstSaturday) continue
        } else {
          if (isSecondSaturday) continue
        }
      }
      totalDays++
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      validDates.push(`${yyyy}-${mm}-${dd}`)
    }

    let usersToProcess
    if (disFilterMode === 'individual') {
      usersToProcess = nonAdminProfiles.filter(u => u.id === disSelectedUserId)
    } else if (disFilterMode === 'team') {
      const teamUserIds = new Set(memberships.filter(m => String(m.team_id) === String(disSelectedTeamId)).map(m => m.user_id))
      usersToProcess = nonAdminProfiles.filter(u => teamUserIds.has(u.id))
    } else {
      usersToProcess = [...nonAdminProfiles]
    }
    usersToProcess.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''))

    const results = usersToProcess.map(u => {
      let submitted = 0, missed = 0
      validDates.forEach(dateStr => {
        const hasReport = disReports.some(r => r.user_id === u.id && r.report_date === dateStr)
        if (hasReport) submitted++; else missed++
      })
      const userTeamId = memberships.find(m => m.user_id === u.id)?.team_id
      const team = teams.find(t => t.id === userTeamId)
      const cleanStr = s => (s || '').replace(/[\r\n]+/g, ' ').trim()
      const pct = validDates.length > 0 ? Math.round((submitted / validDates.length) * 100) : 0
      return { name: cleanStr(`${u.first_name || ''} ${u.last_name || ''}`), team: cleanStr(team ? team.name : 'No Team'), submitted, missed, percentage: `${pct}%` }
    })

    return {
      startDate: disStartDate, currentDate: disEndDate, totalDays, results,
      filterMode: disFilterMode,
      selectedTeamName: disFilterMode === 'team' && disSelectedTeamId ? teams.find(t => String(t.id) === String(disSelectedTeamId))?.name : null
    }
  }, [disFilterMode, disSelectedUserId, disSelectedTeamId, disStartDate, disEndDate, disReports, nonAdminProfiles, memberships, teams])

  const disFormattedText = useMemo(() => {
    if (!disStats || disStats.results.length === 0) return ''
    let text = ''
    if (disStats.filterMode === 'team' && disStats.selectedTeamName) {
      text += `DIS report of ${(disStats.selectedTeamName || '').replace(/[\r\n]+/g, ' ').trim()}\n\n`
    }
    text += `starting date : ${disStats.startDate}\ncurrent date: ${disStats.currentDate}\ntotal days : ${disStats.totalDays}\n\n`
    const parts = disStats.results.map(r => {
      if (disStats.filterMode === 'team') return `name: ${r.name}\nsubmitted : ${r.submitted}\nmissed : ${r.missed}\npercentage : ${r.percentage}`
      return `name: ${r.name}\nteam: ${r.team}\nsubmitted : ${r.submitted}\nmissed : ${r.missed}\npercentage : ${r.percentage}`
    })
    return text + parts.join('\n\n')
  }, [disStats])

  const handleCopyDis = () => {
    if (!disFormattedText) return
    navigator.clipboard.writeText(disFormattedText)
    setDisCopied(true); setTimeout(() => setDisCopied(false), 2000)
  }

  const handleDownloadJpeg = async () => {
    if (!disCaptureRef.current || !disFormattedText) return
    setDisJpegGenerating(true)
    try {
      const canvas = await html2canvas(disCaptureRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
      const safeTeamName = (disStats?.selectedTeamName || 'All_Teams').replace(/[^a-zA-Z0-9]/g, '_')
      await shareOrDownloadImage(dataUrl, `DIS_Report_${safeTeamName}_${disStartDate}.jpg`)
    } catch (err) { console.error('Error generating JPEG', err); alert('Failed to generate JPEG image.') }
    finally { setDisJpegGenerating(false) }
  }

  const handleDownloadPdf = () => {
    if (!disStats || !disStats.results) return
    setDisPdfGenerating(true)
    setTimeout(async () => {
      try {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const drawGradient = (x, y, w, h, color1, color2) => {
          const steps = 100; const stepH = h / steps
          for (let i = 0; i < steps; i++) {
            const ratio = i / steps
            const r = Math.round(color1[0] + (color2[0] - color1[0]) * ratio)
            const g = Math.round(color1[1] + (color2[1] - color1[1]) * ratio)
            const b = Math.round(color1[2] + (color2[2] - color1[2]) * ratio)
            doc.setFillColor(r, g, b); doc.rect(x, y + (i * stepH), w, stepH + 1.5, 'F')
          }
        }
        const teamGroups = {}
        disStats.results.forEach(r => { const t = r.team || 'Unassigned'; if (!teamGroups[t]) teamGroups[t] = []; teamGroups[t].push(r) })
        const teamsList = Object.keys(teamGroups).sort()
        drawGradient(0, 0, pageWidth, pageHeight, [15, 23, 42], [49, 46, 129])
        doc.setFont('helvetica', 'bold'); doc.setFontSize(36); doc.setTextColor(255, 255, 255)
        doc.text('Daily Individual Status (DIS) Report', pageWidth / 2, 180, { align: 'center' })
        doc.setFontSize(16); doc.setTextColor(191, 219, 254)
        doc.text(`Period: ${disStats.startDate} to ${disStats.currentDate}   |   Total Reportable Days: ${disStats.totalDays}`, pageWidth / 2, 215, { align: 'center' })
        teamsList.forEach(teamName => {
          const teamMembers = teamGroups[teamName]
          const chunked = []
          for (let i = 0; i < teamMembers.length; i += 9) chunked.push(teamMembers.slice(i, i + 9))
          chunked.forEach((chunk, chunkIdx) => {
            doc.addPage()
            drawGradient(0, 0, pageWidth, pageHeight, [15, 23, 42], [49, 46, 129])
            drawGradient(40, 40, pageWidth - 80, 75, [59, 130, 246], [79, 70, 229])
            doc.setDrawColor(255, 255, 255); doc.setLineWidth(1); doc.roundedRect(40, 40, pageWidth - 80, 75, 8, 8, 'S')
            doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(255, 255, 255)
            let titleStr = `Team Report: ${teamName}`; if (chunked.length > 1) titleStr += ` (Part ${chunkIdx + 1})`
            doc.text(titleStr, pageWidth / 2, 75, { align: 'center' })
            doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(224, 231, 255)
            doc.text(`Start: ${disStats.startDate}   |   End: ${disStats.currentDate}   |   Total Days: ${disStats.totalDays}   |   Members: ${teamMembers.length}`, pageWidth / 2, 98, { align: 'center' })
            let startX = 40, startY = 145
            const cols = 3, gapX = 24, gapY = 24
            const cardWidth = (pageWidth - 80 - (gapX * (cols - 1))) / cols, cardHeight = 130
            let currentX = startX, currentY = startY
            chunk.forEach((r) => {
              doc.setFillColor(5, 10, 20); doc.roundedRect(currentX + 8, currentY + 8, cardWidth, cardHeight, 16, 16, 'F')
              doc.setFillColor(255, 255, 255); doc.setDrawColor(255, 255, 255); doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 16, 16, 'FD')
              doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(30, 41, 59)
              let nameStr = r.name; if (nameStr.length > 18) nameStr = nameStr.substring(0, 15) + '...'
              doc.text(nameStr, currentX + 20, currentY + 32)
              const pct = parseInt(r.percentage)
              let pctColor = [225, 29, 72], pctBg = [255, 228, 230]
              if (pct >= 80) { pctColor = [5, 150, 105]; pctBg = [209, 250, 229] }
              else if (pct >= 50) { pctColor = [217, 119, 6]; pctBg = [254, 243, 199] }
              doc.setFillColor(pctBg[0], pctBg[1], pctBg[2]); doc.roundedRect(currentX + cardWidth - 55, currentY + 14, 40, 22, 11, 11, 'F')
              doc.setFontSize(11); doc.setTextColor(pctColor[0], pctColor[1], pctColor[2]); doc.text(`${r.percentage}`, currentX + cardWidth - 35, currentY + 29, { align: 'center' })
              const blockWidth = (cardWidth - 52) / 2, blockY = currentY + 54, blockHeight = 56
              doc.setFillColor(240, 253, 244); doc.setDrawColor(187, 247, 208); doc.setLineWidth(1); doc.roundedRect(currentX + 20, blockY, blockWidth, blockHeight, 8, 8, 'FD')
              doc.setFontSize(26); doc.setFont('helvetica', 'bold'); doc.setTextColor(5, 150, 105); doc.text(`${r.submitted}`, currentX + 20 + (blockWidth / 2), blockY + 34, { align: 'center' })
              doc.setFontSize(8); doc.setTextColor(15, 118, 110); doc.text('SUBMITTED', currentX + 20 + (blockWidth / 2), blockY + 48, { align: 'center' })
              doc.setFillColor(255, 241, 242); doc.setDrawColor(254, 205, 211); doc.roundedRect(currentX + 20 + blockWidth + 12, blockY, blockWidth, blockHeight, 8, 8, 'FD')
              doc.setFontSize(26); doc.setFont('helvetica', 'bold'); doc.setTextColor(225, 29, 72); doc.text(`${r.missed}`, currentX + 20 + blockWidth + 12 + (blockWidth / 2), blockY + 34, { align: 'center' })
              doc.setFontSize(8); doc.setTextColor(190, 18, 60); doc.text('MISSED', currentX + 20 + blockWidth + 12 + (blockWidth / 2), blockY + 48, { align: 'center' })
              currentX += cardWidth + gapX
              if (currentX + cardWidth > pageWidth - 20) { currentX = startX; currentY += cardHeight + gapY }
            })
          })
        })
        const filename = `DIS_Report_All_Members_${disStartDate}.pdf`
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        if (isMobile && navigator.share) {
          const pdfBlob = doc.output('blob')
          const file = new File([pdfBlob], filename, { type: 'application/pdf' })
          if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); setDisPdfGenerating(false); return }
        }
        doc.save(filename)
      } catch (err) { console.error('Error generating PDF', err); alert('Failed to generate PDF.') }
      finally { setDisPdfGenerating(false) }
    }, 100)
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>Loading stats...</div>

  return (
    <div>
      <div className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>DIS Submission Stats</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Track daily individual status submissions by member or team.{' '}
                {disStats && <span style={{ color: 'var(--apple-accent-blue)', fontWeight: '600' }}>({disStats.results.length} users)</span>}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {disFilterMode === 'all' && (
                <button onClick={handleDownloadPdf} disabled={!disStats || disStats.results.length === 0 || disPdfGenerating}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: (!disStats || disStats.results.length === 0 || disPdfGenerating) ? 'not-allowed' : 'pointer', minHeight: '44px', opacity: (!disStats || disStats.results.length === 0 || disPdfGenerating) ? 0.5 : 1 }}>
                  <FileText size={16} />{disPdfGenerating ? 'Generating...' : 'Save as PDF'}
                </button>
              )}
              <button onClick={handleDownloadJpeg} disabled={!disStats || disStats.results.length === 0 || disJpegGenerating}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: (!disStats || disStats.results.length === 0 || disJpegGenerating) ? 'not-allowed' : 'pointer', minHeight: '44px', opacity: (!disStats || disStats.results.length === 0 || disJpegGenerating) ? 0.5 : 1 }}>
                <ImageIcon size={16} />{disJpegGenerating ? 'Generating...' : 'Save as JPEG'}
              </button>
              <button onClick={handleCopyDis} disabled={!disStats || disStats.results.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: (!disStats || disStats.results.length === 0) ? 'not-allowed' : 'pointer', minHeight: '44px', opacity: (!disStats || disStats.results.length === 0) ? 0.5 : 1 }}>
                {disCopied ? <Check size={16} color="var(--apple-accent-green)" /> : <Copy size={16} />}
                {disCopied ? 'Copied!' : 'Copy Format'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 16px', background: 'var(--apple-bg-secondary)', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Filter By:</span>
              <div className="apple-pill-tabs">
                <button className={`apple-pill-tab ${disFilterMode === 'individual' ? 'active' : ''}`} onClick={() => setDisFilterMode('individual')} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Individual</button>
                <button className={`apple-pill-tab ${disFilterMode === 'team' ? 'active' : ''}`} onClick={() => setDisFilterMode('team')} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Team</button>
                <button className={`apple-pill-tab ${disFilterMode === 'all' ? 'active' : ''}`} onClick={() => setDisFilterMode('all')} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>All Members</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {disFilterMode === 'individual' && (
                <select value={disSelectedUserId} onChange={e => setDisSelectedUserId(e.target.value)}
                  style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px', flex: 1, minWidth: '200px' }}>
                  <option value="">-- Choose a user --</option>
                  {[...nonAdminProfiles].sort((a, b) => (a.first_name || '').localeCompare(b.first_name || '')).map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>
              )}
              {disFilterMode === 'team' && (
                <select value={disSelectedTeamId} onChange={e => setDisSelectedTeamId(e.target.value)}
                  style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px', flex: 1, minWidth: '200px' }}>
                  <option value="">-- Choose a team --</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
              <input type="date" value={disStartDate} onChange={e => setDisStartDate(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px' }} />
              <span style={{ color: 'var(--text-secondary)' }}>to</span>
              <input type="date" value={disEndDate} onChange={e => setDisEndDate(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px' }} />
            </div>
          </div>
        </div>

        {disFormattedText && (
          <div style={{ marginTop: '16px', padding: '16px', background: 'var(--apple-bg-secondary)', borderRadius: '12px', border: '1px solid var(--apple-border)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'var(--apple-text-primary)', fontSize: '0.9rem', maxHeight: '400px', overflowY: 'auto' }}>
            {disFormattedText}
          </div>
        )}

        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div ref={disCaptureRef} style={{ padding: disStats?.filterMode === 'individual' ? '60px' : '40px', background: disStats?.filterMode === 'individual' ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' : 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)', color: disStats?.filterMode === 'individual' ? '#f8fafc' : '#102a43', fontFamily: 'system-ui, sans-serif', width: disStats?.filterMode === 'individual' ? '860px' : '1200px', borderRadius: '24px', boxSizing: 'border-box' }}>
            {disStats && disStats.results.length > 0 ? (
              disStats.filterMode === 'individual' ? (
                (() => {
                  const user = disStats.results[0]
                  const parts = user.name.split(' ').filter(Boolean)
                  const shortName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : (parts[0] || 'User')
                  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : (parts[0]?.[0] || 'U')
                  const pct = parseInt(user.percentage)
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '32px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: '800' }}>DIS Compliance Report</h2>
                        <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>{disStats.startDate} — {disStats.currentDate}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: '800', color: '#ffffff' }}>{initials}</div>
                        <div style={{ textAlign: 'center' }}>
                          <h1 style={{ margin: '0 0 4px 0', fontSize: '42px', fontWeight: '900', color: '#ffffff' }}>{shortName}</h1>
                          <div style={{ fontSize: '18px', color: '#cbd5e1', fontWeight: '600', textTransform: 'uppercase' }}>{user.team}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
                        <div style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px', width: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Compliance</div>
                          <div style={{ fontSize: '56px', fontWeight: '900', color: pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171' }}>{user.percentage}</div>
                        </div>
                        <div style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px', width: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Submitted</div>
                          <div style={{ fontSize: '56px', fontWeight: '900', color: '#f8fafc' }}>{user.submitted}</div>
                          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginTop: '8px' }}>of {disStats.totalDays} Days</div>
                        </div>
                        <div style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '32px', width: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Missed</div>
                          <div style={{ fontSize: '56px', fontWeight: '900', color: user.missed > 0 ? '#f87171' : '#f8fafc' }}>{user.missed}</div>
                          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginTop: '8px' }}>{user.missed > 0 ? 'Action Required' : 'Perfect Streak'}</div>
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '32px', background: '#ffffff', padding: '20px', borderRadius: '16px' }}>
                    <h2 style={{ margin: '0 0 12px 0', color: '#102a43', fontSize: '28px', fontWeight: '800' }}>
                      {disStats.filterMode === 'team' && disStats.selectedTeamName ? `Team Report: ${disStats.selectedTeamName}` : 'DIS Compliance Report'}
                    </h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '14px', color: '#486581', fontWeight: '600' }}>
                      <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>Start: {disStats.startDate}</span>
                      <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>End: {disStats.currentDate}</span>
                      <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>Total Days: {disStats.totalDays}</span>
                      <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>Total Users: {disStats.results.length}</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {disStats.results.map((r, i) => {
                      const pct = parseInt(r.percentage)
                      let pctColor = '#ef4444', pctBg = '#fee2e2'
                      if (pct >= 80) { pctColor = '#10b981'; pctBg = '#d1fae5' }
                      else if (pct >= 50) { pctColor = '#f59e0b'; pctBg = '#fef3c7' }
                      return (
                        <div key={i} style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontSize: '15px', color: '#334155', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</h4>
                              {disStats.filterMode !== 'team' && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.team}</div>}
                            </div>
                            <div style={{ background: pctBg, color: pctColor, padding: '2px 8px', borderRadius: '20px', fontSize: '13px', fontWeight: '800', border: `1px solid ${pctColor}40`, marginLeft: '8px' }}>{r.percentage}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', flex: 1, justifyContent: 'center' }}>
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>S:</span>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#10b981' }}>{r.submitted}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', flex: 1, justifyContent: 'center' }}>
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>M:</span>
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#ef4444' }}>{r.missed}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            ) : (
              <div style={{ fontSize: '18px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{disFormattedText}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
"""

with open('src/components/stats/DisSubmissionStatsModule.jsx', 'w', encoding='utf-8') as f:
    f.write(dis)
print('DisSubmissionStatsModule.jsx written:', len(dis), 'chars')
