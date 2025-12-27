"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, FileDown, Trophy, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Props {
    studentId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function StudentDetailsModal({ studentId, open, onOpenChange }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!studentId || !open) return
    const currentId: string = studentId

    async function fetchDetails() {
        setLoading(true)

        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('*, teams(name, color_hex)')
            .eq('id', currentId)
            .single()

        if (studentError || !student) {
            setLoading(false)
            return
        }

        const { data: parts } = await supabase
            .from('participations')
            .select(`
                points_earned, result_position, performance_grade,
                events ( name, category, grade_type )
            `)
            .eq('student_id', currentId)
            .gt('points_earned', 0)

        setData({ student, parts: parts || [] })
        setLoading(false)
    }

    fetchDetails()
  }, [studentId, open])

  const generatePDF = () => {
     if(!data) return
     const doc = new jsPDF()

     doc.setFontSize(20)
     doc.text(`Performance Report: ${data.student.name}`, 14, 20)
     doc.setFontSize(10)
     doc.text(`Chest No: ${data.student.chest_no} | Team: ${data.student.teams.name}`, 14, 30)
     const total = data.parts.reduce((s:number, p:any) => s + p.points_earned, 0)
     doc.text(`Total Career Points: ${total}`, 14, 36)

     const body = data.parts.map((p:any) => [
         p.events.name,
         p.events.category,
         p.result_position,
         p.performance_grade || '-',
         p.points_earned
     ])

     autoTable(doc, {
         startY: 40,
         head: [['Event', 'Category', 'Pos', 'Grade', 'Pts']],
         body: body,
         theme: 'grid',
         headStyles: { fillColor: [41, 128, 185] }
     })

     doc.save(`${data.student.name}_performance.pdf`)
  }

  if (!studentId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* - [&>button]:text-white forces the default shadcn close button (which is a direct child) to be white
         - [&>button]:top-4 [&>button]:right-4 adjusts position if needed
      */}
      <DialogContent className="max-w-[700px] max-h-[85vh] flex flex-col bg-white p-0 overflow-hidden [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:z-50">

        {/* Accessible Title (Visually hidden if preferred, but here integrated) */}
        <DialogHeader className="sr-only">
             <DialogTitle>{data?.student?.name || "Student Details"}</DialogTitle>
             <DialogDescription>Performance history and points breakdown.</DialogDescription>
        </DialogHeader>

        {/* Header Section */}
        <div className="bg-slate-950 text-white p-6 shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>

            {loading ? (
                <div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin" /></div>
            ) : data && (
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                             <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20 border-0">
                                {data.student.section}
                             </Badge>
                             <span className="font-mono text-xs opacity-60">#{data.student.chest_no}</span>
                        </div>
                        {/* Visible Title Area */}
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <User className="w-6 h-6 text-primary-foreground/80" />
                            {data.student.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.student.teams.color_hex }}></div>
                             <p className="text-sm opacity-80" style={{ color: data.student.teams.color_hex }}>{data.student.teams.name}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black">{data.parts.reduce((s:number, p:any) => s + p.points_earned, 0)}</div>
                        <div className="text-[10px] uppercase tracking-wider opacity-60">Total Points</div>
                    </div>
                </div>
            )}
        </div>

        {/* Action Bar */}
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-600" /> Event History
            </h3>
            <Button variant="outline" size="sm" onClick={generatePDF} disabled={loading} className="h-8">
                <FileDown className="w-3 h-3 mr-2" /> Download Report
            </Button>
        </div>

        <ScrollArea className="flex-1 p-0">
             {loading ? <div className="h-40" /> : data && (
                <Table>
                    <TableHeader className="bg-white sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="pl-6">Event Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-center">Position</TableHead>
                            <TableHead className="text-center">Grade</TableHead>
                            <TableHead className="text-right pr-6">Pts</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.parts.map((p:any, i:number) => (
                            <TableRow key={i} className="hover:bg-slate-50">
                                <TableCell className="pl-6 font-medium">{p.events.name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{p.events.category}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="font-normal text-xs">
                                        {p.result_position}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs">{p.performance_grade || '-'}</TableCell>
                                <TableCell className="text-right pr-6 font-bold text-slate-700">{p.points_earned}</TableCell>
                            </TableRow>
                        ))}
                        {data.parts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                    No winnings recorded yet.
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