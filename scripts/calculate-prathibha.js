const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xsoifeyivoybqzruaguu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhzb2lmZXlpdm95YnF6cnVhZ3V1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI1NTQ1NiwiZXhwIjoyMDc5ODMxNDU2fQ.vCYTFn59Kz8S5qYPCKbMgOCjm6R02QhiN1GV36t33n0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: participations, error } = await supabase.from('participations')
        .select(`
            points_earned, student_id, result_position, performance_grade,
            events ( id, name, category, grade_type, applicable_section ),
            students ( id, name, section, chest_no, team:teams(name) )
        `)
        .not('student_id', 'is', null)
        .gt('points_earned', 0);

    if (error) {
        console.error(error);
        return;
    }

    const students = {};

    participations.forEach((p) => {
        // Exclude Category C (Group items) from individual calculations
        if (p.events?.grade_type === 'C') return;

        const sid = p.student_id;
        if (!students[sid]) {
            students[sid] = {
                id: sid,
                name: p.students?.name,
                chest_no: p.students?.chest_no,
                team: p.students?.team?.name,
                section: p.students?.section,
                totalPoints: 0,
                catAPoints: 0,
                a_grade_count: 0,
                onStageAWins: [],
                offStageAWins: [],
                allEvents: []
            };
        }

        const s = students[sid];
        s.totalPoints += (p.points_earned || 0);

        const isCatA = p.events?.grade_type === 'A';
        if (isCatA) {
            s.catAPoints += (p.points_earned || 0);
        }

        const hasAGradePerf = p.performance_grade === 'A+' || p.performance_grade === 'A';
        if (hasAGradePerf) {
            s.a_grade_count++;
        }

        const isGeneral = Array.isArray(p.events?.applicable_section)
            ? p.events.applicable_section.includes('General')
            : p.events?.applicable_section === 'General';

        if (!isGeneral && isCatA && p.result_position === 'FIRST' && hasAGradePerf) {
            if (p.events?.category === 'ON STAGE') {
                s.onStageAWins.push({ event: p.events?.name, grade: p.performance_grade, pts: p.points_earned });
            }
            if (p.events?.category === 'OFF STAGE') {
                s.offStageAWins.push({ event: p.events?.name, grade: p.performance_grade, pts: p.points_earned });
            }
        }

        s.allEvents.push({
            event: p.events?.name,
            stage: p.events?.category,
            gradeType: p.events?.grade_type,
            section: p.events?.applicable_section,
            position: p.result_position,
            grade: p.performance_grade,
            pts: p.points_earned
        });
    });

    console.log('====================================');
    console.log('ALIYA SECTION ANALYSIS');
    console.log('====================================');
    analyzeSection(Object.values(students).filter(s => s.section === 'Aliya'), 'Aliya');

    console.log('\n====================================');
    console.log('FOUNDATION SECTION ANALYSIS');
    console.log('====================================');
    analyzeSection(Object.values(students).filter(s => s.section === 'Foundation'), 'Foundation');
}

function analyzeSection(list, sectionName) {
    console.log(`\n--- ALL STUDENTS IN ${sectionName.toUpperCase()} SORTED BY CAT-A POINTS ---`);
    list.sort((a, b) => b.catAPoints - a.catAPoints || b.a_grade_count - a.a_grade_count || b.totalPoints - a.totalPoints);

    list.slice(0, 10).forEach((s, idx) => {
        console.log(`${idx + 1}. [${s.chest_no || 'NO_CHEST'}] ${s.name} (${s.team}) -> Cat-A Pts: ${s.catAPoints}, Total Pts: ${s.totalPoints}, A/A+ Count: ${s.a_grade_count}, On-Stage 1st: ${s.onStageAWins.length}, Off-Stage 1st: ${s.offStageAWins.length}`);
    });

    // 1. Kala Prathibha Candidates
    const kalaCandidates = list.filter(s => s.onStageAWins.length > 0 && s.offStageAWins.length > 0);
    console.log(`\n>>> KALA PRATHIBHA ELIGIBLE CANDIDATES in ${sectionName} (Won 1st with A/A+ in BOTH On-Stage & Off-Stage Cat-A):`);
    if (kalaCandidates.length === 0) {
        console.log('None qualified with both On-Stage and Off-Stage 1st places in Category A.');
    } else {
        kalaCandidates.forEach(c => {
            console.log(`- ${c.name} (${c.team}): Cat-A Pts=${c.catAPoints}, A/A+ Grades=${c.a_grade_count}`);
            console.log('  On-Stage Wins:', c.onStageAWins);
            console.log('  Off-Stage Wins:', c.offStageAWins);
        });
    }

    const kalaWinner = kalaCandidates[0] || null;

    // 2. Sargga Prathibha Candidates
    const sarggaCandidates = list.filter(s => s.id !== kalaWinner?.id);
    const sarggaWinner = sarggaCandidates[0] || null;

    console.log(`\n>>> WINNERS SUMMARY FOR ${sectionName}:`);
    console.log(`👑 KALA PRATHIBHA: ${kalaWinner ? `${kalaWinner.name} (${kalaWinner.team}) - ${kalaWinner.catAPoints} pts` : 'NONE QUALIFIED'}`);
    console.log(`⭐ SARGGA PRATHIBHA: ${sarggaWinner ? `${sarggaWinner.name} (${sarggaWinner.team}) - ${sarggaWinner.catAPoints} pts` : 'NONE'}`);

    if (kalaWinner) {
        console.log('\n--- Kala Winner Event Breakdown ---');
        console.table(kalaWinner.allEvents);
    }

    if (sarggaWinner) {
        console.log('\n--- Sargga Winner Event Breakdown ---');
        console.table(sarggaWinner.allEvents);
    }
}

run();
