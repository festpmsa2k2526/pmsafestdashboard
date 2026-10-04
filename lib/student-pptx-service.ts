import pptxgen from "pptxgenjs"

export interface WinningEvent {
  event: string
  stage: string
  gradeType: string
  section: string
  position: string | null
  grade: string | null
  points: number
}

export interface StudentWinningRecord {
  id: string
  name: string
  chest_no: string | null
  section: string
  class_grade?: string | null
  team: {
    name: string
    color_hex: string
  }
  totalPoints: number
  catAPoints: number
  firstCount: number
  secondCount: number
  thirdCount: number
  aGradeCount: number
  isKalaPrathibha?: boolean
  isSarggaPrathibha?: boolean
  winnings: WinningEvent[]
}

export interface ChampionsData {
  aliyaKala?: StudentWinningRecord
  aliyaSargga?: StudentWinningRecord
  fdnKala?: StudentWinningRecord
  fdnSargga?: StudentWinningRecord
}

/**
 * Returns hex color string without '#'
 */
function cleanHex(hex: string | undefined, defaultHex: string): string {
  if (!hex) return defaultHex
  return hex.replace('#', '').toUpperCase()
}

/**
 * Get Team Theme Colors
 */
function getTeamPalette(teamName: string, teamHex?: string) {
  const name = (teamName || '').toLowerCase()
  if (name.includes('ishbiliya')) {
    return {
      primary: '059669', // Vibrant Emerald
      dark: '064E3B',    // Deep Forest Green
      light: 'A7F3D0',   // Mint Light Accent
      accent: '10B981',  // Bright Green
      badgeBg: 'D1FAE5',
      badgeText: '065F46'
    }
  } else if (name.includes('gulbarga')) {
    return {
      primary: 'DC2626', // Crimson Red
      dark: '881337',    // Deep Ruby / Burgundy
      light: 'FECDD3',   // Light Rose Accent
      accent: 'EF4444',  // Bright Red
      badgeBg: 'FEE2E2',
      badgeText: '991B1B'
    }
  } else if (name.includes('fustat')) {
    return {
      primary: '2563EB', // Royal Blue
      dark: '1E3A8A',    // Deep Navy Blue
      light: 'BFDBFE',   // Light Sky Accent
      accent: '3B82F6',  // Bright Blue
      badgeBg: 'DBEAFE',
      badgeText: '1E40AF'
    }
  }
  const custom = cleanHex(teamHex, '4F46E5')
  return {
    primary: custom,
    dark: '1E293B',
    light: 'E2E8F0',
    accent: custom,
    badgeBg: 'F1F5F9',
    badgeText: '0F172A'
  }
}

/**
 * Generates high-definition, pixel-perfect 16:9 Widescreen PPTX presentation
 */
