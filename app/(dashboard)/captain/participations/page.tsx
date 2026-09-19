"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Loader2, AlertCircle, Calendar, Search, Printer, FileDown, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Raw DB Response Type
interface RawParticipation {
  id: string
  status: string
  created_at: string
  students: {
    id: string
    name: string
    section: string
    chest_no: string | null
    class_grade: string | null
  }
  events: {
    name: string
    category: string
    event_code: string | null
  }
}

// Grouped Type for UI
interface GroupedParticipant {
  studentId: string
  student: RawParticipation['students']
  category: string
  events: RawParticipation['events'][]
  status: string // simplified status for the group
}

interface Profile { team_id: string }

export default function CaptainParticipations() {
  const [rawData, setRawData] = useState<RawParticipation[]>([])
  const [groupedData, setGroupedData] = useState<GroupedParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // State for Header Image
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null)
  const [headerImageActive, setHeaderImageActive] = useState(true)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const supabase = createClient()

  // Fetch Data & Assets
  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single()

      const profile = profileData as unknown as Profile
      if (!profile?.team_id) return

      // 1. Fetch Participations
      const { data: participations, error } = await supabase
        .from('participations')
        .select(`
          id,
          status,
          created_at,
          students ( id, name, section, chest_no, class_grade ),
          events ( name, category, event_code )
        `)
        .eq('team_id', profile.team_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const rows = participations as any as RawParticipation[]
      setRawData(rows)
      processGroupedData(rows)

      // 2. Fetch Header Image Asset & Active State
      const { data: assetData } = await (supabase.from('site_assets') as any)
        .select('key, value')
        .eq('key', 'admit_card_header')
        .single()

      if (assetData && assetData.value) {
        const rawVal = assetData.value
        if (!rawVal.startsWith('DISABLED:') && !rawVal.startsWith('INACTIVE:')) {
          setHeaderImageUrl(rawVal)
          setHeaderImageActive(true)
        } else {
          setHeaderImageUrl(null)
          setHeaderImageActive(false)
        }
      } else {
        setHeaderImageUrl(null)
        setHeaderImageActive(false)
      }

    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Grouping Logic: Student + Category
  const processGroupedData = (rows: RawParticipation[]) => {
    const map = new Map<string, GroupedParticipant>()

    rows.forEach(row => {
        // Key is combination of StudentID and Category (e.g., "123-ON_STAGE")
        const key = `${row.students.id}-${row.events.category}`

        if (!map.has(key)) {
            map.set(key, {
                studentId: row.students.id,
                student: row.students,
                category: row.events.category,
                events: [],
                status: row.status
            })
        }
        map.get(key)?.events.push(row.events)
    })

    setGroupedData(Array.from(map.values()))
  }

  useEffect(() => {
    loadData()
  }, [])

  // --- FILTERING ---
  const filteredData = useMemo(() => {
    return groupedData.filter(item => {
        const matchesSearch =
            item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.student.chest_no?.toLowerCase().includes(searchQuery.toLowerCase())

        return matchesSearch
    })
  }, [groupedData, searchQuery])

  // Helper to convert Image URL to Base64
  const getDataUri = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = "anonymous"
        image.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = image.naturalWidth
            canvas.height = image.naturalHeight
            canvas.getContext('2d')?.drawImage(image, 0, 0)
            resolve(canvas.toDataURL('image/png'))
        }
        image.onerror = (error) => reject(error)
        image.src = url
    })
  }

  // --- PDF GENERATOR LOGIC ---
  const generatePDF = async (itemsToPrint: GroupedParticipant[]) => {
    if (itemsToPrint.length === 0) return alert("No data to print")

    setIsGeneratingPdf(true)

    try {
        const doc = new jsPDF()
        let headerBase64 = ""

        // Fetch Header Image only if available and active
        if (headerImageUrl && headerImageActive) {
            headerBase64 = await getDataUri(headerImageUrl)
        }

        let isFirstPage = true

        itemsToPrint.forEach((item, index) => {
            if (!isFirstPage) doc.addPage()
            isFirstPage = false

            // 1. Header Banner Image or High-Contrast Clean Text Header
            if (headerBase64) {
                // Render header image at the top
                doc.addImage(headerBase64, "PNG", 0, 0, 210, 32)
            } else {
                // Crisp, bold, high-contrast header text (no heavy ink-wasting solid blocks)
                doc.setFont("helvetica", "bold")
                doc.setFontSize(22)
                doc.setTextColor(0, 0, 0)
                doc.text("PMSA ARTS FEST 2026-27", 105, 18, { align: "center" })

                // Strong divider line
                doc.setDrawColor(0, 0, 0)
                doc.setLineWidth(0.8)
                doc.line(14, 23, 196, 23)
            }

            // 2. Title & Category Section
            const startY = headerBase64 ? 38 : 31

            doc.setFont("helvetica", "bold")
            doc.setFontSize(16)
            doc.setTextColor(0, 0, 0)
            doc.text("ADMIT CARD", 105, startY, { align: "center" })

            doc.setFontSize(13)
            doc.text(`CATEGORY: ${item.category.toUpperCase()}`, 105, startY + 7, { align: "center" })

            // 3. Student Details Box (High visibility for 4-in-1 printing)
            const boxY = startY + 11
            doc.setDrawColor(0, 0, 0)
            doc.setLineWidth(0.5)
            doc.rect(14, boxY, 182, 34)

            // Left: Name, Section, Class in large bold text
            doc.setTextColor(0, 0, 0)

            // Name
            doc.setFont("helvetica", "bold")
            doc.setFontSize(11)
            doc.text("NAME:", 18, boxY + 9)
            doc.setFontSize(14)
            doc.text(item.student.name.toUpperCase(), 38, boxY + 9)

            // Section
            doc.setFontSize(11)
            doc.text("SECTION:", 18, boxY + 19)
            doc.setFontSize(13)
            doc.text(item.student.section || "-", 42, boxY + 19)

            // Class
            doc.setFontSize(11)
            doc.text("CLASS:", 18, boxY + 28)
            doc.setFontSize(13)
            doc.text(item.student.class_grade || "-", 38, boxY + 28)

            // Right: Prominent Chest No Badge
            doc.setFillColor(245, 245, 245)
            doc.rect(136, boxY + 4, 56, 26, "FD")
            doc.setFontSize(10)
            doc.setFont("helvetica", "bold")
            doc.text("CHEST NO", 164, boxY + 11, { align: "center" })
            doc.setFontSize(18)
            doc.setFont("helvetica", "bold")
            doc.text(item.student.chest_no || "N/A", 164, boxY + 23, { align: "center" })

            // 4. Events Table (Crisp 3-column table with large text & thick borders)
            const tableStartY = boxY + 38
            // @ts-ignore
            autoTable(doc, {
                startY: tableStartY,
                head: [["#", "EVENT CODE", "PROGRAMME NAME"]],
                body: item.events.map((e, i) => [
                    i + 1,
                    e.event_code || "-",
                    e.name.toUpperCase()
                ]),
                theme: 'grid',
                headStyles: {
                    fillColor: [20, 20, 20],
                    textColor: [255, 255, 255],
                    fontSize: 12,
                    fontStyle: 'bold',
                    halign: 'center',
                    cellPadding: 4
                },
                bodyStyles: {
                    fontSize: 12,
                    fontStyle: 'bold',
                    textColor: [0, 0, 0],
                    cellPadding: 4.5,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.35
                },
                columnStyles: {
                    0: { cellWidth: 16, halign: 'center' },
                    1: { cellWidth: 40, halign: 'center' },
                    2: { cellWidth: 'auto', halign: 'left' }
                },
                margin: { left: 14, right: 14 },
                alternateRowStyles: {
                    fillColor: [250, 250, 250]
                }
            })

            // 5. Signatures Section
            // @ts-ignore
            const finalY = doc.lastAutoTable?.finalY || (tableStartY + 30)
            const sigY = Math.min(finalY + 30, 265)

            doc.setDrawColor(0, 0, 0)
            doc.setLineWidth(0.4)
            doc.line(18, sigY - 6, 68, sigY - 6)
            doc.line(142, sigY - 6, 192, sigY - 6)

            doc.setFontSize(10)
            doc.setFont("helvetica", "bold")
            doc.setTextColor(0, 0, 0)
            doc.text("Candidate's Signature", 18, sigY)
            doc.text("General Convener", 192, sigY, { align: "right" })

            // 6. Minimal Footer
            const pageHeight = doc.internal.pageSize.height
            const now = new Date().toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            })

            doc.setFontSize(9)
            doc.setTextColor(80, 80, 80)
            doc.setFont("helvetica", "normal")
            doc.text(`Printed: ${now} | Page ${index + 1} of ${itemsToPrint.length}`, 105, pageHeight - 8, { align: "center" })
        })

        doc.save(`AdmitCards_${new Date().toISOString().slice(0,10)}.pdf`)
    } catch (e) {
        console.error("PDF Generation failed", e)
        alert("Failed to generate PDF. Please try again.")
    } finally {
        setIsGeneratingPdf(false)
    }
  }

  // Bulk Print Handler
  const handleBulkPrint = (category: string) => {
    const listToPrint = filteredData.filter(item => item.category === category)
    if (listToPrint.length === 0) {
        alert(`No participants found for ${category} in the current view.`)
        return
    }
    generatePDF(listToPrint)
  }

  if (loading) return <div className="h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 w-full max-w-full">

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Team Registrations</h2>
            <p className="text-muted-foreground text-sm">Manage entries and download admit cards.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2" disabled={isGeneratingPdf}>
                        {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        {isGeneratingPdf ? "Generating..." : "Print All"}
                        <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkPrint('ON STAGE')}>
                        On Stage Participants
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkPrint('OFF STAGE')}>
                        Off Stage Participants
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* Search & Info */}
      <Card className="bg-muted/10 border-none shadow-sm">
        <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative w-full md:w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search student or chest no..."
                        className="pl-9 bg-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex-1" />

                <div className="text-xs text-muted-foreground font-mono bg-white px-2 py-1 rounded border">
                    Showing: {filteredData.length} records (Grouped by Category)
                </div>
            </div>
        </CardContent>
      </Card>

      <Card className="glass-card shadow-sm border-border/50 bg-card/80 w-full overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4 px-4 sm:px-6">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Participants List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-4 px-4">
              <AlertCircle className="w-12 h-12 opacity-20" />
              <p>No participants found.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
                <Table className="min-w-[800px]">
                <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[250px] pl-6">Student Details</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Events Count</TableHead>
                    <TableHead className="text-right pr-6">Admit Card</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredData.map((row) => (
                    <TableRow key={`${row.studentId}-${row.category}`} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-6">
                            <div className="flex flex-col">
                                <span className="font-semibold text-foreground">{row.student.name}</span>
                                <span className="text-xs text-muted-foreground font-mono mt-0.5">
                                    {row.student.chest_no ? `#${row.student.chest_no}` : 'No Chest No'}
                                    {row.student.class_grade && ` • Class ${row.student.class_grade}`}
                                </span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary" className="font-normal text-xs bg-muted text-muted-foreground border-border/50">
                                {row.student.section}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={cn("text-[10px]",
                                row.category === 'ON STAGE' ? "border-orange-200 text-orange-700 bg-orange-50" : "border-blue-200 text-blue-700 bg-blue-50"
                            )}>
                                {row.category}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <span className="text-sm font-medium">{row.events.length} Events</span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2 text-xs"
                                onClick={() => generatePDF([row])}
                                disabled={isGeneratingPdf}
                            >
                                <FileDown className="w-3 h-3" /> Download
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}