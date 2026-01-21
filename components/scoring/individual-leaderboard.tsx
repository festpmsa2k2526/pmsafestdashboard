"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, User, Medal, ChevronRight } from "lucide-react"
import { StudentDetailsModal } from "./student-details-modal"

interface StudentScore {
  id: string
  name: string
  chest_no: string | null
  section: string
  team: { name: string; color_hex: string }
  total: number
}

export function IndividualLeaderboard({ refreshTrigger }: { refreshTrigger: number }) {
  const [rankings, setRankings] = useState<Record<string, StudentScore[]>>({
    Senior: [],
    Junior: [],
    "Sub-Junior": [],
    Foundation: [],
    General: []
  })
  const [loading, setLoading] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true)
      const { data } = await supabase
        .from('participations')
        .select(`
          points_earned,
          student_id,
          events ( grade_type, applicable_section ),
          students ( id, name, chest_no, section, team:teams(name, color_hex) )
        `)
        .not('student_id', 'is', null)
        .gt('points_earned', 0)

      if (!data) return

      const studentMap = new Map<string, StudentScore>()

      data.forEach((p: any) => {
        // FILTER: Only exclude 'C' Grade (Group Items).
        // We DO NOT exclude 'General' events anymore, as they count for individual scores.
        if (p.events?.grade_type === 'C') return

        const sid = p.student_id
        if (!studentMap.has(sid)) {
          studentMap.set(sid, {
            id: sid,
            name: p.students.name,
            chest_no: p.students.chest_no,
            section: p.students.section,
            team: p.students.team,
            total: 0
          })
        }

        const student = studentMap.get(sid)!
        student.total += p.points_earned
      })

      const allStudents = Array.from(studentMap.values())

      // Helper to sort and slice
      const getTop = (sec: string) =>
        allStudents.filter(s => s.section === sec).sort((a, b) => b.total - a.total).slice(0, 10)

      setRankings({
        Senior: getTop('Senior'),
        Junior: getTop('Junior'),
        "Sub-Junior": getTop('Sub-Junior'),
        Foundation: getTop('Foundation'),
        General: getTop('General')
      })

      setLoading(false)
    }

    fetchRankings()
  }, [refreshTrigger])

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-4 pb-10">
      <Tabs defaultValue="Senior" className="w-full">
        <TabsList className="w-full flex h-10 bg-slate-100 p-1 mb-4 overflow-x-auto">
          {['Senior', 'Junior', 'Sub-Junior'].map(sec => (
             <TabsTrigger key={sec} value={sec} className="flex-1 text-[10px] sm:text-xs font-bold uppercase">{sec}</TabsTrigger>
          ))}
        </TabsList>

        {['Senior', 'Junior', 'Sub-Junior', 'Foundation', 'General'].map(section => (
          <TabsContent key={section} value={section} className="m-0">
            <div className="space-y-2">
              {rankings[section]?.map((student, idx) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className="bg-white border border-slate-100 p-3 rounded-xl hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 font-bold text-xs text-slate-400 group-hover:text-primary transition-colors">
                      {idx < 3 ? <Medal className={`w-4 h-4 ${idx===0?'text-yellow-500':idx===1?'text-slate-400':'text-orange-600'}`} /> : idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-700">{student.name}</div>
                      <div className="flex items-center gap-2 text-[10px] mt-0.5">
                        <span className="font-mono text-muted-foreground bg-slate-50 px-1 rounded">#{student.chest_no}</span>
                        <span style={{ color: student.team.color_hex }} className="font-bold">{student.team.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-black text-primary leading-none">{student.total}</div>
                      <div className="text-[8px] uppercase font-bold text-slate-300 tracking-wider">Points</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
              {rankings[section]?.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-xs italic">No entries for {section} yet.</div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <StudentDetailsModal
        studentId={selectedStudentId}
        open={!!selectedStudentId}
        onOpenChange={(open) => !open && setSelectedStudentId(null)}
      />
    </div>
  )
}