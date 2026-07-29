import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { Copy, Check, X, Image as ImageIcon, FileText } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { normalizeMonth, getAvailableYears, MONTH_NAMES, isFutureMonth } from '../../utils/revenueUtils'

const shareOrDownloadImage = async (dataUrl, filename) => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile && navigator.share) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (error) {
      console.log('Web Share API failed:', error);
    }
  }

  // Fallback to standard download for desktop or if sharing fails
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function CopyStats() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [profiles, setProfiles] = useState([])
  const [revenues, setRevenues] = useState([])
  const [memberships, setMemberships] = useState([])
  const [disReports, setDisReports] = useState([])

  const [revFilterYear, setRevFilterYear] = useState(new Date().getFullYear())
  const [revFilterMonth, setRevFilterMonth] = useState(new Date().getMonth())
  const [revFilterTeamId, setRevFilterTeamId] = useState('all')
  const [revFilterRange, setRevFilterRange] = useState('100-300')
  const [copied, setCopied] = useState(false)
  const [excludedTeams, setExcludedTeams] = useState([])
  const [excludedUsers, setExcludedUsers] = useState([])
  const [analysisMode, setAnalysisMode] = useState('brackets')
  const [streakDuration, setStreakDuration] = useState(3)

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
  const disCaptureRef = useRef(null)

  const [disPdfGenerating, setDisPdfGenerating] = useState(false)
  const disPdfCaptureRef = useRef(null)

  const [revJpegGenerating, setRevJpegGenerating] = useState(false)
  const revCaptureRef = useRef(null)

  const loadAllData = async () => {
    try {
      const [teamsRes, profilesRes, revRes, disRes] = await Promise.all([
        supabase.from('teams').select('*').order('name', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('monthly_revenues').select('*'),
        supabase.from('dis_reports').select('*'),
      ])

      if (teamsRes.data) setTeams(teamsRes.data)
      if (profilesRes.data) {
        setProfiles(profilesRes.data)
        const mems = profilesRes.data
          .filter(p => p.team_id)
          .map(p => ({
            user_id: p.id,
            team_id: p.team_id,
            team_role: p.platform_role === 'teamlead' ? 'lead' : 'member'
          }))
        setMemberships(mems)
      }
      if (revRes.data) setRevenues(revRes.data)
      if (disRes.data) setDisReports(disRes.data)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    loadAllData() 
  }, [])

  useEffect(() => {
    if (isFutureMonth(revFilterYear, revFilterMonth)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevFilterMonth(new Date().getMonth());
    }
  }, [revFilterYear, revFilterMonth]);

  const nonAdminProfiles = useMemo(
    () => profiles.filter(p => p.platform_role !== 'admin' && !p.is_deactivated && !p.exclude_from_analytics),
    [profiles]
  )
  const nonAdminIds = useMemo(
    () => new Set(nonAdminProfiles.map(p => p.id)),
    [nonAdminProfiles]
  )
  const nonAdminRevenues = useMemo(
    () => revenues.filter(r => nonAdminIds.has(r.user_id)),
    [revenues, nonAdminIds]
  )

  const revFilterMonthStr = useMemo(() => {
    const m = String(revFilterMonth + 1).padStart(2, '0')
    return `${revFilterYear}-${m}-01`
  }, [revFilterYear, revFilterMonth])

  const usersInRevenueRange = useMemo(() => {
    let users = nonAdminProfiles;
    
    if (revFilterTeamId !== 'all') {
      const teamUserIds = new Set(memberships.filter(m => String(m.team_id) === String(revFilterTeamId)).map(m => m.user_id));
      users = users.filter(u => teamUserIds.has(u.id));
    }
    
    const usersWithRev = users.map(u => {
      const userRevs = nonAdminRevenues.filter(r => r.user_id === u.id && normalizeMonth(r.revenue_month) === revFilterMonthStr);
      const totalRev = userRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      
      const userTeamId = memberships.find(m => m.user_id === u.id)?.team_id;
      const teamName = teams.find(t => t.id === userTeamId)?.name || 'No Team';
      
      return { ...u, totalRev, teamName };
    });
    
    let filteredUsers = usersWithRev.filter(u => {
      const r = u.totalRev;
      switch (revFilterRange) {
        case '0': return r === 0;
        case '100-300': return r >= 100 && r < 300;
        case '300-600': return r >= 300 && r < 600;
        case '600-1000': return r >= 600 && r < 1000;
        case '1000-1500': return r >= 1000 && r < 1500;
        case '1500-2000': return r >= 1500 && r < 2000;
        case '2000-2500': return r >= 2000 && r < 2500;
        case '2500-3000': return r >= 2500 && r < 3000;
        case '3000+': return r >= 3000;
        default: return false;
      }
    });
    
    if (excludedTeams.length > 0) {
      const exTeamSet = new Set(excludedTeams.map(id => String(id)));
      filteredUsers = filteredUsers.filter(u => {
        const tId = memberships.find(m => m.user_id === u.id)?.team_id;
        return !exTeamSet.has(String(tId));
      });
    }

    if (excludedUsers.length > 0) {
      const exUserSet = new Set(excludedUsers.map(id => String(id)));
      filteredUsers = filteredUsers.filter(u => !exUserSet.has(String(u.id)));
    }

    return filteredUsers.sort((a, b) => b.totalRev - a.totalRev);
    
  }, [nonAdminProfiles, nonAdminRevenues, memberships, teams, revFilterTeamId, revFilterMonthStr, revFilterRange, excludedTeams, excludedUsers]);

  const streakUsers = useMemo(() => {
    if (analysisMode !== 'streak') return [];
    
    const currentDate = new Date();
    const months = [];
    for (let i = 0; i < streakDuration; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${d.getFullYear()}-${mStr}-01`);
    }
    
    let users = nonAdminProfiles;
    
    if (revFilterTeamId !== 'all') {
      const teamUserIds = new Set(memberships.filter(m => String(m.team_id) === String(revFilterTeamId)).map(m => m.user_id));
      users = users.filter(u => teamUserIds.has(u.id));
    }

    const usersWithStreak = users.map(u => {
      const userRevs = nonAdminRevenues.filter(r => r.user_id === u.id && months.includes(normalizeMonth(r.revenue_month)));
      const totalRev = userRevs.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      
      const userTeamId = memberships.find(m => m.user_id === u.id)?.team_id;
      const teamName = teams.find(t => t.id === userTeamId)?.name || 'No Team';
      
      return { ...u, totalRev, teamName };
    });

    let zeroUsers = usersWithStreak.filter(u => u.totalRev === 0);

    if (excludedTeams.length > 0) {
      const exTeamSet = new Set(excludedTeams.map(id => String(id)));
      zeroUsers = zeroUsers.filter(u => {
        const tId = memberships.find(m => m.user_id === u.id)?.team_id;
        return !exTeamSet.has(String(tId));
      });
    }

    if (excludedUsers.length > 0) {
      const exUserSet = new Set(excludedUsers.map(id => String(id)));
      zeroUsers = zeroUsers.filter(u => !exUserSet.has(String(u.id)));
    }

    return zeroUsers.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));
  }, [analysisMode, streakDuration, nonAdminProfiles, nonAdminRevenues, memberships, teams, revFilterTeamId, excludedTeams, excludedUsers]);

  const handleCopyResults = () => {
    const listToCopy = analysisMode === 'brackets' ? usersInRevenueRange : streakUsers;
    if (listToCopy.length === 0) return
    
    let titleBase;
    if (analysisMode === 'streak') {
      titleBase = `Zero Revenue in Last ${streakDuration} Month${streakDuration > 1 ? 's' : ''}`;
    } else {
      const teamLabel = revFilterTeamId === 'all' ? 'All Teams' : (teams.find(t => String(t.id) === String(revFilterTeamId))?.name || 'Selected Team');
      const monthLabel = MONTH_NAMES[revFilterMonth];
      let rangeLabel = revFilterRange;
      if (rangeLabel === '0') rangeLabel = '$0';
      else if (rangeLabel.includes('-')) rangeLabel = `$${rangeLabel.replace('-', ' - $')}`;
      else rangeLabel = `$${rangeLabel}`;
      
      titleBase = `Revenue: ${rangeLabel} for ${teamLabel} in ${monthLabel} ${revFilterYear}`;
    }

    let exclusions = '';
    const exTeamsNames = excludedTeams.map(id => teams.find(t => String(t.id) === String(id))?.name).filter(Boolean);
    const exUsersNames = excludedUsers.map(id => {
      const u = nonAdminProfiles.find(p => String(p.id) === String(id));
      return u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : null;
    }).filter(Boolean);

    if (exTeamsNames.length > 0 || exUsersNames.length > 0) {
      exclusions = ' (Excluding: ';
      const parts = [];
      if (exTeamsNames.length > 0) parts.push(`${exTeamsNames.join(', ')} team${exTeamsNames.length > 1 ? 's' : ''}`);
      if (exUsersNames.length > 0) parts.push(`${exUsersNames.join(', ')} user${exUsersNames.length > 1 ? 's' : ''}`);
      exclusions += parts.join(' and ') + ')';
    }

    const reportTitle = `${titleBase}${exclusions}\n${'='.repeat((titleBase + exclusions).length)}\n\n`;
    
    const cleanStr = (s) => (s || '').replace(/[\r\n]+/g, ' ').trim();
    const maxNameLen = Math.max("Name".length, ...listToCopy.map(u => cleanStr(`${u.first_name || ''} ${u.last_name || ''}`).length));
    const maxTeamLen = Math.max("Team".length, ...listToCopy.map(u => cleanStr(u.teamName).length));
    
    const padName = (str) => str.padEnd(maxNameLen + 4, ' ');
    const padTeam = (str) => str.padEnd(maxTeamLen + 4, ' ');

    let header = `${padName("Name")}\t${padTeam("Team")}\tRevenue\n`
    if (analysisMode === 'streak') {
      header = `${padName("Name")}\tTeam\n`
    }
    
    const rows = listToCopy.map(u => {
      const nameStr = cleanStr(`${u.first_name || ''} ${u.last_name || ''}`);
      const teamStr = cleanStr(u.teamName);
      if (analysisMode === 'streak') {
        return `${padName(nameStr)}\t${teamStr}`
      } else {
        return `${padName(nameStr)}\t${padTeam(teamStr)}\t$${u.totalRev.toFixed(2)}`
      }
    }).join('\n')
    
    navigator.clipboard.writeText(reportTitle + header + rows)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const disStats = useMemo(() => {
    if (disFilterMode === 'individual' && !disSelectedUserId) return null;
    if (disFilterMode === 'team' && !disSelectedTeamId) return null;
    if (!disStartDate || !disEndDate) return null;
    
    const start = new Date(disStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(disEndDate);
    end.setHours(0, 0, 0, 0);

    let totalDays = 0;
    const validDates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) continue; // Skip Sunday
      
      // Handle Saturday Holidays
      if (d.getDay() === 6) {
        const dateOfMonth = d.getDate();
        const isFirstSaturday = dateOfMonth <= 7;
        const isSecondSaturday = dateOfMonth > 7 && dateOfMonth <= 14;
        
        // For July 2026, 1st Saturday is a holiday. Otherwise, default to 2nd Saturday.
        if (d.getFullYear() === 2026 && d.getMonth() === 6) {
          if (isFirstSaturday) continue;
        } else {
          if (isSecondSaturday) continue;
        }
      }

      totalDays++;
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      validDates.push(`${yyyy}-${mm}-${dd}`);
    }

    let usersToProcess;
    if (disFilterMode === 'individual') {
      usersToProcess = nonAdminProfiles.filter(u => u.id === disSelectedUserId);
    } else if (disFilterMode === 'team') {
      const teamUserIds = new Set(memberships.filter(m => String(m.team_id) === String(disSelectedTeamId)).map(m => m.user_id));
      usersToProcess = nonAdminProfiles.filter(u => teamUserIds.has(u.id));
    } else {
      usersToProcess = [...nonAdminProfiles];
    }

    usersToProcess.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));

    const results = usersToProcess.map(u => {
      let submitted = 0;
      let missed = 0;
      
      validDates.forEach(dateStr => {
        const hasReport = disReports.some(r => r.user_id === u.id && r.report_date === dateStr);
        if (hasReport) submitted++;
        else missed++;
      });

      const userTeamId = memberships.find(m => m.user_id === u.id)?.team_id;
      const team = teams.find(t => t.id === userTeamId);

      const cleanStr = (s) => (s || '').replace(/[\r\n]+/g, ' ').trim();
      const pct = validDates.length > 0 ? Math.round((submitted / validDates.length) * 100) : 0;
      return {
        name: cleanStr(`${u.first_name || ''} ${u.last_name || ''}`),
        team: cleanStr(team ? team.name : 'No Team'),
        submitted,
        missed,
        percentage: `${pct}%`
      };
    });

    return {
      startDate: disStartDate,
      currentDate: disEndDate,
      totalDays,
      results,
      filterMode: disFilterMode,
      selectedTeamName: disFilterMode === 'team' && disSelectedTeamId ? teams.find(t => String(t.id) === String(disSelectedTeamId))?.name : null
    }
  }, [disFilterMode, disSelectedUserId, disSelectedTeamId, disStartDate, disEndDate, disReports, nonAdminProfiles, memberships, teams]);

  const disFormattedText = useMemo(() => {
    if (!disStats || disStats.results.length === 0) return '';
    
    let text = '';
    if (disStats.filterMode === 'team' && disStats.selectedTeamName) {
      const cleanTeamName = (disStats.selectedTeamName || '').replace(/[\r\n]+/g, ' ').trim();
      text += `DIS report of ${cleanTeamName}\n\n`;
    }
    
    text += `starting date : ${disStats.startDate}\ncurrent date: ${disStats.currentDate}\ntotal days : ${disStats.totalDays}\n\n`;
    
    const parts = disStats.results.map(r => {
      if (disStats.filterMode === 'team') {
        return `name: ${r.name}\nsubmitted : ${r.submitted}\nmissed : ${r.missed}\npercentage : ${r.percentage}`;
      } else {
        return `name: ${r.name}\nteam: ${r.team}\nsubmitted : ${r.submitted}\nmissed : ${r.missed}\npercentage : ${r.percentage}`;
      }
    });
    
    text += parts.join('\n\n');
    return text;
  }, [disStats]);

  const handleCopyDis = () => {
    if (!disFormattedText) return;
    navigator.clipboard.writeText(disFormattedText);
    setDisCopied(true);
    setTimeout(() => setDisCopied(false), 2000);
  }

  const handleDownloadJpeg = async () => {
    if (!disCaptureRef.current || !disFormattedText) return;
    setDisJpegGenerating(true);
    try {
      const canvas = await html2canvas(disCaptureRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const safeTeamName = (disStats?.selectedTeamName || 'All_Teams').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `DIS_Report_${safeTeamName}_${disStartDate}.jpg`;
      await shareOrDownloadImage(dataUrl, filename);
    } catch (err) {
      console.error('Error generating JPEG', err);
      alert('Failed to generate JPEG image.');
    } finally {
      setDisJpegGenerating(false);
    }
  }

  const handleDownloadPdf = () => {
    if (!disStats || !disStats.results) return;
    setDisPdfGenerating(true);
    
    // We use setTimeout to allow UI to show 'Generating...' state
    setTimeout(async () => {
      try {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Helper to draw vertical gradient
        const drawGradient = (x, y, w, h, color1, color2) => {
          const steps = 100;
          const stepH = h / steps;
          for (let i = 0; i < steps; i++) {
            const ratio = i / steps;
            const r = Math.round(color1[0] + (color2[0] - color1[0]) * ratio);
            const g = Math.round(color1[1] + (color2[1] - color1[1]) * ratio);
            const b = Math.round(color1[2] + (color2[2] - color1[2]) * ratio);
            doc.setFillColor(r, g, b);
            doc.rect(x, y + (i * stepH), w, stepH + 1.5, 'F'); // slightly overlap
          }
        };
        
        const teamGroups = {};
        disStats.results.forEach(r => {
          const t = r.team || 'Unassigned';
          if (!teamGroups[t]) teamGroups[t] = [];
          teamGroups[t].push(r);
        });
        
        const teams = Object.keys(teamGroups).sort();
        
        // --- Dedicated Cover Page (Page 1) ---
        drawGradient(0, 0, pageWidth, pageHeight, [15, 23, 42], [49, 46, 129]);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(36);
        doc.setTextColor(255, 255, 255); // White for dark bg
        doc.text("Daily Individual Status (DIS) Report", pageWidth / 2, 180, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setTextColor(191, 219, 254); // Blue 200
        const coverSubtext = `Period: ${disStats.startDate} to ${disStats.currentDate}   |   Total Reportable Days: ${disStats.totalDays}`;
        doc.text(coverSubtext, pageWidth / 2, 215, { align: 'center' });
        
        // Warning Description Box on Cover Page (Navy & Gold Theme)
        doc.setFillColor(30, 41, 59); // dark slate
        doc.setDrawColor(234, 179, 8); // gold border
        doc.setLineWidth(2);
        doc.roundedRect(pageWidth / 2 - 320, 270, 640, 75, 12, 12, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(253, 224, 71); // bright gold
        doc.text("Calculation Rules for this Month", pageWidth / 2, 305, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255); // white
        doc.text("Total Days in Month: 31   |   Sundays: 4   |   Saturday Holidays: 1", pageWidth / 2, 328, { align: 'center' });
        
        // --- Draw Team Pages ---
        teams.forEach((teamName) => {
          const teamMembers = teamGroups[teamName];
          
          // Chunk into 9 cards per page (3x3 grid)
          const chunked = [];
          for (let i = 0; i < teamMembers.length; i += 9) {
            chunked.push(teamMembers.slice(i, i + 9));
          }
          
          chunked.forEach((chunk, chunkIdx) => {
            doc.addPage();
            
            // Draw full page rich gradient background
            drawGradient(0, 0, pageWidth, pageHeight, [15, 23, 42], [49, 46, 129]);
            
            // Header box (Vibrant Blue/Indigo)
            drawGradient(40, 40, pageWidth - 80, 75, [59, 130, 246], [79, 70, 229]);
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(1);
            doc.roundedRect(40, 40, pageWidth - 80, 75, 8, 8, 'S'); 
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(26);
            doc.setTextColor(255, 255, 255);
            let titleStr = `Team Report: ${teamName}`;
            if (chunked.length > 1) titleStr += ` (Part ${chunkIdx + 1})`;
            doc.text(titleStr, pageWidth / 2, 75, { align: 'center' });
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(224, 231, 255); // Indigo 100
            const subtext = `Start: ${disStats.startDate}   |   End: ${disStats.currentDate}   |   Total Days: ${disStats.totalDays}   |   Team Members: ${teamMembers.length}`;
            doc.text(subtext, pageWidth / 2, 98, { align: 'center' });
            
            let startX = 40;
            let startY = 145; // Start exactly below the header
            const cols = 3;
            const gapX = 24;
            const gapY = 24;
            const cardWidth = (pageWidth - 80 - (gapX * (cols - 1))) / cols;
            const cardHeight = 130;
            
            let currentX = startX;
            let currentY = startY;
            
            chunk.forEach((r, i) => {
              // Draw shadow for dark background
              doc.setFillColor(5, 10, 20); // very dark, almost black
              doc.roundedRect(currentX + 8, currentY + 8, cardWidth, cardHeight, 16, 16, 'F');
              
              // Card BG
              doc.setFillColor(255, 255, 255);
              doc.setDrawColor(255, 255, 255);
              doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 16, 16, 'FD');
              
              // Name
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(16);
              doc.setTextColor(30, 41, 59);
              let nameStr = r.name;
              if (nameStr.length > 18) nameStr = nameStr.substring(0, 15) + '...';
              doc.text(nameStr, currentX + 20, currentY + 32);
              
              // Pill
              const pct = parseInt(r.percentage);
              let pctColor = [225, 29, 72];
              let pctBg = [255, 228, 230];
              if (pct >= 80) { pctColor = [5, 150, 105]; pctBg = [209, 250, 229]; }
              else if (pct >= 50) { pctColor = [217, 119, 6]; pctBg = [254, 243, 199]; }
              
              doc.setFillColor(pctBg[0], pctBg[1], pctBg[2]);
              doc.roundedRect(currentX + cardWidth - 55, currentY + 14, 40, 22, 11, 11, 'F');
              
              doc.setFontSize(11);
              doc.setTextColor(pctColor[0], pctColor[1], pctColor[2]);
              doc.text(`${r.percentage}`, currentX + cardWidth - 35, currentY + 29, { align: 'center' });
              
              // Blocks
              const blockWidth = (cardWidth - 52) / 2;
              const blockY = currentY + 54;
              const blockHeight = 56;
              
              // Submitted
              doc.setFillColor(240, 253, 244);
              doc.setDrawColor(187, 247, 208);
              doc.setLineWidth(1);
              doc.roundedRect(currentX + 20, blockY, blockWidth, blockHeight, 8, 8, 'FD');
              
              doc.setFontSize(26);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(5, 150, 105);
              doc.text(`${r.submitted}`, currentX + 20 + (blockWidth/2), blockY + 34, { align: 'center' });
              
              doc.setFontSize(8);
              doc.setTextColor(15, 118, 110);
              doc.text('SUBMITTED', currentX + 20 + (blockWidth/2), blockY + 48, { align: 'center' });
              
              // Missed
              doc.setFillColor(255, 241, 242);
              doc.setDrawColor(254, 205, 211);
              doc.roundedRect(currentX + 20 + blockWidth + 12, blockY, blockWidth, blockHeight, 8, 8, 'FD');
              
              doc.setFontSize(26);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(225, 29, 72);
              doc.text(`${r.missed}`, currentX + 20 + blockWidth + 12 + (blockWidth/2), blockY + 34, { align: 'center' });
              
              doc.setFontSize(8);
              doc.setTextColor(190, 18, 60);
              doc.text('MISSED', currentX + 20 + blockWidth + 12 + (blockWidth/2), blockY + 48, { align: 'center' });
              
              currentX += cardWidth + gapX;
              if (currentX + cardWidth > pageWidth - 20) {
                currentX = startX;
                currentY += cardHeight + gapY;
              }
            });
          });
        });
        
        const safeTeamName = (disStats?.selectedTeamName || 'All_Teams').replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `DIS_Report_All_Members_${disStartDate}.pdf`;
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile && navigator.share) {
          const pdfBlob = doc.output('blob');
          const file = new File([pdfBlob], filename, { type: 'application/pdf' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
            setDisPdfGenerating(false);
            return;
          }
        }
        
        doc.save(filename);
      } catch (err) {
        console.error('Error generating Native PDF', err);
        alert('Failed to generate PDF.');
      } finally {
        setDisPdfGenerating(false);
      }
    }, 100);
  }

  const handleDownloadRevJpeg = async () => {
    if (!revCaptureRef.current) return;
    setRevJpegGenerating(true);
    try {
      const canvas = await html2canvas(revCaptureRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const safeTitle = (analysisMode === 'brackets' ? 'Revenue_Report' : 'Zero_Revenue_Streak').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${safeTitle}.jpg`;
      await shareOrDownloadImage(dataUrl, filename);
    } catch (err) {
      console.error('Error generating JPEG', err);
      alert('Failed to generate JPEG image.');
    } finally {
      setRevJpegGenerating(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-secondary)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
        <span>Loading stats...</span>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="admin-page-header" style={{ marginBottom: 0 }}>
        <div className="admin-page-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
          <Copy size={28} />
        </div>
        <div>
          <h1 className="admin-page-title">Copy Stats</h1>
          <p className="admin-page-subtitle">Exportable metrics and user streaks.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>Revenue & Streak Analysis</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Identify users by revenue ranges or inactivity streaks. <span style={{ color: 'var(--apple-accent-blue)', fontWeight: '600' }}>({analysisMode === 'brackets' ? usersInRevenueRange.length : streakUsers.length} found)</span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="apple-pill-tabs" style={{ marginRight: '8px' }}>
                <button 
                  className={`apple-pill-tab ${analysisMode === 'brackets' ? 'active' : ''}`} 
                  onClick={() => setAnalysisMode('brackets')}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Revenue Ranges
                </button>
                <button 
                  className={`apple-pill-tab ${analysisMode === 'streak' ? 'active' : ''}`} 
                  onClick={() => setAnalysisMode('streak')}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Zero-Revenue Streaks
                </button>
              </div>
              <button
                onClick={handleDownloadRevJpeg}
                disabled={analysisMode === 'brackets' ? usersInRevenueRange.length === 0 : streakUsers.length === 0 || revJpegGenerating}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                  background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                  border: '1px solid var(--apple-border)', cursor: (analysisMode === 'brackets' ? usersInRevenueRange.length === 0 : streakUsers.length === 0 || revJpegGenerating) ? 'not-allowed' : 'pointer', minHeight: '44px',
                  opacity: (analysisMode === 'brackets' ? usersInRevenueRange.length === 0 : streakUsers.length === 0 || revJpegGenerating) ? 0.5 : 1
                }}
              >
                <ImageIcon size={16} />
                {revJpegGenerating ? 'Generating...' : 'Save as JPEG'}
              </button>
              <button
                onClick={handleCopyResults}
                disabled={analysisMode === 'brackets' ? usersInRevenueRange.length === 0 : streakUsers.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                  background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                  border: '1px solid var(--apple-border)', cursor: (analysisMode === 'brackets' ? usersInRevenueRange.length === 0 : streakUsers.length === 0) ? 'not-allowed' : 'pointer', minHeight: '44px',
                  opacity: (analysisMode === 'brackets' ? usersInRevenueRange.length === 0 : streakUsers.length === 0) ? 0.5 : 1
                }}
              >
                {copied ? <Check size={16} color="var(--apple-accent-green)" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', padding: '12px 16px', background: 'var(--apple-bg-secondary)', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginRight: '8px' }}>Filters:</span>
            <select
              value={revFilterTeamId}
              onChange={e => setRevFilterTeamId(e.target.value)}
              style={{
                padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px',
              }}
            >
              <option value="all">All Teams</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {analysisMode === 'brackets' ? (
              <>
                <select
                  value={revFilterMonth}
                  onChange={e => setRevFilterMonth(Number(e.target.value))}
                  style={{
                    padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                    background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                    border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px',
                  }}
                >
                  {MONTH_NAMES.map((name, idx) => <option key={idx} value={idx} disabled={isFutureMonth(revFilterYear, idx)}>{name}</option>)}
                </select>
                <select
                  value={revFilterYear}
                  onChange={e => setRevFilterYear(Number(e.target.value))}
                  style={{
                    padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                    background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                    border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px',
                  }}
                >
                  {getAvailableYears().map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  value={revFilterRange}
                  onChange={e => setRevFilterRange(e.target.value)}
                  style={{
                    padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                    background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                    border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px',
                  }}
                >
                  <option value="0">0 revenue</option>
                  <option value="100-300">100 - 300</option>
                  <option value="300-600">300 - 600</option>
                  <option value="600-1000">600 - 1000</option>
                  <option value="1000-1500">1000 - 1500</option>
                  <option value="1500-2000">1500 - 2000</option>
                  <option value="2000-2500">2000 - 2500</option>
                  <option value="2500-3000">2500 - 3000</option>
                  <option value="3000+">3000 and above</option>
                </select>
              </>
            ) : (
              <select
                value={streakDuration}
                onChange={e => setStreakDuration(Number(e.target.value))}
                style={{
                  padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                  background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                  border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px',
                }}
              >
                <option value={3}>Last 3 Months (Zero)</option>
                <option value={6}>Last 6 Months (Zero)</option>
              </select>
            )}
          </div>
        </div>

        <div style={{ padding: '16px', background: 'var(--apple-bg-secondary)', borderRadius: '12px', border: '1px solid var(--apple-border)', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>Exclusion Filters</div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !excludedTeams.includes(e.target.value)) {
                    setExcludedTeams([...excludedTeams, e.target.value]);
                  }
                }}
                style={{ padding: '6px 10px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)' }}
              >
                <option value="">Exclude a Team...</option>
                {teams.filter(t => !excludedTeams.includes(String(t.id))).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !excludedUsers.includes(e.target.value)) {
                    setExcludedUsers([...excludedUsers, e.target.value]);
                  }
                }}
                style={{ padding: '6px 10px', fontSize: '0.85rem', borderRadius: '8px', background: 'var(--apple-card)', color: 'var(--apple-text-primary)', border: '1px solid var(--apple-border)' }}
              >
                <option value="">Exclude a User...</option>
                {nonAdminProfiles.filter(u => !excludedUsers.includes(String(u.id))).map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {(excludedTeams.length > 0 || excludedUsers.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
              {excludedTeams.map(tId => {
                const tName = teams.find(t => String(t.id) === String(tId))?.name || 'Unknown Team';
                return (
                  <div key={`team-${tId}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)', color: '#f87171', padding: '4px 10px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: '600' }}>
                    Team: {tName}
                    <X size={14} style={{ cursor: 'pointer' }} onClick={() => setExcludedTeams(excludedTeams.filter(id => String(id) !== String(tId)))} />
                  </div>
                );
              })}
              {excludedUsers.map(uId => {
                const u = nonAdminProfiles.find(p => String(p.id) === String(uId));
                const uName = u ? `${u.first_name} ${u.last_name}` : 'Unknown User';
                return (
                  <div key={`user-${uId}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)', color: '#f87171', padding: '4px 10px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: '600' }}>
                    User: {uName}
                    <X size={14} style={{ cursor: 'pointer' }} onClick={() => setExcludedUsers(excludedUsers.filter(id => String(id) !== String(uId)))} />
                  </div>
                );
              })}
              {(excludedTeams.length > 0 || excludedUsers.length > 0) && (
                <button
                  onClick={() => { setExcludedTeams([]); setExcludedUsers([]); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--apple-accent-blue)', fontSize: '0.8rem', cursor: 'pointer', marginLeft: '8px' }}
                >
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--apple-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 8px' }}>Name</th>
                <th style={{ padding: '12px 8px' }}>Team</th>
                {analysisMode === 'brackets' && (
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Revenue</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(analysisMode === 'brackets' ? usersInRevenueRange : streakUsers).map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--apple-border)', color: 'var(--apple-text-primary)' }}>
                  <td style={{ padding: '12px 8px', fontWeight: '500' }}>{u.first_name} {u.last_name}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{u.teamName}</td>
                  {analysisMode === 'brackets' && (
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: '#34d399' }}>
                      ${u.totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  )}
                </tr>
              ))}
              {(analysisMode === 'brackets' ? usersInRevenueRange.length : streakUsers.length) === 0 && (
                <tr>
                  <td colSpan={analysisMode === 'brackets' ? "3" : "2"} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    No users found for this analysis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>

        {/* Hidden Div for high-quality JPEG export for Revenue/Streak */}
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div 
            ref={revCaptureRef}
            style={{
              padding: '40px',
              background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)',
              color: '#102a43',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              width: '1000px',
              borderRadius: '24px',
              boxSizing: 'border-box',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '32px', background: '#ffffff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <h2 style={{ margin: '0 0 12px 0', color: '#102a43', fontSize: '32px', fontWeight: '800', letterSpacing: '-0.02em' }}>
                {analysisMode === 'streak' 
                  ? `Zero Revenue in Last ${streakDuration} Month${streakDuration > 1 ? 's' : ''}`
                  : `Revenue: ${revFilterRange === '0' ? '$0' : revFilterRange.includes('-') ? '$' + revFilterRange.replace('-', ' - $') : '$' + revFilterRange}`
                }
              </h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '15px', color: '#486581', fontWeight: '600' }}>
                {analysisMode === 'brackets' && (
                   <>
                     <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>Team: {revFilterTeamId === 'all' ? 'All Teams' : (teams.find(t => String(t.id) === String(revFilterTeamId))?.name || 'Selected Team')}</span>
                     <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>Month: {MONTH_NAMES[revFilterMonth]} {revFilterYear}</span>
                   </>
                )}
                <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>
                   Total Users: {analysisMode === 'brackets' ? usersInRevenueRange.length : streakUsers.length}
                </span>
              </div>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px'
            }}>
              {(analysisMode === 'brackets' ? usersInRevenueRange : streakUsers).map((u, i) => (
                <div key={i} style={{
                  background: '#ffffff',
                  padding: '16px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#334155', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.first_name} {u.last_name}
                      </h4>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.teamName}
                      </div>
                    </div>
                    {analysisMode === 'brackets' && (
                      <div style={{ 
                        background: u.totalRev > 0 ? '#d1fae5' : '#fee2e2',
                        color: u.totalRev > 0 ? '#10b981' : '#ef4444',
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '14px', 
                        fontWeight: '800',
                        border: `1px solid ${u.totalRev > 0 ? '#10b98140' : '#ef444440'}`,
                        marginLeft: '12px'
                      }}>
                        ${u.totalRev.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      {/* ── DIS SUBMISSION STATS ── */}
      <div className="card" style={{ padding: '24px', background: 'var(--card-bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: 'var(--apple-text-primary)' }}>DIS Submission Stats</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Copy DIS compliance stats for users over a date range (excluding Sundays). <span style={{ color: 'var(--apple-accent-blue)', fontWeight: '600' }}>({disStats ? disStats.results.length : 0} found)</span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {disFilterMode === 'all' && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={!disStats || disStats.results.length === 0 || disPdfGenerating}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                    background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                    border: '1px solid var(--apple-border)', cursor: (!disStats || disStats.results.length === 0 || disPdfGenerating) ? 'not-allowed' : 'pointer', minHeight: '44px',
                    opacity: (!disStats || disStats.results.length === 0 || disPdfGenerating) ? 0.5 : 1
                  }}
                >
                  <FileText size={16} />
                  {disPdfGenerating ? 'Generating...' : 'Save as PDF'}
                </button>
              )}
              <button
                onClick={handleDownloadJpeg}
                disabled={!disStats || disStats.results.length === 0 || disJpegGenerating}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                  background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                  border: '1px solid var(--apple-border)', cursor: (!disStats || disStats.results.length === 0 || disJpegGenerating) ? 'not-allowed' : 'pointer', minHeight: '44px',
                  opacity: (!disStats || disStats.results.length === 0 || disJpegGenerating) ? 0.5 : 1
                }}
              >
                <ImageIcon size={16} />
                {disJpegGenerating ? 'Generating...' : 'Save as JPEG'}
              </button>
              <button
                onClick={handleCopyDis}
                disabled={!disStats || disStats.results.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                  background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                  border: '1px solid var(--apple-border)', cursor: (!disStats || disStats.results.length === 0) ? 'not-allowed' : 'pointer', minHeight: '44px',
                  opacity: (!disStats || disStats.results.length === 0) ? 0.5 : 1
                }}
              >
                {disCopied ? <Check size={16} color="var(--apple-accent-green)" /> : <Copy size={16} />}
                {disCopied ? 'Copied!' : 'Copy Format'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 16px', background: 'var(--apple-bg-secondary)', borderRadius: '12px', border: '1px solid var(--apple-border)' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Filter By:</span>
              <div className="apple-pill-tabs">
                <button 
                  className={`apple-pill-tab ${disFilterMode === 'individual' ? 'active' : ''}`} 
                  onClick={() => setDisFilterMode('individual')}
                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                >
                  Individual
                </button>
                <button 
                  className={`apple-pill-tab ${disFilterMode === 'team' ? 'active' : ''}`} 
                  onClick={() => setDisFilterMode('team')}
                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                >
                  Team
                </button>
                <button 
                  className={`apple-pill-tab ${disFilterMode === 'all' ? 'active' : ''}`} 
                  onClick={() => setDisFilterMode('all')}
                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                >
                  All Members
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {disFilterMode === 'individual' && (
                <select
                  value={disSelectedUserId}
                  onChange={e => setDisSelectedUserId(e.target.value)}
                  style={{
                    padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                    background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                    border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px',
                    flex: 1, minWidth: '200px'
                  }}
                >
                  <option value="">-- Choose a user --</option>
                  {[...nonAdminProfiles].sort((a, b) => (a.first_name || '').localeCompare(b.first_name || '')).map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>
              )}

              {disFilterMode === 'team' && (
                <select
                  value={disSelectedTeamId}
                  onChange={e => setDisSelectedTeamId(e.target.value)}
                  style={{
                    padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                    background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                    border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px',
                    flex: 1, minWidth: '200px'
                  }}
                >
                  <option value="">-- Choose a team --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}

              <input
                type="date"
                value={disStartDate}
                onChange={e => setDisStartDate(e.target.value)}
                style={{
                  padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                  background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                  border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px'
                }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>to</span>
              <input
                type="date"
                value={disEndDate}
                onChange={e => setDisEndDate(e.target.value)}
                style={{
                  padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px',
                  background: 'var(--apple-card)', color: 'var(--apple-text-primary)',
                  border: '1px solid var(--apple-border)', cursor: 'pointer', minHeight: '44px'
                }}
              />
            </div>
          </div>

          {disFormattedText && (
            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--apple-bg-secondary)', borderRadius: '12px', border: '1px solid var(--apple-border)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'var(--apple-text-primary)', fontSize: '0.9rem', maxHeight: '400px', overflowY: 'auto' }}>
              {disFormattedText}
            </div>
          )}

          {/* Hidden Div for high-quality JPEG export without scrollbars */}
          <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
            <div 
              ref={disCaptureRef}
              style={{
                padding: '40px',
                background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)',
                color: '#102a43',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                width: '1200px', // Wider to fit 4 columns nicely
                borderRadius: '24px',
                boxSizing: 'border-box',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
            >
              {disStats && disStats.results.length > 0 ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '32px', background: '#ffffff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <h2 style={{ margin: '0 0 12px 0', color: '#102a43', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em' }}>
                      {disStats.filterMode === 'team' && disStats.selectedTeamName 
                        ? `Team Report: ${disStats.selectedTeamName}`
                        : 'DIS Compliance Report'}
                    </h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '14px', color: '#486581', fontWeight: '600' }}>
                      <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>Start: {disStats.startDate}</span>
                      <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>End: {disStats.currentDate}</span>
                      <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>Total Days: {disStats.totalDays}</span>
                      <span style={{ background: '#f0f4f8', padding: '6px 16px', borderRadius: '20px' }}>Total Users: {disStats.results.length}</span>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px'
                  }}>
                    {disStats.results.map((r, i) => {
                      const pct = parseInt(r.percentage);
                      let pctColor = '#ef4444';
                      let pctBg = '#fee2e2';
                      if (pct >= 80) {
                        pctColor = '#10b981';
                        pctBg = '#d1fae5';
                      } else if (pct >= 50) {
                        pctColor = '#f59e0b';
                        pctBg = '#fef3c7';
                      }

                      return (
                        <div key={i} style={{
                          background: '#ffffff',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ margin: 0, fontSize: '15px', color: '#334155', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {r.name}
                              </h4>
                              {disStats.filterMode !== 'team' && (
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {r.team}
                                </div>
                              )}
                            </div>
                            <div style={{ 
                              background: pctBg,
                              color: pctColor,
                              padding: '2px 8px', 
                              borderRadius: '20px', 
                              fontSize: '13px', 
                              fontWeight: '800',
                              border: `1px solid ${pctColor}40`,
                              marginLeft: '8px'
                            }}>
                              {r.percentage}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
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
              ) : (
                <div style={{ fontSize: '18px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{disFormattedText}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
