"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, Users, CalendarCheck, Download, ChevronDown } from "lucide-react"
import { ParticipantStatusTab } from "@/components/captain/status/participant-status-tab"
import { EventStatusTab } from "@/components/captain/status/event-status-tab"

// Define interface for the profile response
interface ProfileData {
  team_id: string | null
  teams: {
    name: string
  } | null
}

export default function CaptainStatusPage() {
  const [loading, setLoading] = useState(true)
  const [teamName, setTeamName] = useState("")

  const [students, setStudents] = useState<any[]>([])
  const [participations, setParticipations] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const [generatingPdf, setGeneratingPdf] = useState(false)

  const supabase = createClient()

  // 0. Load External Scripts (Preview Environment Fix)
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
    async function loadTeamData() {
      try {
        setLoading(true)
        // 1. Get Current User
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setError("Not authenticated")
            return
        }

        // 2. Find Team from Profiles
        const { data } = await supabase
            .from('profiles')
            .select('team_id, teams(name)')
            .eq('id', user.id)
            .single()

        const profile = data as unknown as ProfileData

        if (!profile || !profile.team_id) {
            setError("No team assigned to this account.")
            return
        }

        const currentTeamId = profile.team_id
        setTeamName(profile.teams?.name || "Your Team")

        // 3. Fetch Students & Their Participations (For Compliance Tab)
        const { data: studentData } = await supabase
            .from('students')
            .select(`
                id, name, chest_no, section, class_grade,
                participations (
                    attendance_status,
                    events (
                        category,
                        max_participants_per_team
                    )
                )
            `)
            .eq('team_id', currentTeamId)
            .order('name')

        setStudents(studentData || [])

        // 4. Fetch All Participations with Event Details (For Attendance Tab)
        const { data: participationData } = await supabase
            .from('participations')
            .select(`
                id, attendance_status,
                event:events ( name, category, event_code ),
                student:students ( name, chest_no, class_grade )
            `)
            .eq('team_id', currentTeamId)
            .order('created_at')

        setParticipations(participationData || [])

      } catch (err: any) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadTeamData()
  }, [])

  // 5. Generate PDF Handler
  const generateTeamPDF = (category: 'ON STAGE' | 'OFF STAGE') => {
      // @ts-ignore
      if (!window.jspdf) { alert("PDF library loading... Please try again."); return; }

      setGeneratingPdf(true)

      try {
          // Filter participations by category
          const filteredParticipations = participations.filter(p => p.event?.category === category);

          if (filteredParticipations.length === 0) {
              alert(`No ${category} participations found.`);
              setGeneratingPdf(false);
              return;
          }

          // @ts-ignore
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();

          // Group participations by Event
          const groupedByEvent: Record<string, any[]> = {};
          filteredParticipations.forEach(p => {
              const eventName = p.event ? `${p.event.name} (${p.event.event_code})` : "Unknown Event";
              if (!groupedByEvent[eventName]) groupedByEvent[eventName] = [];
              groupedByEvent[eventName].push(p);
          });

          // Header
          doc.setFontSize(22);
          doc.text(`TEAM REPORT - ${category}`, 105, 20, { align: "center" });

          doc.setFontSize(14);
          doc.text(`Team: ${teamName}`, 105, 30, { align: "center" });
          doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 38, { align: "center" });

          let yPos = 50;

          // Iterate through events
          Object.keys(groupedByEvent).sort().forEach((eventName, index) => {
              const parts = groupedByEvent[eventName];

              // Check if page break needed
              if (yPos > 250) {
                  doc.addPage();
                  yPos = 20;
              }

              doc.setFontSize(12);
              doc.setFont("helvetica", "bold");
              doc.text(`${index + 1}. ${eventName}`, 14, yPos);
              yPos += 5;

              const tableBody = parts.map(p => [
                  p.student?.chest_no || "-",
                  p.student?.name || "Unknown",
                  p.student?.class_grade || "-",
                  p.attendance_status === 'present' ? 'Present' : (p.attendance_status === 'absent' ? 'Absent' : 'Pending')
              ]);

              doc.autoTable({
                  startY: yPos,
                  head: [["Chest No", "Student Name", "Class", "Status"]],
                  body: tableBody,
                  theme: 'grid',
                  headStyles: { fillColor: [40, 40, 40], fontSize: 10 },
                  bodyStyles: { fontSize: 10 },
                  margin: { left: 14, right: 14 },
              });

              // Update Y pos for next table
              yPos = (doc as any).lastAutoTable.finalY + 15;
          });

          doc.save(`${teamName.replace(/\s+/g, '_')}_${category.replace(/\s+/g, '_')}_Report.pdf`);

      } catch (e) {
          console.error("PDF Generation failed", e);
          alert("Failed to generate PDF.");
      } finally {
          setGeneratingPdf(false);
      }
  }

  if (loading) return <div className="h-[calc(100vh-4rem)] flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>

  if (error) {
      return (
          <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center p-4">
              <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
              <p className="text-slate-500 mt-2">{error}</p>
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Status Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Monitoring compliance and attendance for <span className="font-bold text-primary">{teamName}</span>.
                </p>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        disabled={generatingPdf || participations.length === 0}
                        className="bg-slate-900 text-white hover:bg-slate-800 shrink-0 gap-2"
                    >
                        {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download Report <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white">
                    <DropdownMenuItem onClick={() => generateTeamPDF('ON STAGE')}>
                        On Stage Events
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => generateTeamPDF('OFF STAGE')}>
                        Off Stage Events
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <Tabs defaultValue="participants" className="space-y-6">
            <div className="bg-white p-1 rounded-lg border inline-flex shadow-sm">
                <TabsList className="bg-transparent h-auto p-0 gap-1">
                    <TabsTrigger
                        value="participants"
                        className="py-2.5 px-4 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none text-slate-500 font-medium transition-all"
                    >
                        <Users className="w-4 h-4 mr-2" />Compliance
                    </TabsTrigger>
                    <TabsTrigger
                        value="events"
                        className="py-2.5 px-4 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none text-slate-500 font-medium transition-all"
                    >
                        <CalendarCheck className="w-4 h-4 mr-2" />Attendance
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="participants" className="animate-in slide-in-from-left-2 duration-300">
                <ParticipantStatusTab students={students} />
            </TabsContent>

            <TabsContent value="events" className="animate-in slide-in-from-right-2 duration-300">
                <EventStatusTab participations={participations} />
            </TabsContent>
        </Tabs>
    </div>
  )
}