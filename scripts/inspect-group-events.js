const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const conf = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
  if (match) conf[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(conf.NEXT_PUBLIC_SUPABASE_URL, conf.SUPABASE_SERVICE_ROLE_KEY || conf.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspectGroupEvents() {
  console.log('=== INSPECTING GROUP EVENTS & SPECIAL CASES ===\n');

  const { data: events, error: eErr } = await supabase.from('events').select('*').order('name');
  console.log(`Total events: ${events?.length}`);

  // Find Category C events, and special B category group events
  const targetNames = ['CONVERSATION ENG', 'CONVERSATION MAL', 'BROCHURE MAKING', 'STORY WAVING', 'STORY WEAVING'];
  
  console.log('\n--- TARGET SPECIAL EVENTS ---');
  events?.forEach(e => {
    const isTarget = targetNames.some(t => e.name.toUpperCase().includes(t.toUpperCase()));
    const isCatC = e.grade_type === 'C' || e.category_type === 'C';
    if (isTarget || isCatC) {
      console.log(`Event: ${e.name} | Code: ${e.event_code} | GradeType: ${e.grade_type} | Category: ${e.category} | Section: ${JSON.stringify(e.applicable_section)} | MaxPerTeam: ${e.max_participants_per_team}`);
    }
  });

  // Check all Category C events
  console.log('\n--- ALL CATEGORY C EVENTS ---');
  const catCEvents = events?.filter(e => e.grade_type === 'C');
  console.log(`Category C count: ${catCEvents?.length}`);
  catCEvents?.forEach(e => {
    console.log(`- ${e.name} (${e.event_code}) [${e.category}] -> MaxPerTeam: ${e.max_participants_per_team}`);
  });

  // Check participations for target events
  console.log('\n--- CHECK PARTICIPATIONS FOR TARGET EVENTS ---');
  const targetEvents = events?.filter(e => targetNames.some(t => e.name.toUpperCase().includes(t.toUpperCase())) || e.grade_type === 'C');
  const targetEventIds = targetEvents?.map(e => e.id) || [];

  const { data: parts } = await supabase.from('participations').select(`
    id, event_id, student_id, team_id, code_letter, result_position, performance_grade, points_earned,
    students ( name, chest_no )
  `).in('event_id', targetEventIds);

  console.log(`Total participations in target group events: ${parts?.length}`);
  
  // Group by event
  const byEvent = {};
  parts?.forEach(p => {
    if (!byEvent[p.event_id]) byEvent[p.event_id] = [];
    byEvent[p.event_id].push(p);
  });

  Object.entries(byEvent).forEach(([eid, pList]) => {
    const ev = events?.find(e => e.id === eid);
    console.log(`\nEvent: ${ev?.name} (${pList.length} participations):`);
    pList.forEach(p => {
      console.log(`   - Team: ${p.team_id} | Student: ${p.students?.name || 'NULL'} (Chest: ${p.students?.chest_no || 'NULL'}) | CodeLetter: ${p.code_letter || 'NULL'} | Pos: ${p.result_position || 'NULL'} | Grade: ${p.performance_grade || 'NULL'} | Pts: ${p.points_earned}`);
    });
  });
}

inspectGroupEvents();
