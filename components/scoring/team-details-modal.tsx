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
import { Loader2, FileDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Props {
    teamId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function TeamDetailsModal({ teamId, open, onOpenChange }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // 1. Immediate return if conditions aren't met
    if (!teamId || !open) return

    async function fetchDetails() {
        // 2. Redundant check inside async to satisfy TypeScript narrowing
        if (!teamId) return

        setLoading(true)
        // 1. Team Info
        const { data: team } = await supabase.from('teams').select('*').eq('id', teamId).single()

        // 2. Participations (Winners)
        const { data: parts } = await supabase.from('participations')
            .select(`
                points_earned, result_position, performance_grade,
                events ( name, category, applicable_section ),
                students ( name )
            `)
            .eq('team_id', teamId)
            .gt('points_earned', 0)

        setData({ team, parts })
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
         p.result_position,
         p.performance_grade || '-',
         p.points_earned
     ])

     autoTable(doc, {
         startY: 35,
         head: [['Event', 'Winner', 'Pos', 'Grade', 'Pts']],
         body: body
     })
     doc.save(`${data.team.name}_report.pdf`)
  }

  // Early return if no teamId, prevents rendering with null data
  if (!teamId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] h-[80vh] flex flex-col bg-white">
        <DialogHeader>
            <DialogTitle>{data?.team?.name || 'Loading...'} Details</DialogTitle>
            <DialogDescription>Score breakdown by event.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end pb-2">
             <Button variant="outline" size="sm" onClick={generatePDF} disabled={loading}>
                 <FileDown className="w-4 h-4 mr-2" /> Download Report
             </Button>
        </div>

        <ScrollArea className="flex-1 border rounded-md p-4">
            {loading ? <div className="flex justify-center h-full items-center"><Loader2 className="animate-spin text-primary"/></div> : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Event</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead>Pos</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead className="text-right">Pts</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data?.parts.map((p:any, i:number) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{p.events?.name}</TableCell>
                                <TableCell>{p.students?.name || <Badge variant="secondary">Team</Badge>}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {p.events?.applicable_section?.[0]}
                                </TableCell>
                                <TableCell>{p.result_position}</TableCell>
                                <TableCell>{p.performance_grade || '-'}</TableCell>
                                <TableCell className="text-right font-bold">{p.points_earned}</TableCell>
                            </TableRow>
                        ))}
                        {data?.parts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No scores recorded yet.</TableCell>
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