"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, FileDown, Trophy, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Props {
    teamId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

// Helper to convert Hex color to RGB array for jsPDF
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [15, 23, 42] // Default slate-900
}

export function TeamDetailsModal({ teamId, open, onOpenChange }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!teamId || !open) return
    const currentId = teamId

    async function fetchDetails() {
        setLoading(true)

        // 1. Team Info
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('*')
            .eq('id', currentId)
            .single()

        if (teamError || !team) {
            setLoading(false)
            return
        }

        // 2. Participations (Winners)
        const { data: parts } = await supabase
            .from('participations')
            .select(`
                points_earned, result_position, performance_grade,
                events ( name, category, applicable_section ),
                students ( name, chest_no )
            `)
            .eq('team_id', currentId)
            .gt('points_earned', 0)

        setData({ team, parts: parts || [] })
        setLoading(false)
    }
    fetchDetails()
  }, [teamId, open])

  const generatePDF = () => {
     if(!data) return
     const doc = new jsPDF()

     doc.setFontSize(20)
     doc.text(`${data.team.name} - Score Report`, 14, 20)

     const total = data.parts.reduce((s:number, p:any) => s + p.points_earned, 0)
     doc.setFontSize(12)
     doc.text(`Total Points: ${total}`, 14, 30)

     const body = data.parts.map((p:any) => [
         p.events.name,
         p.students?.name || 'Team Event',
         p.events.applicable_section?.[0] || '-',
         p.result_position,
         p.performance_grade || '-',
         p.points_earned
     ])

     // Convert the team hex color to RGB array for the fill color
     const headerColor = hexToRgb(data.team.color_hex || '#0f172a')

     autoTable(doc, {
         startY: 35,
         head: [['Event', 'Winner', 'Section', 'Pos', 'Grade', 'Pts']],
         body: body,
         theme: 'grid',
         headStyles: { fillColor: headerColor }
     })
     doc.save(`${data.team.name}_report.pdf`)
  }

  if (!teamId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[85vh] flex flex-col bg-white p-0 overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:z-50">

        {/* Accessible Header (Visually Hidden) */}
        <DialogHeader className="sr-only">
            <DialogTitle>{data?.team?.name || "Team Details"}</DialogTitle>
            <DialogDescription>Detailed score breakdown.</DialogDescription>
        </DialogHeader>

        {/* Custom Header Section */}
        <div className="bg-slate-950 text-white p-6 shrink-0 relative overflow-hidden">
             {/* Dynamic background glow based on team color */}
             {data?.team?.color_hex && (
                <div
                    className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-20 -mt-20 blur-3xl opacity-20"
                    style={{ backgroundColor: data.team.color_hex }}
                ></div>
             )}

             {loading ? (
                <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin" /></div>
             ) : data && (
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 mb-2 opacity-80">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-mono uppercase tracking-widest">House Performance</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                             <span
                                className="w-4 h-4 rounded-full shadow-[0_0_10px_currentColor]"
                                style={{ backgroundColor: data.team.color_hex, color: data.team.color_hex }}
                             />
                             {data.team.name}
                        </h2>
                    </div>
                    <div className="text-right">
                        <div className="text-5xl font-black leading-none tracking-tighter" style={{ textShadow: `0 0 30px ${data.team.color_hex}40` }}>
                            {data.parts.reduce((s:number, p:any) => s + p.points_earned, 0)}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider opacity-60 mt-1">Total Points</div>
                    </div>
                </div>
             )}
        </div>

        {/* Action Bar */}
        <div className="p-3 px-6 border-b bg-slate-50 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Trophy className="w-4 h-4 text-yellow-600" />
                <span>Score Breakdown</span>
             </div>
             <Button variant="outline" size="sm" onClick={generatePDF} disabled={loading} className="h-8 bg-white hover:bg-slate-100">
                 <FileDown className="w-3.5 h-3.5 mr-2" /> Download Report
             </Button>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1 p-0">
            {loading ? <div className="h-40" /> : data && (
                <Table>
                    <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                        <TableRow className="border-border/50">
                            <TableHead className="pl-6 w-[35%]">Event Name</TableHead>
                            <TableHead className="w-[25%]">Participant</TableHead>
                            <TableHead className="w-[15%]">Section</TableHead>
                            <TableHead className="text-center w-[10%]">Pos</TableHead>
                            <TableHead className="text-center w-[10%]">Grade</TableHead>
                            <TableHead className="text-right pr-6 w-[10%]">Pts</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.parts.map((p:any, i:number) => (
                            <TableRow key={i} className="hover:bg-slate-50 border-border/50">
                                <TableCell className="pl-6 font-medium text-slate-700">
                                    {p.events?.name}
                                </TableCell>
                                <TableCell>
                                    {p.students?.name ? (
                                        <div className="flex flex-col">
                                            <span className="text-sm">{p.students.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">#{p.students.chest_no}</span>
                                        </div>
                                    ) : (
                                        <Badge variant="secondary" className="text-[10px] font-normal bg-slate-100 text-slate-600 hover:bg-slate-200">
                                            Team Event
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {p.events?.applicable_section?.[0]}
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="font-bold text-xs text-slate-700">{p.result_position}</span>
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs">
                                    {p.performance_grade || <span className="text-slate-300">-</span>}
                                </TableCell>
                                <TableCell className="text-right pr-6 font-bold text-slate-900 bg-slate-50/50">
                                    {p.points_earned}
                                </TableCell>
                            </TableRow>
                        ))}
                        {data.parts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    No scores recorded for {data.team.name} yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}