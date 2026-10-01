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

async function listAllEvents() {
  const { data: events } = await supabase.from('events').select('*').order('name');
  
  console.log('--- ALL EVENTS LIST ---');
  events.forEach(e => {
    console.log(`[${e.event_code}] ${e.name.padEnd(25)} | Grade: ${e.grade_type} | Cat: ${e.category.padEnd(10)} | Sec: ${JSON.stringify(e.applicable_section).padEnd(25)} | MaxP: ${e.max_participants_per_team}`);
  });
}

listAllEvents();
