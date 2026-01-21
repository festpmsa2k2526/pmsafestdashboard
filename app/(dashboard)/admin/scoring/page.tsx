"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { EventScorer } from "@/components/scoring/event-scorer"
import { GradeSettingsDialog } from "@/components/scoring/grade-settings-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, BarChart3, Download, ChevronDown, Loader2, FileSpreadsheet } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const SECTIONS = [
  { id: 'SENIOR_ON', label: 'Senior On-Stage', section: 'Senior', cat: 'ON STAGE' },
  { id: 'SENIOR_OFF', label: 'Senior Off-Stage', section: 'Senior', cat: 'OFF STAGE' },
  { id: 'JUNIOR_ON', label: 'Junior On-Stage', section: 'Junior', cat: 'ON STAGE' },
  { id: 'JUNIOR_OFF', label: 'Junior Off-Stage', section: 'Junior', cat: 'OFF STAGE' },
  { id: 'SUB_ON', label: 'Sub-Jr On-Stage', section: 'Sub-Junior', cat: 'ON STAGE' },
  { id: 'SUB_OFF', label: 'Sub-Jr Off-Stage', section: 'Sub-Junior', cat: 'OFF STAGE' },
  { id: 'GENERAL_ON', label: 'General On-Stage', section: 'General', cat: 'ON STAGE' },
  { id: 'GENERAL_OFF', label: 'General Off-Stage', section: 'General', cat: 'OFF STAGE' },
  { id: 'FOUNDATION_ON', label: 'Foundation On-Stage', section: 'Foundation', cat: 'ON STAGE' },
  { id: 'FOUNDATION_OFF', label: 'Foundation Off-Stage', section: 'Foundation', cat: 'OFF STAGE' },
]

const EXPORT_CATEGORIES = [
  { label: 'Senior', value: 'Senior' },
  { label: 'Junior', value: 'Junior' },
  { label: 'Sub-Junior', value: 'Sub-Junior' },
  { label: 'General', value: 'General' },
  { label: 'Foundation', value: 'Foundation' },
]

