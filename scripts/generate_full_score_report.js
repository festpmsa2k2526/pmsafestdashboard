const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://xsoifeyivoybqzruaguu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhzb2lmZXlpdm95YnF6cnVhZ3V1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI1NTQ1NiwiZXhwIjoyMDc5ODMxNDU2fQ.vCYTFn59Kz8S5qYPCKbMgOCjm6R02QhiN1GV36t33n0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: teams } = await supabase.from('teams').select('*').order('name');
  const { data: events } = await supabase.from('events').select('*').order('name');
  const { data: students } = await supabase.from('students').select('*, team:teams(*)').order('name');
  const { data: participations } = await supabase
    .from('participations')
    .select('*, student:students(*), event:events(*), team:teams(*)');

  // 1. Team Totals
  const teamMap = {};
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
      fdnGen: 0,
      scoredEventsCount: 0
    };
  });

  const checkSection = (p, section) => {
    const appSection = p.event?.applicable_section;
    return Array.isArray(appSection) ? appSection.includes(section) : appSection === section;
  };

  participations.forEach(p => {
    const tid = p.team_id || p.team?.id;
    if (!tid || !teamMap[tid]) return;

    const points = p.points_earned || 0;
    teamMap[tid].earned += points;

    if (p.result_position === 'FIRST') teamMap[tid].first++;
    if (p.result_position === 'SECOND') teamMap[tid].second++;
    if (p.result_position === 'THIRD') teamMap[tid].third++;

    if (checkSection(p, 'Aliya')) teamMap[tid].aliya += points;
    if (checkSection(p, 'Foundation')) teamMap[tid].foundation += points;
    if (checkSection(p, 'General')) teamMap[tid].general += points;
    if (checkSection(p, 'Foundation General')) teamMap[tid].fdnGen += points;
  });

  const teamList = Object.values(teamMap).map(t => ({
    ...t,
    finalTotal: Math.max(0, t.earned - t.penalty)
  })).sort((a, b) => b.finalTotal - a.finalTotal);

  console.log('=== TEAM STANDINGS ===');
  console.table(teamList.map(t => ({
    Team: t.name,
    'Earned Points': t.earned,
    'Minus (Penalty)': t.penalty,
    'Final Score': t.finalTotal,
    '1st': t.first,
    '2nd': t.second,
    '3rd': t.third,
    Aliya: t.aliya,
    Foundation: t.foundation,
    General: t.general,
    'Fdn Gen': t.fdnGen
  })));

  // 2. Unregistered Student Audit (Minus logic)
  const unregistered = [];
  students.forEach(s => {
    const studentParts = participations.filter(p => p.student_id === s.id && p.attendance_status !== 'absent');
    const countingParts = studentParts.filter(p => (p.event?.max_participants_per_team ?? 1) <= 5);
    const hasAnyEvent = countingParts.length > 0;
    if (!hasAnyEvent) {
      unregistered.push({
        name: s.name,
        chest_no: s.chest_no,
        section: s.section,
        team: s.team?.name,
        penalty: 10
      });
    }
  });

  console.log(`\n=== UNREGISTERED STUDENTS (-10 PTS EACH AUDIT): ${unregistered.length} STUDENTS ===`);
  console.table(unregistered);

  // 3. Kala & Sargga Prathibha
  const studentScores = {};
  participations.filter(p => (p.points_earned || 0) > 0 && p.student_id).forEach(p => {
    if (p.event?.grade_type === 'C') return; // Exclude full group events
    const sid = p.student_id;
    if (!studentScores[sid]) {
      studentScores[sid] = {
        id: sid,
        name: p.student?.name,
        chest_no: p.student?.chest_no,
        team: p.team?.name || p.student?.team?.name,
        section: p.student?.section,
        totalPoints: 0,
        has_on_stage_A_win: false,
        has_off_stage_A_win: false,
        a_grade_count: 0,
        events: []
      };
    }
    const s = studentScores[sid];
    s.totalPoints += p.points_earned;
    s.events.push(`${p.event?.name} (${p.result_position || '-'}, ${p.performance_grade || '-'} => ${p.points_earned}pts)`);

    const isCatA = p.event?.grade_type === 'A';
    if (isCatA) {
      s.catAPoints = (s.catAPoints || 0) + p.points_earned;
    }

    const hasAGradePerf = p.performance_grade === 'A+' || p.performance_grade === 'A';
    if (hasAGradePerf) {
      s.a_grade_count++;
    }

    const isGeneral = Array.isArray(p.event?.applicable_section)
      ? p.event.applicable_section.includes('General')
      : p.event?.applicable_section === 'General';
    const isFirst = p.result_position === 'FIRST';

    if (!isGeneral && isCatA && isFirst && hasAGradePerf) {
      if (p.event?.category === 'ON STAGE') s.has_on_stage_A_win = true;
      if (p.event?.category === 'OFF STAGE') s.has_off_stage_A_win = true;
    }
  });

  const sections = ['Aliya', 'Foundation'];
  console.log('\n=== KALA & SARGGA PRATHIBHA RANKINGS ===');
  sections.forEach(sec => {
    const list = Object.values(studentScores).filter(s => s.section === sec);
    list.sort((a, b) => (b.catAPoints || 0) - (a.catAPoints || 0) || b.a_grade_count - a.a_grade_count);

    const kalaCandidates = list.filter(s => s.has_on_stage_A_win && s.has_off_stage_A_win);
    const kalaWinner = kalaCandidates.length > 0 ? kalaCandidates[0] : null;

    const sarggaCandidates = list.filter(s => s.id !== kalaWinner?.id);
    const sarggaWinner = sarggaCandidates.length > 0 ? sarggaCandidates[0] : null;

    console.log(`\n--- ${sec.toUpperCase()} SECTION ---`);
    console.log(`👑 KALA PRATHIBHA: ${kalaWinner ? `${kalaWinner.name} (${kalaWinner.team}) - ${kalaWinner.catAPoints || 0} Category A pts [On-Stage A: ${kalaWinner.has_on_stage_A_win}, Off-Stage A: ${kalaWinner.has_off_stage_A_win}]` : 'Not declared'}`);
    console.log(`⭐ SARGGA PRATHIBHA: ${sarggaWinner ? `${sarggaWinner.name} (${sarggaWinner.team}) - ${sarggaWinner.catAPoints || 0} Category A pts (${sarggaWinner.totalPoints} total pts)` : 'Not declared'}`);

    console.log(`Top 5 Students in ${sec}:`);
    console.table(list.slice(0, 5).map((s, idx) => ({
      Rank: idx + 1,
      Name: s.name,
      Chest: s.chest_no,
      Team: s.team,
      'Total Points': s.totalPoints,
      'On-Stage A Win': s.has_on_stage_A_win,
      'Off-Stage A Win': s.has_off_stage_A_win,
      'A Grade Count': s.a_grade_count
    })));
  });

  // 4. Scored Events Breakdown
  const scoredEventsMap = {};
  participations.filter(p => p.result_position || (p.points_earned || 0) > 0).forEach(p => {
    const eid = p.event_id;
    if (!scoredEventsMap[eid]) {
      scoredEventsMap[eid] = {
        name: p.event?.name,
        code: p.event?.event_code,
        category: p.event?.category,
        gradeType: p.event?.grade_type,
        section: p.event?.applicable_section,
        winners: []
      };
    }
    scoredEventsMap[eid].winners.push({
      position: p.result_position,
      grade: p.performance_grade,
      points: p.points_earned,
      code: p.code_letter,
      student: p.student?.name,
      chest: p.student?.chest_no,
      team: p.team?.name
    });
  });

  console.log(`\n=== PUBLISHED / SCORED EVENTS (${Object.keys(scoredEventsMap).length} EVENTS) ===`);
  Object.values(scoredEventsMap).forEach(e => {
    console.log(`\nEvent: ${e.name} [Code: ${e.code || '-'}, Grade: ${e.gradeType}, Cat: ${e.category}]`);
    console.table(e.winners);
  });

  // Write CSV of Team Standings and Events
  let csvContent = `PMSA ARTS FEST 2026-2027 FULL SCORE AUDIT REPORT\n\n`;
  csvContent += `TEAM STANDINGS\n`;
  csvContent += `Rank,Team Name,Earned Points,Minus Marks,Final Total,First Places,Second Places,Third Places,Aliya,Foundation,General,Foundation General\n`;
  teamList.forEach((t, i) => {
    csvContent += `${i + 1},${t.name},${t.earned},${t.penalty},${t.finalTotal},${t.first},${t.second},${t.third},${t.aliya},${t.foundation},${t.general},${t.fdnGen}\n`;
  });

  csvContent += `\n\nSCORED EVENTS BREAKDOWN\n`;
  csvContent += `Event Name,Event Code,Category,Grade Type,Applicable Section,Position,Performance Grade,Points Earned,Code Letter,Student Name,Chest No,Team\n`;
  Object.values(scoredEventsMap).forEach(e => {
    e.winners.forEach(w => {
      const secStr = Array.isArray(e.section) ? e.section.join(' / ') : (e.section || '');
      csvContent += `"${e.name}","${e.code || ''}","${e.category}","${e.gradeType}","${secStr}","${w.position || ''}","${w.grade || ''}","${w.points}","${w.code || ''}","${w.student || ''}","${w.chest || ''}","${w.team || ''}"\n`;
    });
  });

  fs.writeFileSync('public/pmsa_arts_fest_scores_audit.csv', csvContent);
  console.log('\nCSV report generated at: public/pmsa_arts_fest_scores_audit.csv');
}

run().catch(console.error);
