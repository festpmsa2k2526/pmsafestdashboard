"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Loader2, Download, BarChart3, PieChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TeamPerformance } from "@/components/overview/team-performance"
import { SectionAnalysis } from "@/components/overview/section-analysis"
import { TopStudents } from "@/components/overview/top-students"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export default function OverviewPage() {
  const [loading, setLoading] = useState(true)
  const [teamStats, setTeamStats] = useState<Array<any>>([])
  const [classStats, setClassStats] = useState<Array<any>>([])
  const [studentStats, setStudentStats] = useState<Array<any>>([])
  const [isDownloading, setIsDownloading] = useState(false)

  interface Team {
    id: string
    name: string
    color_hex: string
    penalty_points: number
  }

  const supabase = createClient()

  // Load Scripts for PDF
  useEffect(() => {
    const loadScript = (src: string) => {
        if (document.querySelector(`script[src="${src}"]`)) return;
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        document.body.appendChild(script);
    };
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js");
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      // 1. Fetch Teams to get Penalty Points
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, color_hex, penalty_points') as { data: Team[] | null; error: any }

      if (teamsError || !teamsData) {
          console.error("Error fetching teams", teamsError);
          setLoading(false);
          return;
      }

      // 2. Fetch All Participations
      const { data: participations, error: partError } = await supabase
        .from('participations')
        .select(`
          points_earned,
          result_position,
          team:teams ( id, name, color_hex ),
          student:students ( id, name, chest_no, section, class_grade ),
          event:events ( category, grade_type )
        `)
        .gt('points_earned', 0)

      if (partError || !participations) {
        console.error("Error fetching participations", partError)
        setLoading(false)
        return
      }

      // --- PROCESS TEAM DATA ---
      const teamsMap = new Map()

      // Initialize with all teams and their penalties
      teamsData.forEach((team) => {
          teamsMap.set(team.id, {
              name: team.name,
              color: team.color_hex,
              earnedPoints: 0,
              penalty: team.penalty_points || 0,
              totalPoints: 0, // Will be calculated: earned - penalty
              first: 0,
              second: 0,
              third: 0
          })
      })

      participations.forEach((p: any) => {
        if (!p.team) return
        const tid = p.team.id

        // Ensure team exists in map (it should from step 1, but safety check)
        if (teamsMap.has(tid)) {
            const t = teamsMap.get(tid)
            t.earnedPoints += p.points_earned
            if (p.result_position === 'FIRST') t.first++
            if (p.result_position === 'SECOND') t.second++
            if (p.result_position === 'THIRD') t.third++
        }
      })

      // Calculate final total points (Apply Penalty)
      teamsMap.forEach((t) => {
          t.totalPoints = Math.max(0, t.earnedPoints - t.penalty)
      })

      const processedTeams = Array.from(teamsMap.values()).sort((a,b) => b.totalPoints - a.totalPoints)
      setTeamStats(processedTeams)

      // --- PROCESS CLASS DATA ---
      const classMap = new Map()
      participations.forEach((p: any) => {
        if (!p.student || !p.student.class_grade) return
        const key = `${p.student.section}-${p.student.class_grade}`
        if (!classMap.has(key)) {
          classMap.set(key, {
            className: p.student.class_grade,
            section: p.student.section,
            totalPoints: 0
          })
        }
        classMap.get(key).totalPoints += p.points_earned
      })
      setClassStats(Array.from(classMap.values()))

      // --- PROCESS STUDENT DATA (Top 5 Calc) ---
      const studentMap = new Map()
      participations.forEach((p: any) => {
        if (!p.student) return
        // Exclude Group Items from Individual Ranking
        if (p.event?.grade_type === 'C') return

        const sid = p.student.id
        if (!studentMap.has(sid)) {
          studentMap.set(sid, {
            name: p.student.name,
            chestNo: p.student.chest_no,
            section: p.student.section,
            teamName: p.team?.name,
            teamColor: p.team?.color_hex,
            totalPoints: 0,
            first: 0,
            second: 0,
            third: 0
          })
        }
        const s = studentMap.get(sid)
        s.totalPoints += p.points_earned
        if (p.result_position === 'FIRST') s.first++
        if (p.result_position === 'SECOND') s.second++
        if (p.result_position === 'THIRD') s.third++
      })
      setStudentStats(Array.from(studentMap.values()))

      setLoading(false)
    }

    fetchData()
  }, [])

  const handleDownloadPDF = () => {
    // @ts-ignore
    if (!window.jspdf) { alert("PDF library loading..."); return; }
    setIsDownloading(true)

    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Title
    doc.setFontSize(22);
    doc.text("ARTS FEST 2025 - OVERVIEW REPORT", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: "center" });

    let yPos = 40;

    // 1. Team Standings Table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("1. TEAM STANDINGS", 14, yPos);
    yPos += 5;

    // We include Earned, Penalty, and Net Score for clarity
    autoTable(doc, {
        startY: yPos,
        head: [["Rank", "Team Name", "Earned Pts", "Penalty", "Net Points", "1st", "2nd", "3rd"]],
        body: teamStats.map((t, i) => [
            i + 1,
            t.name,
            t.earnedPoints,
            t.penalty > 0 ? `-${t.penalty}` : "0",
            t.totalPoints,
            t.first,
            t.second,
            t.third
        ]),
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 40] },
        columnStyles: {
            4: { fontStyle: 'bold' } // Highlight Net Points
        }
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 15;

    // 2. Top Students (Overall)
    doc.text("2. TOP PERFORMERS (INDIVIDUAL)", 14, yPos);
    yPos += 5;

    const topStudents = [...studentStats].sort((a,b) => b.totalPoints - a.totalPoints).slice(0, 10);

    autoTable(doc, {
        startY: yPos,
        head: [["Rank", "Name", "Chest No", "Section", "Team", "Points"]],
        body: topStudents.map((s, i) => [i + 1, s.name, s.chestNo, s.section, s.teamName, s.totalPoints]),
        theme: 'grid',
        headStyles: { fillColor: [70, 70, 70] }
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 15;

    // 3. Class Performance (Summary)
    if (yPos > 250) {
        doc.addPage();
        yPos = 20;
    }

    doc.text("3. CLASS-WISE PERFORMANCE LEADERBOARD", 14, yPos);
    yPos += 5;

    const topClasses = [...classStats].sort((a,b) => b.totalPoints - a.totalPoints).slice(0, 15);

    autoTable(doc, {
        startY: yPos,
        head: [["Rank", "Class", "Section", "Total Points"]],
        body: topClasses.map((c, i) => [i + 1, c.className, c.section, c.totalPoints]),
        theme: 'striped'
    });

    doc.save("ArtsFest_Overview_Stats.pdf");
    setIsDownloading(false);
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] w-full items-center justify-center bg-slate-50/50">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] p-4 md:p-6 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Event Overview</h1>
          <p className="text-slate-500 mt-1 text-sm">Real-time statistics, team standings, and performance analytics.</p>
        </div>
        <Button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20"
        >
          {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Download Report
        </Button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Team Chart - Spans 2 Columns on large screens, full on smaller */}
        <div className="lg:col-span-2">
           <TeamPerformance data={teamStats} />
        </div>

        {/* Top Students - Side column */}
        <div className="lg:col-span-1 row-span-2 h-full">
           <TopStudents data={studentStats} />
        </div>

        {/* Section Analysis - Bottom Left */}
        <div className="lg:col-span-2">
           <SectionAnalysis data={classStats} />
        </div>

      </div>
    </div>
  )
}