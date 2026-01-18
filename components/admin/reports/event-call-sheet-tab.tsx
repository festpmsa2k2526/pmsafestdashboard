"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Loader2, FileText, Printer, FileDown, ChevronDown, Check, UserCheck, UserX, Clock, FileSpreadsheet, Download } from "lucide-react"
import { cn } from "@/lib/utils"

interface Event {
    id: string;
    name: string;
    event_code: string;
    category: string;
    grade_type?: 'A' | 'B' | 'C';
    max_participants_per_team: number
}

interface ParticipationRecord {
    id: string
    event_id: string
    status: string
    attendance_status: string | null
    students: {
        name: string
        chest_no: string | null
        class_grade: string | null
        section: string
        team: {
            name: string
            color_hex: string
        }
    }
}

interface CompletionStatusRow {
    event_id: string
    attendance_status: string | null
}

export function EventCallSheetTab({ events }: { events: Event[] }) {
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [loadingEvent, setLoadingEvent] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [generatingList, setGeneratingList] = useState(false)
  const [generatingExcel, setGeneratingExcel] = useState(false)
  const [participants, setParticipants] = useState<ParticipationRecord[]>([])
  const [completedEventIds, setCompletedEventIds] = useState<Set<string>>(new Set())
  const [headerImage, setHeaderImage] = useState<string | null>(null)

  const supabase = createClient()

  // 0. Load External Scripts
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
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
  }, []);

  // 1. Fetch Header Image & Completion Status
  useEffect(() => {
    async function initData() {
        // Fetch Header Image
        const { data: assetData } = await supabase
            .from('site_assets')
            .select('value')
            .eq('key', 'score_sheet_header')
            .single()

        if (assetData && typeof assetData === 'object' && 'value' in assetData) {
            setHeaderImage((assetData as { value: string }).value)
        }

        // Fetch Completion Status
        const { data } = await supabase
            .from('participations')
            .select('event_id, attendance_status')

        if (data) {
            const records = data as unknown as CompletionStatusRow[]
            const statusMap: Record<string, boolean> = {}

            records.forEach(p => {
                if (statusMap[p.event_id] === false) return;
                if (statusMap[p.event_id] === undefined) statusMap[p.event_id] = true;
                if (!p.attendance_status || p.attendance_status === 'pending') {
                    statusMap[p.event_id] = false;
                }
            })

            const completed = new Set<string>()
            Object.keys(statusMap).forEach(id => {
                if (statusMap[id]) completed.add(id)
            })
            setCompletedEventIds(completed)
        }
    }
    initData()
  }, [events])

  // 2. Load Participants for Selected Event
  useEffect(() => {
    if (!selectedEventId) {
      setParticipants([])
      return
    }

    async function loadEventData() {
      setLoadingEvent(true)
      const { data } = await supabase
        .from('participations')
        .select(`
          id, event_id, status, attendance_status,
          teams ( name, color_hex ),
          students!inner ( name, chest_no, class_grade, section )
        `)
        .eq('event_id', selectedEventId)
        .order('created_at', { ascending: true })

      if (data) {
        const rawData = data as unknown as any[]
        const formatted: ParticipationRecord[] = rawData.map((p) => ({
          id: p.id,
          event_id: p.event_id,
          status: p.status,
          attendance_status: p.attendance_status || 'pending',
          students: {
            name: p.students?.name || "Unknown",
            chest_no: p.students?.chest_no || 'N/A',
            class_grade: p.students?.class_grade || '-',
            section: p.students?.section || '-',
            team: {
                name: p.teams?.name || "Unknown Team",
                color_hex: p.teams?.color_hex || "#ccc"
            }
          }
        }))

        formatted.sort((a, b) => {
            const chestA = parseInt(a.students.chest_no || '999') || 999
            const chestB = parseInt(b.students.chest_no || '999') || 999
            return chestA - chestB
        })

        setParticipants(formatted)
      }
      setLoadingEvent(false)
    }
    loadEventData()
  }, [selectedEventId])

  // 3. Handle Status Change
  const updateAttendance = async (participationId: string, newStatus: string) => {
      setParticipants(prev => prev.map(p =>
          p.id === participationId ? { ...p, attendance_status: newStatus } : p
      ))

      try {
          const { error } = await (supabase.from('participations') as any)
            .update({ attendance_status: newStatus })
            .eq('id', participationId)

          if (error) throw error

          const allMarked = participants.every(p => {
              if (p.id === participationId) return newStatus !== 'pending';
              return p.attendance_status !== 'pending';
          })

          setCompletedEventIds(prev => {
              const next = new Set(prev)
              if (allMarked) next.add(selectedEventId)
              else next.delete(selectedEventId)
              return next
          })
      } catch (err) {
          console.error("Failed to update status", err)
      }
  }

  // --- HELPER: Image to Data URL ---
  const getImageDataUrl = async (url: string): Promise<string> => {
      try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
          });
      } catch (e) {
          console.error("Failed to load image", e);
          return "";
      }
  }

  // --- NEW: GENERATE SCORE SHEET (JUDGMENT SHEET) ---
  const generateScoreSheetPDF = async (eventsToPrint: Event[]) => {
    // @ts-ignore
    if (!window.jspdf) { alert("PDF library loading..."); return; }

    setGeneratingPdf(true)
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // A4 size
    let isFirstPage = true

    // Fetch header image base64 if available
    let headerImgData = "";
    if (headerImage) {
        headerImgData = await getImageDataUrl(headerImage);
    }

    for (const event of eventsToPrint) {
        if (!isFirstPage) doc.addPage()
        isFirstPage = false

        // Fetch Event Description (Criteria) & Participants
        const [eventDetails, participantsRes] = await Promise.all([
            supabase.from('events').select('description').eq('id', event.id).single(),
            supabase.from('participations').select('id, teams(name), students(chest_no)').eq('event_id', event.id)
        ]);

        const criteria = (eventDetails.data as { description: string } | null)?.description || "";
        const parts = participantsRes.data as any[] || [];

        // --- PAGE LAYOUT ---
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPos = 15;

        // 1. Header Image
        if (headerImgData) {
            try {
                const imgProps = doc.getImageProperties(headerImgData);
                // Calculate height to fit width within margins, max height 35mm
                const desiredWidth = pageWidth - 2 * margin;
                let imgHeight = (imgProps.height * desiredWidth) / imgProps.width;
                if (imgHeight > 35) {
                    imgHeight = 35;
                    const adjustedWidth = (imgProps.width * imgHeight) / imgProps.height;
                    const xOffset = (pageWidth - adjustedWidth) / 2;
                    doc.addImage(headerImgData, 'PNG', xOffset, yPos, adjustedWidth, imgHeight);
                } else {
                    doc.addImage(headerImgData, 'PNG', margin, yPos, desiredWidth, imgHeight);
                }
                yPos += imgHeight + 5;
            } catch (e) { console.warn("Could not add header image", e) }
        } else {
             // Fallback Text Header if no image
             doc.setFontSize(16);
             doc.setFont("helvetica", "bold");
             doc.text("PMSA ARTS FEST 2025-26", pageWidth / 2, yPos, { align: 'center' });
             yPos += 10;
        }

        // 2. Titles
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("JUDGMENT SHEET", pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("GRADING SYSTEM: GRADE A-80% AND ABOVE, GRADE B-70% TO 79%, GRADE C-60% TO 69%", pageWidth / 2, yPos, { align: 'center' });
        yPos += 12;

        // 3. Info Fields (ITEM, TOPIC, CRITERIA)
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");

        // ITEM
        doc.text("ITEM:", margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(`${event.name} (${event.event_code})`, margin + 15, yPos);
        yPos += 8;

        // TOPIC
        doc.setFont("helvetica", "bold");
        doc.text("TOPIC:", margin, yPos);
        // Draw underline for topic
        doc.setLineWidth(0.1);
        doc.line(margin + 18, yPos + 1, pageWidth - margin, yPos + 1);
        yPos += 8;

        // CRITERIA
        doc.setFont("helvetica", "bold");
        doc.text("CRITERIA:", margin, yPos);
        if (criteria) {
             doc.setFont("helvetica", "normal");
             doc.setFontSize(10);
             const splitCriteria = doc.splitTextToSize(criteria, pageWidth - margin - 35);
             doc.text(splitCriteria, margin + 25, yPos);
             yPos += (splitCriteria.length * 5) + 5;
        } else {
             yPos += 8;
        }

        yPos += 2;

        // 4. Table Prep & Dynamic Sizing
        const isCategoryC = event.grade_type === 'C';
        let effectiveCount = 0;

        // Determine number of rows
        if (isCategoryC) {
            effectiveCount = 4; // Strictly A, B, C, D
        } else {
            const rowCount = parts.length;
            effectiveCount = Math.max(rowCount, 5); // At least 5 rows
        }

        // Calculate available space for table to fill page
        const footerHeight = 30;
        const bottomMargin = 15;
        const availableHeight = pageHeight - yPos - footerHeight - bottomMargin;
        const tableHeaderHeight = 10;
        const availableForRows = availableHeight - tableHeaderHeight;

        // Calculate row height to fill page
        let dynamicRowHeight = availableForRows / effectiveCount;

        // Clamp row height (e.g. max 35mm, min 10mm)
        if (dynamicRowHeight > 35) dynamicRowHeight = 35;
        if (dynamicRowHeight < 10) dynamicRowHeight = 10;

        const tableBody = [];
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        for (let i = 0; i < effectiveCount; i++) {
            const code = letters[i % 26] + (Math.floor(i / 26) > 0 ? Math.floor(i / 26) : "");
            tableBody.push([
                code, // CODE (A, B, C...)
                "",   // REMARKS
                "",   // PLACE
                ""    // GRADE
            ]);
        }

        doc.autoTable({
            startY: yPos,
            head: [["CODE", "REMARKS", "PLACE", "GRADE"]],
            body: tableBody,
            theme: 'grid', // Full Borders
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                lineWidth: 0.3, // Distinct border
                lineColor: [0, 0, 0],
                halign: 'center',
                valign: 'middle',
                fontStyle: 'bold',
                minCellHeight: 10
            },
            bodyStyles: {
                lineWidth: 0.3, // Distinct border
                lineColor: [0, 0, 0],
                minCellHeight: dynamicRowHeight, // Dynamic Height
                valign: 'middle',
                textColor: [0,0,0]
            },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center', fontStyle: 'bold', fontSize: 12 }, // CODE
                1: { cellWidth: 'auto' }, // REMARKS
                2: { cellWidth: 25, halign: 'center' }, // PLACE
                3: { cellWidth: 25, halign: 'center' }  // GRADE
            },
            didParseCell: function(data: any) {
                // Ensure text color is black
                data.cell.styles.textColor = [0, 0, 0];
            }
        });

        // 5. Footer (NAME & SIGN) - Fixed at bottom
        const footerY = pageHeight - 25;

        // Ensure we are on the page where table ends (handled by adding to current page)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("NAME & SIGN OF THE JUDGE : _______________________________", margin, footerY);
    }

    doc.save("judgment_sheets.pdf")
    setGeneratingPdf(false)
  }

  // --- NEW: GENERATE PARTICIPANT LIST (BULK EXPORT) ---
  const generateParticipantListPDF = async (category: 'ON STAGE' | 'OFF STAGE') => {
      // @ts-ignore
      if (!window.jspdf) { alert("PDF library loading..."); return; }
      setGeneratingList(true);

      const filteredEvents = events.filter(e => e.category === category);
      if (filteredEvents.length === 0) {
          alert(`No events found for ${category}`);
          setGeneratingList(false);
          return;
      }

      // @ts-ignore
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let isFirst = true;

      // Title Page
      doc.setFontSize(22);
      doc.text(`PARTICIPANT LIST - ${category}`, 105, 100, { align: 'center' });
      doc.setFontSize(14);
      doc.text("PMSA ARTS FEST 2025-26", 105, 115, { align: 'center' });
      doc.addPage();

      for (const event of filteredEvents) {
          // Fetch participants for this event
          const { data } = await supabase
            .from('participations')
            .select(`
               students ( name, chest_no, class_grade, section ),
               teams ( name )
            `)
            .eq('event_id', event.id);

          const rawParts = data as any[] || [];
          const parts = rawParts.map(p => ({
              chest: p.students?.chest_no || "N/A",
              name: p.students?.name || "Unknown",
              class: p.students?.class_grade || "",
              team: p.teams?.name || "Unknown"
          })).sort((a, b) => (parseInt(a.chest) || 999) - (parseInt(b.chest) || 999));

          // Draw Table
          if (parts.length > 0) {
              const body = parts.map((p, i) => [i + 1, p.chest, p.name, p.class, p.team]);

              doc.setFontSize(14);
              doc.setFont("helvetica", "bold");
              const finalY = (doc as any).lastAutoTable?.finalY || 20;

              if (finalY > 250) {
                  doc.addPage();
                  doc.text(`${event.name} (${event.event_code})`, 14, 20);
              } else {
                  const y = finalY === 20 ? 20 : finalY + 15;
                  if (y > 270) {
                      doc.addPage();
                      doc.text(`${event.name} (${event.event_code})`, 14, 20);
                  } else {
                      doc.text(`${event.name} (${event.event_code})`, 14, y);
                  }
              }

              const tableY = (doc as any).lastAutoTable?.finalY && (doc as any).lastAutoTable.finalY < 250
                             ? (doc as any).lastAutoTable.finalY + 20
                             : 25;

              doc.autoTable({
                  startY: tableY,
                  head: [["#", "Chest No", "Name", "Class", "Team"]],
                  body: body,
                  theme: 'striped',
                  headStyles: { fillColor: [50, 50, 50] },
                  margin: { top: 20 },
                  pageBreak: 'avoid'
              });
          }
      }

      doc.save(`${category}_Participant_List.pdf`);
      setGeneratingList(false);
  }

  // --- EXCEL GENERATION LOGIC ---
  const generateExcel = async () => {
    // @ts-ignore
    if (!window.XLSX) { alert("XLSX library loading..."); return; }

    try {
        setGeneratingExcel(true)
        const { data: allData } = await supabase.from('participations').select(`event_id, teams (name), students (name)`);

        // @ts-ignore
        const wb = window.XLSX.utils.book_new();
        // @ts-ignore
        const ws = window.XLSX.utils.json_to_sheet(allData?.map((p:any) => ({
            EventID: p.event_id,
            Student: p.students?.name,
            Team: p.teams?.name
        })) || []);
        // @ts-ignore
        window.XLSX.utils.book_append_sheet(wb, ws, "Participants");
        // @ts-ignore
        window.XLSX.writeFile(wb, "ArtsFest_Data.xlsx");

    } catch (error) {
        console.error("Excel generation failed:", error)
        alert("Failed to generate Excel file.")
    } finally {
        setGeneratingExcel(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg shadow-sm">
        {/* Toolbar */}
        <div className="shrink-0 p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-end">
            <div className="w-full sm:w-[400px] space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Event Sheet</label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger className="w-full bg-white h-10 shadow-sm border-slate-200">
                        <SelectValue placeholder="Choose an event to mark..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-white">
                        {events.map(e => (
                            <SelectItem key={e.id} value={e.id} className="cursor-pointer">
                                <div className="flex items-center justify-between w-full gap-4">
                                    <span className={cn("font-medium", completedEventIds.has(e.id) ? "text-green-700" : "text-slate-700")}>
                                        {e.name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {completedEventIds.has(e.id) && <Check className="w-3 h-3 text-green-600" />}
                                        <span className={cn("ml-auto text-xs font-mono border px-1 rounded", completedEventIds.has(e.id) ? "border-green-200 bg-green-50 text-green-700" : "text-slate-400 border-slate-200")}>
                                            {e.event_code || '---'}
                                        </span>
                                    </div>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
                {/* EXCEL BUTTON */}
                <Button
                    variant="outline"
                    onClick={generateExcel}
                    disabled={generatingExcel}
                    className="gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                >
                    {generatingExcel ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileSpreadsheet className="w-4 h-4" />}
                    Export Excel
                </Button>

                {/* PDF SCORE SHEET (Single) */}
                <Button
                    variant="outline"
                    disabled={!selectedEventId || generatingPdf}
                    onClick={() => { const e = events.find(ev => ev.id === selectedEventId); if(e) generateScoreSheetPDF([e]) }}
                    className="gap-2 bg-white hover:bg-slate-50"
                >
                    {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4" />}
                    Score Sheet
                </Button>

                {/* BULK SCORE SHEET EXPORT */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="gap-2 bg-slate-900 text-white hover:bg-slate-800">
                            <Printer className="w-4 h-4" /> Bulk Score Sheets <ChevronDown className="w-3 h-3 opacity-50"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white">
                        <DropdownMenuItem onClick={() => generateScoreSheetPDF(events.filter(e => e.category === 'ON STAGE'))}>
                            All ON STAGE
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateScoreSheetPDF(events.filter(e => e.category === 'OFF STAGE'))}>
                            All OFF STAGE
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                 {/* NEW: BULK PARTICIPANT LIST EXPORT */}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2 border-slate-300">
                            {generatingList ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />}
                            Participants List <ChevronDown className="w-3 h-3 opacity-50"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white">
                        <DropdownMenuItem onClick={() => generateParticipantListPDF('ON STAGE')}>
                            ON STAGE List
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generateParticipantListPDF('OFF STAGE')}>
                            OFF STAGE List
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-white">
            {!selectedEventId ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <div className="p-6 rounded-full bg-slate-50 mb-4"><FileText className="w-10 h-10" /></div>
                    <p className="font-medium text-slate-500">Select an event above to mark participation</p>
                </div>
            ) : loadingEvent ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
            ) : (
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm border-b">
                        <TableRow>
                            <TableHead className="w-20 font-bold text-slate-700">Chest No</TableHead>
                            <TableHead className="font-bold text-slate-700">Student Name</TableHead>
                            <TableHead className="font-bold text-slate-700 hidden md:table-cell">Class</TableHead>
                            <TableHead className="font-bold text-slate-700">Team</TableHead>
                            <TableHead className="w-[180px] text-right font-bold text-slate-700 pr-6">Participation</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {participants.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-16 text-muted-foreground italic">No participants found.</TableCell></TableRow>
                        ) : (
                            participants.map((p, idx) => (
                                <TableRow key={p.id} className={cn("hover:bg-slate-50 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                                    <TableCell className="font-bold font-mono text-base text-slate-700 bg-slate-50/50 border-r">{p.students.chest_no}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-900">{p.students.name}</div>
                                        <div className="text-xs text-slate-500">{p.students.section}</div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-slate-600">{p.students.class_grade}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.students.team.color_hex }}></div>
                                            <span className="font-medium text-sm text-slate-700">{p.students.team.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <Select
                                            defaultValue={p.attendance_status || 'pending'}
                                            onValueChange={(val) => updateAttendance(p.id, val)}
                                        >
                                            <SelectTrigger
                                                className={cn(
                                                    "w-40 h-8 ml-auto border transition-colors focus:ring-0",
                                                    p.attendance_status === 'present' ? "bg-green-50 border-green-200 text-green-700 font-medium" :
                                                    p.attendance_status === 'absent' ? "bg-red-50 border-red-200 text-red-700 font-medium" :
                                                    "bg-white border-slate-200 text-slate-500"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {p.attendance_status === 'present' && <UserCheck className="w-3.5 h-3.5"/>}
                                                    {p.attendance_status === 'absent' && <UserX className="w-3.5 h-3.5"/>}
                                                    {(p.attendance_status === 'pending' || !p.attendance_status) && <Clock className="w-3.5 h-3.5"/>}
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent align="end" className="bg-white">
                                                <SelectItem value="pending" className="text-slate-500">
                                                    <div className="flex items-center gap-2"><Clock className="w-4 h-4"/> Pending</div>
                                                </SelectItem>
                                                <SelectItem value="present" className="text-green-600 font-medium">
                                                    <div className="flex items-center gap-2"><UserCheck className="w-4 h-4"/> Present</div>
                                                </SelectItem>
                                                <SelectItem value="absent" className="text-red-600 font-medium">
                                                    <div className="flex items-center gap-2"><UserX className="w-4 h-4"/> Absent</div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            )}
        </div>
    </div>
  )
}