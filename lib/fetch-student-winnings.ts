import { SupabaseClient } from "@supabase/supabase-js"
import { StudentWinningRecord, ChampionsData } from "./student-pptx-service"
import { isGroupEvent } from "./event-utils"

export async function fetchAllStudentWinnings(supabase: SupabaseClient): Promise<{
  students: StudentWinningRecord[]
  champions: ChampionsData
}> {
  // Fetch all participations with code_letter included
  const { data: participations, error } = await supabase
    .from('participations')
    .select(`
      id, points_earned, result_position, performance_grade, student_id, team_id, event_id, code_letter,
      events ( id, name, category, grade_type, applicable_section ),
      students ( id, name, chest_no, section, class_grade, teams ( id, name, color_hex ) )
    `)
    .not('student_id', 'is', null)
    .or('points_earned.gt.0,result_position.not.is.null,performance_grade.not.is.null')

  if (error || !participations) {
    console.error("Error fetching student winnings:", error)
    return { students: [], champions: {} }
  }

  // 1. Group Key Generator: Respects code_letter for multi-group events (e.g. Conversation Group 1 vs Group 2)
  const getGroupKey = (p: any) => {
    if (p.code_letter) {
      return `${p.event_id}_${p.team_id}_${p.code_letter}`
    }
    return `${p.event_id}_${p.team_id}`
  }

  // 2. Build lookups for Group Event Points, Position, and Grade per group entry
  const groupPointsMap: Record<string, number> = {}
  const groupPositionMap: Record<string, string> = {}
  const groupGradeMap: Record<string, string> = {}

  participations.forEach((p: any) => {
    const isGroup = isGroupEvent(p.events)
    if (isGroup && p.event_id && p.team_id) {
      const key = getGroupKey(p)
      const pts = p.points_earned || 0
      if (pts > (groupPointsMap[key] || 0)) {
        groupPointsMap[key] = pts
      }
      if (p.result_position) groupPositionMap[key] = p.result_position
      if (p.performance_grade) groupGradeMap[key] = p.performance_grade
    }
  })

  const studentMap: Record<string, StudentWinningRecord> = {}

  // Helper trackers for Kala Prathibha
  const onStageAWins: Record<string, any[]> = {}
  const offStageAWins: Record<string, any[]> = {}

  participations.forEach((p: any) => {
    if (!p.students) return
    const sid = p.students.id

    if (!studentMap[sid]) {
      studentMap[sid] = {
        id: sid,
        name: p.students.name,
        chest_no: p.students.chest_no || null,
        section: p.students.section,
        class_grade: p.students.class_grade || null,
        team: {
          name: p.students.teams?.name || 'Independent',
          color_hex: p.students.teams?.color_hex || '#3b82f6'
        },
        totalPoints: 0,
        catAPoints: 0,
        firstCount: 0,
        secondCount: 0,
        thirdCount: 0,
        aGradeCount: 0,
        winnings: []
      }
      onStageAWins[sid] = []
      offStageAWins[sid] = []
    }

    const s = studentMap[sid]
    const isGroup = isGroupEvent(p.events)
    const groupKey = getGroupKey(p)

    // Resolve position and grade specifically for this student/group entry
    const position = p.result_position || (isGroup ? groupPositionMap[groupKey] : null) || null
    const grade = p.performance_grade || (isGroup ? groupGradeMap[groupKey] : null) || null

    // Points to show on card
    let displayPoints = p.points_earned || 0
    if (isGroup && displayPoints === 0 && groupPointsMap[groupKey]) {
      displayPoints = groupPointsMap[groupKey]
    }

    // Individual Points Only for Total (excluding all group events)
    if (!isGroup) {
      s.totalPoints += (p.points_earned || 0)
    }

    const isCatA = p.events?.grade_type === 'A' && !isGroup
    if (isCatA) {
      s.catAPoints += (p.points_earned || 0)
    }

    if (position === 'FIRST') s.firstCount++
    if (position === 'SECOND') s.secondCount++
    if (position === 'THIRD') s.thirdCount++

    const hasAGrade = grade === 'A+' || grade === 'A'
    if (hasAGrade) s.aGradeCount++

    // Kala Prathibha requirement: 1st place in Cat A On-Stage and Off-Stage (non-general)
    const isGeneral = Array.isArray(p.events?.applicable_section)
      ? p.events.applicable_section.includes('General')
      : p.events?.applicable_section === 'General'

    if (!isGeneral && isCatA && position === 'FIRST' && hasAGrade) {
      if (p.events?.category === 'ON STAGE') onStageAWins[sid].push(p)
      if (p.events?.category === 'OFF STAGE') offStageAWins[sid].push(p)
    }

    // Only include in winnings if student has a position, grade, or points
    if (position || grade || displayPoints > 0) {
      s.winnings.push({
        event: p.events?.name || 'Unknown Event',
        stage: p.events?.category || '-',
        gradeType: p.events?.grade_type || '-',
        section: Array.isArray(p.events?.applicable_section)
          ? p.events.applicable_section.join(', ')
          : p.events?.applicable_section || '-',
        position,
        grade,
        points: displayPoints
      })
    }
  })

  // Filter out any students who have 0 winnings
  const allStudents = Object.values(studentMap).filter(s => s.winnings.length > 0)

  // Calculate Champions
  const champions: ChampionsData = {}

  ;['Aliya', 'Foundation'].forEach((sec) => {
    const secStudents = allStudents.filter((s) => s.section === sec)

    // 1. Kala Prathibha
    const kalaCandidates = secStudents.filter(
      (s) => (onStageAWins[s.id]?.length || 0) > 0 && (offStageAWins[s.id]?.length || 0) > 0
    )

    let kalaWinner: StudentWinningRecord | undefined = undefined
    if (kalaCandidates.length > 0) {
      kalaCandidates.sort((a, b) => {
        if (b.catAPoints !== a.catAPoints) return b.catAPoints - a.catAPoints
        return b.aGradeCount - a.aGradeCount
      })
      kalaWinner = kalaCandidates[0]
      kalaWinner.isKalaPrathibha = true
    }

    // 2. Sargga Prathibha
    const sarggaCandidates = secStudents.filter((s) => s.id !== kalaWinner?.id)
    let sarggaWinner: StudentWinningRecord | undefined = undefined
    if (sarggaCandidates.length > 0) {
      sarggaCandidates.sort((a, b) => {
        if (b.catAPoints !== a.catAPoints) return b.catAPoints - a.catAPoints
        return b.aGradeCount - a.aGradeCount
      })
      if (sarggaCandidates[0].catAPoints > 0) {
        sarggaWinner = sarggaCandidates[0]
        sarggaWinner.isSarggaPrathibha = true
      }
    }

    if (sec === 'Aliya') {
      champions.aliyaKala = kalaWinner
      champions.aliyaSargga = sarggaWinner
    } else {
      champions.fdnKala = kalaWinner
      champions.fdnSargga = sarggaWinner
    }
  })

  // Order students: Kala Prathibhas -> Sargga Prathibhas -> Remaining by (1st count -> 2nd count -> 3rd count -> Individual Points)
  const orderedStudents: StudentWinningRecord[] = []
  const addedIds = new Set<string>()

  // 1. Kala Champions
  if (champions.aliyaKala && !addedIds.has(champions.aliyaKala.id)) {
    orderedStudents.push(champions.aliyaKala)
    addedIds.add(champions.aliyaKala.id)
  }
  if (champions.fdnKala && !addedIds.has(champions.fdnKala.id)) {
    orderedStudents.push(champions.fdnKala)
    addedIds.add(champions.fdnKala.id)
  }

  // 2. Sargga Champions
  if (champions.aliyaSargga && !addedIds.has(champions.aliyaSargga.id)) {
    orderedStudents.push(champions.aliyaSargga)
    addedIds.add(champions.aliyaSargga.id)
  }
  if (champions.fdnSargga && !addedIds.has(champions.fdnSargga.id)) {
    orderedStudents.push(champions.fdnSargga)
    addedIds.add(champions.fdnSargga.id)
  }

  // 3. Remaining students sorted by:
  // - Higher count of 1st positions (firstCount DESC)
  // - Higher count of 2nd positions (secondCount DESC)
  // - Higher count of 3rd positions (thirdCount DESC)
  // - Total individual points (totalPoints DESC)
  // - A/A+ grade count (aGradeCount DESC)
  const remaining = allStudents
    .filter((s) => !addedIds.has(s.id))
    .sort(
      (a, b) =>
        b.firstCount - a.firstCount ||
        b.secondCount - a.secondCount ||
        b.thirdCount - a.thirdCount ||
        b.totalPoints - a.totalPoints ||
        b.aGradeCount - a.aGradeCount
    )

  remaining.forEach((s) => {
    orderedStudents.push(s)
    addedIds.add(s.id)
  })

  return {
    students: orderedStudents,
    champions
  }
}
