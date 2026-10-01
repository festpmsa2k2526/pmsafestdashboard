const fs = require('fs');
const path = require('path');

const websiteRoot = 'D:/masa/dev/fest-2026-website';

// 1. Update app/api/data/route.ts
const apiDir = path.join(websiteRoot, 'app/api/data');
fs.mkdirSync(apiDir, { recursive: true });

const apiRouteCode = `import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export const revalidate = 5; // Cache for 5 seconds for faster TV response

export async function GET() {
  try {
    const [teamsRes, eventsRes, studentsRes, participationsRes, assetsRes] = await Promise.all([
      supabase.from("teams").select("id, name, slug, color_hex").order("name"),
      supabase.from("events").select("id, name, event_code, category, grade_type, applicable_section").order("name"),
      supabase.from("students").select("id, name, chest_no, section, class_grade, team_id"),
      supabase.from("participations").select("id, event_id, student_id, team_id, result_position, performance_grade, points_earned, status, attendance_status, code_letter"),
      supabase.from("site_assets").select("key, value")
    ]);

    const rawTeams = teamsRes.data || [];
    const rawEvents = eventsRes.data || [];
    const rawStudents = studentsRes.data || [];
    const rawParticipations = participationsRes.data || [];
    const rawAssets = assetsRes.data || [];

    const eventMap = new Map(rawEvents.map(e => [e.id, e]));
    const studentMap = new Map(rawStudents.map(s => [s.id, s]));
    const teamMap = new Map(rawTeams.map(t => [t.id, t]));

    // 1. Calculate Team Scores & Breakdowns
    const teamStats: Record<string, {
      id: string;
      name: string;
      slug: string;
      color_hex: string;
      points: number;
      sections: { aliya: number; foundation: number; general: number };
      categories: { onStage: number; offStage: number };
    }> = {};

    rawTeams.forEach(t => {
      teamStats[t.id] = {
        id: t.id,
        name: t.name,
        slug: t.slug || t.id,
        color_hex: t.color_hex || "#caa02f",
        points: 0,
        sections: { aliya: 0, foundation: 0, general: 0 },
        categories: { onStage: 0, offStage: 0 }
      };
    });

    rawParticipations.forEach(p => {
      const teamId = p.team_id;
      if (!teamId || !teamStats[teamId]) return;
      const pts = Number(p.points_earned) || 0;
      if (pts <= 0) return;

      teamStats[teamId].points += pts;

      const ev = eventMap.get(p.event_id);
      if (ev) {
        // Section Breakdown
        const sections = Array.isArray(ev.applicable_section) ? ev.applicable_section : [ev.applicable_section];
        const secStr = sections.join(" ").toLowerCase();

        if (secStr.includes("general")) {
          teamStats[teamId].sections.general += pts;
        } else if (secStr.includes("foundation")) {
          teamStats[teamId].sections.foundation += pts;
        } else if (secStr.includes("aliya")) {
          teamStats[teamId].sections.aliya += pts;
        } else {
          teamStats[teamId].sections.general += pts;
        }

        // Category Breakdown (On Stage / Off Stage)
        const cat = (ev.category || "").toUpperCase();
        if (cat.includes("ON")) {
          teamStats[teamId].categories.onStage += pts;
        } else if (cat.includes("OFF")) {
          teamStats[teamId].categories.offStage += pts;
        }
      }
    });

    const teamsLeaderboard = Object.values(teamStats).sort((a, b) => b.points - a.points);

    // 2. Format Event Results & Winners
    const groupedResults: Record<string, {
      id: string;
      eventName: string;
      event_code: string;
      category: string;
      section: string;
      grade_type: string;
      winners: Array<{
        pos: number;
        posLabel: string;
        name: string;
        chest_no?: string | null;
        teamId: string;
        teamName: string;
        teamColor: string;
        grade: string | null;
        points: number;
      }>;
    }> = {};

    rawParticipations.forEach(p => {
      if (!p.result_position) return;
      const ev = eventMap.get(p.event_id);
      if (!ev) return;

      if (!groupedResults[ev.id]) {
        let secDisplay = "General";
        if (ev.applicable_section) {
          const arr = Array.isArray(ev.applicable_section) ? ev.applicable_section : [ev.applicable_section];
          secDisplay = arr.join(", ");
        }

        groupedResults[ev.id] = {
          id: ev.id,
          eventName: ev.name,
          event_code: ev.event_code || "",
          category: ev.category || "ON STAGE",
          section: secDisplay,
          grade_type: ev.grade_type || "A",
          winners: []
        };
      }

      let posNum = 1;
      if (p.result_position === "SECOND") posNum = 2;
      else if (p.result_position === "THIRD") posNum = 3;

      let winnerName = "Team Entry";
      let chestNo = null;

      if (p.student_id) {
        const st = studentMap.get(p.student_id);
        if (st) {
          winnerName = st.name;
          chestNo = st.chest_no;
        }
      } else if (p.team_id) {
        const tm = teamMap.get(p.team_id);
        if (tm) winnerName = tm.name;
      }

      const tm = teamMap.get(p.team_id);

      groupedResults[ev.id].winners.push({
        pos: posNum,
        posLabel: p.result_position,
        name: winnerName,
        chest_no: chestNo,
        teamId: p.team_id,
        teamName: tm?.name || "Unknown Team",
        teamColor: tm?.color_hex || "#caa02f",
        grade: p.performance_grade && p.performance_grade !== "NONE" ? p.performance_grade : null,
        points: Number(p.points_earned) || 0
      });
    });

    const eventsWithResults = Object.values(groupedResults).map(ev => {
      ev.winners.sort((a, b) => a.pos - b.pos);
      return ev;
    });

    // Sort events: alphabetical
    eventsWithResults.sort((a, b) => a.eventName.localeCompare(b.eventName));

    // 3. Category Breakdown Table Data
    const categoryBreakdown = teamsLeaderboard.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      color: t.color_hex,
      stats: {
        aliya: t.sections.aliya,
        foundation: t.sections.foundation,
        general: t.sections.general,
        onStage: t.categories.onStage,
        offStage: t.categories.offStage,
        total: t.points
      }
    }));

    // 4. TV Broadcast Controls from site_assets
    const broadcastAsset = rawAssets.find(a => a.key === "tv_broadcast_control");
    let broadcastState = null;
    if (broadcastAsset?.value) {
      try {
        broadcastState = typeof broadcastAsset.value === "string" ? JSON.parse(broadcastAsset.value) : broadcastAsset.value;
      } catch (e) {
        broadcastState = null;
      }
    }

    return NextResponse.json({
      success: true,
      teams: teamsLeaderboard,
      events: eventsWithResults,
      breakdown: categoryBreakdown,
      broadcast: broadcastState,
      lastUpdated: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("API /api/data error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
`;

fs.writeFileSync(path.join(apiDir, 'route.ts'), apiRouteCode, 'utf8');
console.log('Successfully updated D:/masa/dev/fest-2026-website/app/api/data/route.ts with broadcast state!');
