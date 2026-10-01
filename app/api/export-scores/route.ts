import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xsoifeyivoybqzruaguu.supabase.co'
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch Teams
    const { data: teams } = await supabase.from('teams').select('*').order('name')
    // 2. Fetch Events
    const { data: events } = await supabase.from('events').select('*').order('name')
    // 3. Fetch Participations with relations
    const { data: participations } = await supabase
      .from('participations')
      .select('*, student:students(*), event:events(*), team:teams(*)')

    if (!teams || !participations) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    // Process Team Scores
    const teamMap: Record<string, any> = {}
    teams.forEach(t => {
      teamMap[t.id] = {
        id: t.id,
        name: t.name,
        color: t.color_hex,
        penalty: t.penalty_points || 0,
        earned: 0,
        first: 0,
        second: 0,
        third: 0,
        aliya: 0,
        foundation: 0,
        general: 0,
        fdnGen: 0
      }
    })

    const checkSection = (p: any, section: string) => {
      const appSection = p.event?.applicable_section
      return Array.isArray(appSection) ? appSection.includes(section) : appSection === section
    }

    participations.forEach((p: any) => {
      const tid = p.team_id || p.team?.id
      if (!tid || !teamMap[tid]) return

      const points = p.points_earned || 0
      teamMap[tid].earned += points

      if (p.result_position === 'FIRST') teamMap[tid].first++
      if (p.result_position === 'SECOND') teamMap[tid].second++
      if (p.result_position === 'THIRD') teamMap[tid].third++

      if (checkSection(p, 'Aliya')) teamMap[tid].aliya += points
      if (checkSection(p, 'Foundation')) teamMap[tid].foundation += points
      if (checkSection(p, 'General')) teamMap[tid].general += points
      if (checkSection(p, 'Foundation General')) teamMap[tid].fdnGen += points
    })

    const teamList = Object.values(teamMap).map((t: any) => ({
      ...t,
      finalTotal: Math.max(0, t.earned - t.penalty)
    })).sort((a: any, b: any) => b.finalTotal - a.finalTotal)

    // Process Scored Events
    const scoredEventsMap: Record<string, any> = {}
    participations
      .filter((p: any) => p.result_position || (p.points_earned || 0) > 0)
      .forEach((p: any) => {
        const eid = p.event_id
        if (!scoredEventsMap[eid]) {
          scoredEventsMap[eid] = {
            name: p.event?.name,
            code: p.event?.event_code,
            category: p.event?.category,
            gradeType: p.event?.grade_type,
            section: p.event?.applicable_section,
            winners: []
          }
        }
        scoredEventsMap[eid].winners.push({
          position: p.result_position,
          grade: p.performance_grade,
          points: p.points_earned,
          code: p.code_letter,
          student: p.student?.name,
          chest: p.student?.chest_no,
          team: p.team?.name
        })
      })

    // Build CSV
    const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    let csv = `PMSA ARTS FEST 2026-2027 LIVE SCORE REPORT\n`
    csv += `Export Timestamp: ${dateStr}\n\n`
    
    csv += `TEAM STANDINGS\n`
    csv += `Rank,Team Name,Earned Points,Minus Marks,Final Total,First Places,Second Places,Third Places,Aliya,Foundation,General,Foundation General\n`
    teamList.forEach((t: any, idx: number) => {
      csv += `${idx + 1},"${t.name}",${t.earned},${t.penalty},${t.finalTotal},${t.first},${t.second},${t.third},${t.aliya},${t.foundation},${t.general},${t.fdnGen}\n`
    })

    csv += `\n\nSCORED EVENTS BREAKDOWN (${Object.keys(scoredEventsMap).length} Events)\n`
    csv += `Event Name,Event Code,Category,Grade Type,Applicable Section,Position,Performance Grade,Points Earned,Code Letter,Student Name,Chest No,Team\n`
    Object.values(scoredEventsMap).forEach((e: any) => {
      e.winners.forEach((w: any) => {
        const secStr = Array.isArray(e.section) ? e.section.join(' / ') : (e.section || '')
        csv += `"${e.name || ''}","${e.code || ''}","${e.category || ''}","${e.gradeType || ''}","${secStr}","${w.position || ''}","${w.grade || ''}","${w.points || 0}","${w.code || ''}","${w.student || ''}","${w.chest || ''}","${w.team || ''}"\n`
      })
    })

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pmsa_arts_fest_scores_${Date.now()}.csv"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    })
  } catch (err: any) {
    console.error('CSV export error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