export default function ScoringPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(SECTIONS[0].id)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingExcel, setDownloadingExcel] = useState(false)
  const supabase = createClient()

  // Load XLSX Script for Excel Generation
  useEffect(() => {
    const loadScript = (src: string) => {
        if (document.querySelector(`script[src="${src}"]`)) return;
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        document.body.appendChild(script);
    };
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
  }, []);

  const handleScoreUpdate = () => {
    // Optional: Refresh logic if needed
  }

  // --- GENERATE RESULTS PDF ---
  const generateResultsPDF = async (sectionLabel: string, sectionValue: string) => {
      setDownloadingPdf(true)
      try {
          // 1. Fetch Events for Section
          const { data: events, error: eventsError } = await supabase
              .from('events')
              .select('id, name, event_code, grade_type')
              .contains('applicable_section', [sectionValue])
              .order('name');

          if (eventsError) throw eventsError;
          if (!events || events.length === 0) {
              alert(`No events found for ${sectionLabel} section.`);
              setDownloadingPdf(false);
              return;
          }

          // 2. Fetch Results (First, Second, Third)
          const typedEvents = events as Array<{ id: string; name: string; event_code: string; grade_type: string }>;
          const eventIds = typedEvents.map((e) => e.id);
          const { data: results, error: resultsError } = await supabase
              .from('participations')
              .select(`
                  event_id,
                  result_position,
                  student:students ( name, chest_no ),
                  team:teams ( name )
              `)
              .in('event_id', eventIds)
              .not('result_position', 'is', null);

          if (resultsError) throw resultsError;

          // 3. Generate PDF
          const doc = new jsPDF();

          // Title
          doc.setFontSize(18);
          doc.setFont("helvetica", "bold");
          doc.text(`${sectionLabel.toUpperCase()} SECTION - FINAL RESULTS`, 105, 20, { align: "center" });
          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
          doc.text("PMSA ARTS FEST 2025-26", 105, 28, { align: "center" });

          const tableBody: any[] = [];

          typedEvents.forEach((event: { id: string; name: string; event_code: string; grade_type: string }) => {
              const eventResults = (results as Array<{ event_id: string; result_position: string; student: { name: string; chest_no: string }; team: { name: string } }>)?.filter(r => r.event_id === event.id) || [];
              const isTeamEvent = (event as { id: string; name: string; event_code: string; grade_type: string }).grade_type === 'C'; // Category C = Group Item

              const getWinners = (pos: string) => {
                  // Filter for ALL winners in this position (handles ties)
                  const winners = eventResults.filter(r => r.result_position === pos);

                  if (winners.length === 0) return "-";

                  // Map each winner to a string and join them with newlines
                  return winners.map(w => {
                      if (isTeamEvent) {
                          // Show Team Name for Category C
                          return w.team?.name || "Unknown Team";
                      } else {
                          // Show Participant Name, Chest No AND Team Name for others
                          return `${w.student?.name || "Unknown"} (${w.student?.chest_no || "N/A"}) - ${w.team?.name || ""}`;
                      }
                  }).join("\n");
              };

              tableBody.push([
                  event.name, // Event Name
                  getWinners('FIRST'),
                  getWinners('SECOND'),
                  getWinners('THIRD')
              ]);
          });

          autoTable(doc, {
              startY: 35,
              head: [["Event Name", "First", "Second", "Third"]],
              body: tableBody,
              theme: 'grid',
              headStyles: {
                  fillColor: [40, 40, 40],
                  halign: 'center',
                  valign: 'middle'
              },
              bodyStyles: {
                  valign: 'middle'
              },
              styles: { fontSize: 10, cellPadding: 3 },
              columnStyles: {
                  0: { fontStyle: 'bold', cellWidth: 50 }, // Event Name column width
                  1: { cellWidth: 'auto' },
                  2: { cellWidth: 'auto' },
                  3: { cellWidth: 'auto' }
              }
          });

          doc.save(`${sectionLabel}_Results.pdf`);

      } catch (err) {
          console.error("PDF Generation Error:", err);
          alert("Failed to generate PDF. Please try again.");
      } finally {
          setDownloadingPdf(false);
      }
  }

  // --- GENERATE RESULTS EXCEL ---
  const generateResultsExcel = async () => {
      // @ts-ignore
      if (!window.XLSX) { alert("Excel library loading... Please try again."); return; }

      setDownloadingExcel(true);
      try {
          // @ts-ignore
          const wb = window.XLSX.utils.book_new();

          for (const category of EXPORT_CATEGORIES) {
              // 1. Fetch Events
              const { data: events } = await supabase
                  .from('events')
                  .select('id, name, grade_type')
                  .contains('applicable_section', [category.value])
                  .order('name');

              if (!events || events.length === 0) continue;

              const typedEventsExcel = events as Array<{ id: string; name: string; grade_type: string }>;
              const eventIds = typedEventsExcel.map(e => e.id);

              // 2. Fetch Results
              const { data: results } = await supabase
                  .from('participations')
                  .select(`
                      event_id,
                      result_position,
                      performance_grade,
                      student:students ( name, chest_no ),
                      team:teams ( name )
                  `)
                  .in('event_id', eventIds)
                  .not('result_position', 'is', null)
                  .order('event_id');

              // 3. Format Data Rows
              const sheetRows: any[] = [];

              // Header Row
              sheetRows.push(["Event Name", "Participant", "Position", "Grade"]);

              typedEventsExcel.forEach(event => {
                  const eventResults = (results as any[])?.filter(r => r.event_id === event.id) || [];
                  const isTeamEvent = event.grade_type === 'C';

                  // Sort results by position rank
                  const positionRank: Record<string, number> = { 'FIRST': 1, 'SECOND': 2, 'THIRD': 3 };
                  eventResults.sort((a, b) => (positionRank[a.result_position] || 9) - (positionRank[b.result_position] || 9));

                  eventResults.forEach(r => {
                      let participantName = "";
                      if (isTeamEvent) {
                          participantName = r.team?.name || "Unknown Team";
                      } else {
                          participantName = `${r.student?.name || "Unknown"} (${r.student?.chest_no || "N/A"})`;
                      }

                      sheetRows.push([
                          event.name,
                          participantName,
                          r.result_position || "-",
                          r.performance_grade || "-"
                      ]);
                  });

                  // Add empty row between events for readability
                  if(eventResults.length > 0) sheetRows.push(["", "", "", ""]);
              });

              if (sheetRows.length > 1) { // Only add if we have data
                  // @ts-ignore
                  const ws = window.XLSX.utils.aoa_to_sheet(sheetRows);
                  // @ts-ignore
                  window.XLSX.utils.book_append_sheet(wb, ws, category.label);
              }
          }

          // @ts-ignore
          window.XLSX.writeFile(wb, `ArtsFest_Full_Results_${new Date().toISOString().slice(0, 10)}.xlsx`);

      } catch (err) {
          console.error("Excel Generation Error:", err);
          alert("Failed to generate Excel file.");
      } finally {
          setDownloadingExcel(false);
      }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 overflow-hidden pb-2 space-y-3">

      {/* Header Section */}
      <div className="shrink-0 flex items-center justify-between bg-white/60 backdrop-blur-md p-3 rounded-xl border border-border/50 shadow-sm">
         <div>
            <h1 className="text-xl md:text-2xl font-heading font-bold tracking-tight text-foreground">Score Registration</h1>
            <p className="text-muted-foreground text-xs hidden md:block">Record winners and update house points in real-time.</p>
         </div>

         <div className="flex items-center gap-2">

            {/* EXCEL EXPORT BUTTON */}
            <Button
                variant="outline"
                size="sm"
                disabled={downloadingExcel}
                onClick={generateResultsExcel}
                className="gap-2 h-8 text-xs border-dashed border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
            >
                {downloadingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Export Excel</span>
            </Button>

            {/* PDF EXPORT DROPDOWN */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={downloadingPdf} className="gap-2 h-8 text-xs border-dashed border-slate-300">
                        {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Export PDF</span>
                        <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white">
                    {EXPORT_CATEGORIES.map((cat) => (
                        <DropdownMenuItem
                            key={cat.value}
                            onClick={() => generateResultsPDF(cat.label, cat.value)}
                            className="cursor-pointer"
                        >
                            {cat.label} Section
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)} className="gap-2 h-8 text-xs">
                <Settings className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Rules</span>
            </Button>
            <Button size="sm" onClick={() => router.push('/admin/leaderboard')} className="gap-2 h-8 text-xs bg-slate-900 text-white hover:bg-slate-800">
                <BarChart3 className="w-3.5 h-3.5" /> Leaderboard
            </Button>
         </div>
      </div>

      {/* Main Scoring Area */}
      <div className="flex-1 flex flex-col min-h-0 glass-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
           <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">

             {/* Mega Highlight Tabs */}
             <div className="shrink-0 border-b border-border/50 bg-white/50 px-2 pt-2">
                <div className="overflow-x-auto pb-2 scrollbar-none">
                    <TabsList className="h-auto p-1 bg-muted/20 justify-start gap-2 w-max rounded-lg">
                        {SECTIONS.map(sec => (
                            <TabsTrigger
                                key={sec.id}
                                value={sec.id}
                                className="
                                    px-4 py-2 text-xs md:text-sm font-semibold rounded-md transition-all duration-200
                                    data-[state=active]:bg-primary
                                    data-[state=active]:text-primary-foreground
                                    data-[state=active]:shadow-md
                                    data-[state=active]:scale-105
                                    text-muted-foreground hover:text-foreground hover:bg-muted/50
                                "
                            >
                                {sec.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto bg-slate-50/50 relative">
                {SECTIONS.map(sec => (
                    <TabsContent key={sec.id} value={sec.id} className="mt-0 h-full p-2 md:p-4 data-[state=inactive]:hidden">
                        <EventScorer
                            section={sec.section}
                            category={sec.cat}
                            onScoreSaved={handleScoreUpdate}
                        />
                    </TabsContent>
                ))}
             </div>
           </Tabs>
      </div>

      <GradeSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onSuccess={handleScoreUpdate}
      />
    </div>
  )
}