export async function generateStudentWinningsPPTX({
  title = "PMSA Arts Fest 2026-2027 - Student Winnings",
  fileName = "PMSA_Fest_Student_Winnings.pptx",
  students,
  champions,
  includeCover = true,
  includeChampionsSlide = true
}: {
  title?: string
  fileName?: string
  students: StudentWinningRecord[]
  champions?: ChampionsData
  includeCover?: boolean
  includeChampionsSlide?: boolean
}): Promise<void> {
  const pptx = new pptxgen()

  // Define true 16:9 Widescreen Layout (13.333 inches wide by 7.5 inches high)
  pptx.defineLayout({ name: 'WIDESCREEN_16_9', width: 13.333, height: 7.5 })
  pptx.layout = 'WIDESCREEN_16_9'
  pptx.author = 'PMSA Arts Fest 2026-2027'
  pptx.company = 'PMSA'
  pptx.title = title

  // -------------------------------------------------------------
  // 1. COVER SLIDE
  // -------------------------------------------------------------
  if (includeCover) {
    const coverSlide = pptx.addSlide()
    coverSlide.background = { color: '090D16' }

    // Top Decorative Amber Line
    coverSlide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.15,
      fill: { color: 'F59E0B' }
    })

    // Subtitle badge
    coverSlide.addText('OFFICIAL RESULTS & AWARD CEREMONY', {
      x: 1.0,
      y: 1.5,
      w: 11.333,
      h: 0.4,
      fontSize: 13,
      fontFace: 'Arial',
      color: 'F59E0B',
      bold: true,
      charSpacing: 2
    })

    // Main Title
    coverSlide.addText('PMSA ARTS FEST 2026-2027', {
      x: 1.0,
      y: 2.0,
      w: 11.333,
      h: 1.1,
      fontSize: 42,
      fontFace: 'Arial',
      color: 'FFFFFF',
      bold: true
    })

    coverSlide.addText('Student Winnings & Honors Presentation', {
      x: 1.0,
      y: 3.2,
      w: 11.333,
      h: 0.5,
      fontSize: 20,
      fontFace: 'Arial',
      color: '94A3B8'
    })

    // Stat Cards on Cover
    const totalWins = students.reduce((acc, s) => acc + s.winnings.length, 0)
    const totalPoints = students.reduce((acc, s) => acc + s.totalPoints, 0)

    const stats = [
      { label: 'HONORED STUDENTS', value: students.length.toString(), color: '38BDF8' },
      { label: 'TOTAL WINNING ENTRIES', value: totalWins.toString(), color: 'FCD34D' },
      { label: 'TOTAL INDIVIDUAL POINTS', value: totalPoints.toString(), color: '4ADE80' }
    ]

    stats.forEach((st, i) => {
      const cardX = 1.0 + i * 3.9
      coverSlide.addShape(pptx.ShapeType.roundRect, {
        x: cardX,
        y: 4.2,
        w: 3.5,
        h: 1.6,
        rectRadius: 0.1,
        fill: { color: '131C31' },
        line: { color: '334155', width: 1.5 }
      })

      coverSlide.addText(st.value, {
        x: cardX,
        y: 4.45,
        w: 3.5,
        h: 0.65,
        fontSize: 34,
        fontFace: 'Arial',
        color: st.color,
        bold: true,
        align: 'center'
      })

      coverSlide.addText(st.label, {
        x: cardX,
        y: 5.2,
        w: 3.5,
        h: 0.35,
        fontSize: 10,
        fontFace: 'Arial',
        color: '94A3B8',
        bold: true,
        align: 'center',
        charSpacing: 1
      })
    })

    // Footer note
    coverSlide.addText('PMSA Arts Fest 2026-2027', {
      x: 1.0,
      y: 6.8,
      w: 11.333,
      h: 0.3,
      fontSize: 10,
      fontFace: 'Arial',
      color: '64748B'
    })
  }

  // -------------------------------------------------------------
  // 2. CHAMPIONS SPOTLIGHT SLIDE
  // -------------------------------------------------------------
  if (includeChampionsSlide && champions && (champions.aliyaKala || champions.fdnKala || champions.aliyaSargga || champions.fdnSargga)) {
    const champSlide = pptx.addSlide()
    champSlide.background = { color: '090D16' }

    // Top Banner
    champSlide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 1.0,
      fill: { color: '1E1B4B' }
    })

    champSlide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 1.0,
      w: 13.333,
      h: 0.05,
      fill: { color: 'F59E0B' }
    })

    champSlide.addText('🏆 FESTIVAL INDIVIDUAL CHAMPIONSHIPS', {
      x: 0.8,
      y: 0.2,
      w: 11.733,
      h: 0.6,
      fontSize: 22,
      fontFace: 'Arial',
      color: 'FDE047',
      bold: true
    })

    const champCards = [
      {
        title: '👑 KALA PRATHIBHA (ALIYA)',
        rec: champions.aliyaKala,
        section: 'Aliya',
        theme: 'F59E0B',
        desc: '1st Prize with A/A+ in both On-Stage & Off-Stage'
      },
      {
        title: '⭐ SARGGA PRATHIBHA (ALIYA)',
        rec: champions.aliyaSargga,
        section: 'Aliya',
        theme: '38BDF8',
        desc: 'Highest Category A Individual Points'
      },
      {
        title: '👑 KALA PRATHIBHA (FOUNDATION)',
        rec: champions.fdnKala,
        section: 'Foundation',
        theme: 'F59E0B',
        desc: '1st Prize with A/A+ in both On-Stage & Off-Stage'
      },
      {
        title: '⭐ SARGGA PRATHIBHA (FOUNDATION)',
        rec: champions.fdnSargga,
        section: 'Foundation',
        theme: '38BDF8',
        desc: 'Highest Category A Individual Points'
      }
    ]

    champCards.forEach((c, idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const x = 0.8 + col * 6.0
      const y = 1.35 + row * 2.85

      champSlide.addShape(pptx.ShapeType.roundRect, {
        x: x,
        y: y,
        w: 5.733,
        h: 2.65,
        rectRadius: 0.1,
        fill: { color: '131C31' },
        line: { color: c.theme, width: 2 }
      })

      champSlide.addText(c.title, {
        x: x + 0.3,
        y: y + 0.2,
        w: 5.133,
        h: 0.35,
        fontSize: 14,
        fontFace: 'Arial',
        color: c.theme,
        bold: true
      })

      if (c.rec) {
        champSlide.addText(c.rec.name, {
          x: x + 0.3,
          y: y + 0.6,
          w: 5.133,
          h: 0.5,
          fontSize: 18,
          fontFace: 'Arial',
          color: 'FFFFFF',
          bold: true
        })

        const teamPalette = getTeamPalette(c.rec.team.name, c.rec.team.color_hex)
        champSlide.addText(`CHEST NO: ${c.rec.chest_no || 'N/A'}  |  TEAM: ${c.rec.team.name.toUpperCase()}  |  ${c.rec.totalPoints} PTS`, {
          x: x + 0.3,
          y: y + 1.15,
          w: 5.133,
          h: 0.3,
          fontSize: 10,
          fontFace: 'Arial',
          color: teamPalette.accent,
          bold: true
        })

        champSlide.addText(`Category A Score: ${c.rec.catAPoints} Pts  •  Winnings: ${c.rec.winnings.length} Events`, {
          x: x + 0.3,
          y: y + 1.5,
          w: 5.133,
          h: 0.3,
          fontSize: 10,
          fontFace: 'Arial',
          color: 'CBD5E1'
        })

        champSlide.addText(c.desc, {
          x: x + 0.3,
          y: y + 1.9,
          w: 5.133,
          h: 0.45,
          fontSize: 9,
          fontFace: 'Arial',
          color: '94A3B8',
          italic: true
        })
      } else {
        champSlide.addText('Not Declared', {
          x: x + 0.3,
          y: y + 0.9,
          w: 5.133,
          h: 0.4,
          fontSize: 14,
          fontFace: 'Arial',
          color: '64748B',
          italic: true
        })
      }
    })
  }

  // -------------------------------------------------------------
  // 3. INDIVIDUAL STUDENT SLIDES (Special Designs for Champions)
  // -------------------------------------------------------------
  students.forEach((student, index) => {
    const slide = pptx.addSlide()
    const palette = getTeamPalette(student.team.name, student.team.color_hex)

    const isKala = !!student.isKalaPrathibha
    const isSargga = !!student.isSarggaPrathibha

    // Set Distinct Slide Backgrounds
    if (isKala) {
      slide.background = { color: '0A0B12' } // Royal Midnight Black
    } else if (isSargga) {
      slide.background = { color: '080E1E' } // Royal Midnight Sapphire Navy
    } else {
      slide.background = { color: 'F8FAFC' } // Clean Premium Slate
    }

    // Header dimensions
    const headerH = isKala || isSargga ? 1.75 : 1.45

    // Top Header Banner
    let headerBg = palette.dark
    let headerAccent = palette.primary
    if (isKala) {
      headerBg = '1C1917'     // Warm Royal Obsidian
      headerAccent = 'F59E0B' // Pure Gold
    } else if (isSargga) {
      headerBg = '0F172A'     // Dark Sapphire Navy
      headerAccent = '38BDF8' // Bright Cyan Sapphire
    }

    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: headerH,
      fill: { color: headerBg }
    })

    // Header Bottom Accent Line
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: headerH,
      w: 13.333,
      h: 0.08,
      fill: { color: headerAccent }
    })

    // HEADER TEXTS
    if (isKala) {
      // 👑 KALA PRATHIBHA HIGHLIGHTED HEADER
      slide.addText(`👑 KALA PRATHIBHA  •  ${student.section.toUpperCase()} SECTION`, {
        x: 0.6,
        y: 0.15,
        w: 9.4,
        h: 0.35,
        fontSize: 15,
        fontFace: 'Arial',
        color: 'FDE047',
        bold: true,
        charSpacing: 2
      })

      slide.addText(student.name.toUpperCase(), {
        x: 0.6,
        y: 0.52,
        w: 9.4,
        h: 0.65,
        fontSize: 26,
        fontFace: 'Arial',
        color: 'FFFFFF',
        bold: true
      })

      const chestStr = student.chest_no ? `CHEST NO: ${student.chest_no}` : 'CHEST NO: -'
      const teamStr = `TEAM ${student.team.name.toUpperCase()}`
      const classStr = student.class_grade ? `CLASS: ${student.class_grade}` : ''
      const metaParts = [chestStr, teamStr, classStr].filter(Boolean).join('   •   ')

      slide.addText(metaParts, {
        x: 0.6,
        y: 1.20,
        w: 9.4,
        h: 0.35,
        fontSize: 11,
        fontFace: 'Arial',
        color: 'FEF08A',
        bold: true
      })

    } else if (isSargga) {
      // ⭐ SARGGA PRATHIBHA HIGHLIGHTED HEADER
      slide.addText(`⭐ SARGGA PRATHIBHA  •  ${student.section.toUpperCase()} SECTION`, {
        x: 0.6,
        y: 0.15,
        w: 9.4,
        h: 0.35,
        fontSize: 15,
        fontFace: 'Arial',
        color: '38BDF8',
        bold: true,
        charSpacing: 2
      })

      slide.addText(student.name.toUpperCase(), {
        x: 0.6,
        y: 0.52,
        w: 9.4,
        h: 0.65,
        fontSize: 26,
        fontFace: 'Arial',
        color: 'FFFFFF',
        bold: true
      })

      const chestStr = student.chest_no ? `CHEST NO: ${student.chest_no}` : 'CHEST NO: -'
      const teamStr = `TEAM ${student.team.name.toUpperCase()}`
      const classStr = student.class_grade ? `CLASS: ${student.class_grade}` : ''
      const metaParts = [chestStr, teamStr, classStr].filter(Boolean).join('   •   ')

      slide.addText(metaParts, {
        x: 0.6,
        y: 1.20,
        w: 9.4,
        h: 0.35,
        fontSize: 11,
        fontFace: 'Arial',
        color: 'BAE6FD',
        bold: true
      })

    } else {
      // STANDARD STUDENT HEADER
      slide.addText('PMSA ARTS FEST 2026-2027', {
        x: 0.6,
        y: 0.12,
        w: 9.4,
        h: 0.22,
        fontSize: 9,
        fontFace: 'Arial',
        color: palette.light,
        bold: true,
        charSpacing: 1
      })

      slide.addText(student.name.toUpperCase(), {
        x: 0.6,
        y: 0.34,
        w: 9.4,
        h: 0.55,
        fontSize: 22,
        fontFace: 'Arial',
        color: 'FFFFFF',
        bold: true
      })

      const chestStr = student.chest_no ? `CHEST NO: ${student.chest_no}` : 'CHEST NO: -'
      const teamStr = `TEAM ${student.team.name.toUpperCase()}`
      const secStr = `SECTION: ${student.section.toUpperCase()}`
      const classStr = student.class_grade ? `CLASS: ${student.class_grade}` : ''
      const metaParts = [chestStr, teamStr, secStr, classStr].filter(Boolean).join('   •   ')

      slide.addText(metaParts, {
        x: 0.6,
        y: 0.92,
        w: 9.4,
        h: 0.35,
        fontSize: 10.5,
        fontFace: 'Arial',
        color: palette.light,
        bold: true
      })
    }

    // Total Score Card (Top Right)
    const scoreCardY = isKala || isSargga ? 0.25 : 0.15
    const scoreCardH = isKala || isSargga ? 1.30 : 1.18
    const scoreCardBg = isKala ? '292524' : isSargga ? '0A1128' : '0B1120'
    const scoreCardBorder = isKala ? 'F59E0B' : isSargga ? '38BDF8' : palette.primary
    const scoreNumColor = isKala ? 'FDE047' : isSargga ? '38BDF8' : 'FDE047'

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 10.3,
      y: scoreCardY,
      w: 2.433,
      h: scoreCardH,
      rectRadius: 0.08,
      fill: { color: scoreCardBg },
      line: { color: scoreCardBorder, width: isKala || isSargga ? 2.0 : 1.5 }
    })

    slide.addText(student.totalPoints.toString(), {
      x: 10.3,
      y: scoreCardY + 0.08,
      w: 2.433,
      h: 0.65,
      fontSize: isKala || isSargga ? 32 : 28,
      fontFace: 'Arial',
      color: scoreNumColor,
      bold: true,
      align: 'center'
    })

    slide.addText('INDIVIDUAL POINTS', {
      x: 10.3,
      y: scoreCardY + (isKala || isSargga ? 0.78 : 0.70),
      w: 2.433,
      h: 0.3,
      fontSize: 8,
      fontFace: 'Arial',
      color: isKala ? 'FDE047' : isSargga ? '7DD3FC' : '94A3B8',
      bold: true,
      align: 'center',
      charSpacing: 1
    })

    // Summary Chips Row (4 Chips)
    const summaryStartY = isKala || isSargga ? 1.95 : 1.65
    const chipHeight = 0.38

    let chips = [
      { label: '🥇 1st Places', count: student.firstCount, color: 'B45309', bg: 'FEF3C7', border: 'F59E0B' },
      { label: '🥈 2nd Places', count: student.secondCount, color: '334155', bg: 'F1F5F9', border: '94A3B8' },
      { label: '🥉 3rd Places', count: student.thirdCount, color: '9A3412', bg: 'FFEDD5', border: 'F97316' },
      { label: '⭐ A/A+ Grades', count: student.aGradeCount, color: '1E40AF', bg: 'EFF6FF', border: '3B82F6' }
    ]

    if (isKala) {
      chips = [
        { label: '🥇 1st Places', count: student.firstCount, color: 'FDE047', bg: '292524', border: 'F59E0B' },
        { label: '🥈 2nd Places', count: student.secondCount, color: 'E2E8F0', bg: '1C1917', border: '78716C' },
        { label: '🥉 3rd Places', count: student.thirdCount, color: 'FED7AA', bg: '1C1917', border: 'EA580C' },
        { label: '⭐ A/A+ Grades', count: student.aGradeCount, color: '93C5FD', bg: '1C1917', border: '3B82F6' }
      ]
    } else if (isSargga) {
      chips = [
        { label: '🥇 1st Places', count: student.firstCount, color: 'FDE047', bg: '0F172A', border: 'F59E0B' },
        { label: '🥈 2nd Places', count: student.secondCount, color: 'E2E8F0', bg: '0F172A', border: '64748B' },
        { label: '🥉 3rd Places', count: student.thirdCount, color: 'FED7AA', bg: '0F172A', border: 'EA580C' },
        { label: '⭐ A/A+ Grades', count: student.aGradeCount, color: '38BDF8', bg: '0F172A', border: '38BDF8' }
      ]
    }

    chips.forEach((c, chipIdx) => {
      const chipX = 0.6 + chipIdx * (2.85 + 0.244)
      slide.addShape(pptx.ShapeType.roundRect, {
        x: chipX,
        y: summaryStartY,
        w: 2.85,
        h: chipHeight,
        rectRadius: 0.05,
        fill: { color: c.bg },
        line: { color: c.border, width: 0.8 }
      })

      slide.addText(`${c.label}:  ${c.count}`, {
        x: chipX,
        y: summaryStartY + 0.04,
        w: 2.85,
        h: 0.28,
        fontSize: 10,
        fontFace: 'Arial',
        color: c.color,
        bold: true,
        align: 'center'
      })
    })

    // -------------------------------------------------------------
    // HORIZONTAL EVENT CARDS GRID (2 Columns)
    // -------------------------------------------------------------
    const gridStartY = summaryStartY + 0.48
    const cardW = 5.92
    const cardGapX = 0.293

    // Sort winnings: 1st place first, then 2nd, then 3rd, then highest points
    const sortedWinnings = [...student.winnings].sort((a, b) => {
      const posOrder: Record<string, number> = { FIRST: 1, SECOND: 2, THIRD: 3 }
      const posA = posOrder[a.position || ''] || 99
      const posB = posOrder[b.position || ''] || 99
      if (posA !== posB) return posA - posB
      return (b.points || 0) - (a.points || 0)
    })

    const displayEvents = sortedWinnings.slice(0, 8)
    const numRows = Math.ceil(displayEvents.length / 2) || 1

    let cardH = 1.02
    let rowGap = 0.12
    if (numRows <= 2) {
      cardH = 1.30
      rowGap = 0.20
    } else if (numRows === 3) {
      cardH = 1.12
      rowGap = 0.14
    } else {
      cardH = isKala || isSargga ? 0.94 : 0.98
      rowGap = isKala || isSargga ? 0.09 : 0.10
    }

    displayEvents.forEach((w, wIdx) => {
      const col = wIdx % 2
      const row = Math.floor(wIdx / 2)
      const x = 0.6 + col * (cardW + cardGapX)
      const y = gridStartY + row * (cardH + rowGap)

      // Color Theme according to Position & Slide Theme
      let cardBg = 'FFFFFF'
      let cardBorder = 'CBD5E1'
      let accentBarColor = '3B82F6'
      let posText = 'PARTICIPATION'
      let posBadgeBg = 'F1F5F9'
      let posBadgeText = '64748B'
      let posBadgeBorder = 'CBD5E1'
      let pointsColor = '0F172A'
      let eventTitleColor = '0F172A'
      let subtitleColor = '64748B'

      if (isKala || isSargga) {
        // Dark Theme Cards for Champions
        cardBg = '131824'
        cardBorder = '334155'
        eventTitleColor = 'FFFFFF'
        subtitleColor = '94A3B8'
        pointsColor = 'FFFFFF'

        if (w.position === 'FIRST') {
          cardBg = '1E1B18'         // Dark Gold Card
          cardBorder = 'F59E0B'     // Solid Gold
          accentBarColor = 'D97706'
          posText = '🥇 1ST PLACE'
          posBadgeBg = '292524'
          posBadgeText = 'FDE047'
          posBadgeBorder = 'F59E0B'
          pointsColor = 'FDE047'
        } else if (w.position === 'SECOND') {
          cardBg = '181D2A'
          cardBorder = '64748B'
          accentBarColor = '94A3B8'
          posText = '🥈 2ND PLACE'
          posBadgeBg = '0F172A'
          posBadgeText = 'E2E8F0'
          posBadgeBorder = '64748B'
          pointsColor = 'E2E8F0'
        } else if (w.position === 'THIRD') {
          cardBg = '1F1815'
          cardBorder = 'EA580C'
          accentBarColor = 'EA580C'
          posText = '🥉 3RD PLACE'
          posBadgeBg = '2C1810'
          posBadgeText = 'FED7AA'
          posBadgeBorder = 'EA580C'
          pointsColor = 'FED7AA'
        }
      } else {
        // Standard Light Theme Cards
        if (w.position === 'FIRST') {
          cardBg = 'FFFBEB'         // Warm Golden Tint
          cardBorder = 'F59E0B'     // Amber Gold
          accentBarColor = 'D97706' // Deep Gold
          posText = '🥇 1ST PLACE'
          posBadgeBg = 'FEF3C7'
          posBadgeText = 'B45309'
          posBadgeBorder = 'F59E0B'
          pointsColor = 'B45309'
        } else if (w.position === 'SECOND') {
          cardBg = 'F8FAFC'         // Silver Slate Tint
          cardBorder = '94A3B8'     // Slate Silver
          accentBarColor = '64748B' // Deep Slate
          posText = '🥈 2ND PLACE'
          posBadgeBg = 'E2E8F0'
          posBadgeText = '334155'
          posBadgeBorder = '94A3B8'
          pointsColor = '334155'
        } else if (w.position === 'THIRD') {
          cardBg = 'FFF7ED'         // Bronze Warm Tint
          cardBorder = 'F97316'     // Warm Bronze Orange
          accentBarColor = 'EA580C' // Deep Bronze
          posText = '🥉 3RD PLACE'
          posBadgeBg = 'FFEDD5'
          posBadgeText = '9A3412'
          posBadgeBorder = 'F97316'
          pointsColor = '9A3412'
        }
      }

      // 1. Main Card Body
      slide.addShape(pptx.ShapeType.roundRect, {
        x: x,
        y: y,
        w: cardW,
        h: cardH,
        rectRadius: 0.08,
        fill: { color: cardBg },
        line: { color: cardBorder, width: w.position === 'FIRST' ? 1.8 : 1.2 }
      })

      // 2. Left Accent Color Strip
      slide.addShape(pptx.ShapeType.roundRect, {
        x: x,
        y: y,
        w: 0.12,
        h: cardH,
        rectRadius: 0.04,
        fill: { color: accentBarColor },
        line: { color: accentBarColor, width: 0.1 }
      })

      // 3. Event Name
      slide.addText(w.event.toUpperCase(), {
        x: x + 0.25,
        y: y + 0.08,
        w: 3.6,
        h: 0.35,
        fontSize: cardH > 1.1 ? 14 : 12.5,
        fontFace: 'Arial',
        color: eventTitleColor,
        bold: true
      })

      // 4. Stage & Category Subtitle
      const stageIcon = w.stage === 'ON STAGE' ? '🎭 ON STAGE' : '📝 OFF STAGE'
      const catLabel = w.gradeType ? `CAT ${w.gradeType}` : 'EVENT'
      slide.addText(`${stageIcon}   •   ${catLabel}`, {
        x: x + 0.25,
        y: y + (cardH > 1.1 ? 0.46 : 0.40),
        w: 3.6,
        h: 0.24,
        fontSize: 9,
        fontFace: 'Arial',
        color: subtitleColor,
        bold: true
      })

      // 5. Position Badge (Top Right of Card)
      slide.addShape(pptx.ShapeType.roundRect, {
        x: x + 3.95,
        y: y + 0.08,
        w: 1.82,
        h: 0.32,
        rectRadius: 0.04,
        fill: { color: posBadgeBg },
        line: { color: posBadgeBorder, width: 0.8 }
      })

      slide.addText(posText, {
        x: x + 3.95,
        y: y + 0.11,
        w: 1.82,
        h: 0.24,
        fontSize: 9,
        fontFace: 'Arial',
        color: posBadgeText,
        bold: true,
        align: 'center'
      })

      // 6. Grade Pill & Points (Bottom Right of Card)
      if (w.grade) {
        const isAGrade = w.grade === 'A+' || w.grade === 'A'
        const grFill = isKala || isSargga ? (isAGrade ? '1E3A8A' : '1E293B') : (isAGrade ? 'DBEAFE' : 'F1F5F9')
        const grText = isKala || isSargga ? (isAGrade ? '93C5FD' : '94A3B8') : (isAGrade ? '1D4ED8' : '475569')
        const grBorder = isKala || isSargga ? (isAGrade ? '3B82F6' : '475569') : (isAGrade ? '3B82F6' : 'CBD5E1')

        slide.addShape(pptx.ShapeType.roundRect, {
          x: x + 3.95,
          y: y + (cardH > 1.1 ? 0.46 : 0.43),
          w: 0.82,
          h: 0.28,
          rectRadius: 0.04,
          fill: { color: grFill },
          line: { color: grBorder, width: 0.5 }
        })

        slide.addText(`GR: ${w.grade}`, {
          x: x + 3.95,
          y: y + (cardH > 1.1 ? 0.48 : 0.45),
          w: 0.82,
          h: 0.22,
          fontSize: 8.5,
          fontFace: 'Arial',
          color: grText,
          bold: true,
          align: 'center'
        })
      }

      // 7. Points Display
      slide.addText(`+${w.points} PTS`, {
        x: x + 4.8,
        y: y + (cardH > 1.1 ? 0.44 : 0.41),
        w: 0.98,
        h: 0.3,
        fontSize: 12,
        fontFace: 'Arial',
        color: pointsColor,
        bold: true,
        align: 'right'
      })
    })

    // Bottom Footer
    slide.addText(`Slide ${index + 1 + (includeCover ? 1 : 0) + (includeChampionsSlide ? 1 : 0)}   |   PMSA Arts Fest 2026-2027`, {
      x: 0.6,
      y: 7.15,
      w: 12.133,
      h: 0.25,
      fontSize: 9,
      fontFace: 'Arial',
      color: isKala || isSargga ? '64748B' : '94A3B8'
    })
  })

  // Download PPTX file
  await pptx.writeFile({ fileName })
}
