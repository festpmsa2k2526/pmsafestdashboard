"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, Star, Loader2, Sparkles } from "lucide-react"

interface Winner {
  name: string
  team: string
  total: number
  section: string
  type: 'KALA' | 'SARGGA'
}

export function ChampionsBoard({ refreshTrigger }: { refreshTrigger: number }) {
  const [champions, setChampions] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function calculateChampions() {
      setLoading(true)

      // Fetch all winning participations with event details
      const { data } = await supabase.from('participations')
        .select(`
          points_earned, student_id, result_position, performance_grade,
          events ( category, grade_type, applicable_section ),
          students ( id, name, section, team:teams(name) )
        `)
        .not('student_id', 'is', null)
        .gt('points_earned', 0)

      if (!data) { setLoading(false); return }

      // 1. Group Data by Student
      const students: Record<string, any> = {}

      data.forEach((p: any) => {
         // Skip General events for individual championships
         if (p.events?.applicable_section?.includes('General')) return

         const sid = p.student_id
         if (!students[sid]) {
             students[sid] = {
                 id: sid,
                 name: p.students.name,
                 team: p.students.team.name,
                 section: p.students.section,
                 total: 0,
                 // Criteria for Kala Prathibha
                 has_on_stage_A_win: false,
                 has_off_stage_A_win: false,
                 a_grade_count: 0
             }
         }

         const s = students[sid]
         s.total += p.points_earned

         // Kala Prathibha Check:
         // 1. Event Grade A
         // 2. Position FIRST
         // 3. Performance Grade A
         if (p.events.grade_type === 'A' && p.result_position === 'FIRST' && p.performance_grade === 'A') {
             s.a_grade_count++
             if (p.events.category === 'ON STAGE') s.has_on_stage_A_win = true
             if (p.events.category === 'OFF STAGE') s.has_off_stage_A_win = true
         }
      })

      const results: Winner[] = []

      // 2. Determine Winners per Section
      const sections = ['Senior', 'Junior', 'Sub-Junior']

      sections.forEach(sectionName => {
          const sectionStudents = Object.values(students).filter((s:any) => s.section === sectionName)

          // --- KALA PRATHIBHA LOGIC ---
          // Candidates must have A-Grade First in BOTH On & Off Stage A-Grade Events
          let kalaCandidates = sectionStudents.filter((s:any) => s.has_on_stage_A_win && s.has_off_stage_A_win)

          let kalaWinner: any = null
          if (kalaCandidates.length > 0) {
              // Tie Breaker 1: Total Points
              kalaCandidates.sort((a:any, b:any) => {
                  if (b.total !== a.total) return b.total - a.total
                  // Tie Breaker 2: Count of A Category Wins
                  return b.a_grade_count - a.a_grade_count
              })
              kalaWinner = kalaCandidates[0]
              results.push({
                  name: kalaWinner.name,
                  team: kalaWinner.team,
                  total: kalaWinner.total,
                  section: sectionName,
                  type: 'KALA'
              })
          }

          // --- SARGGA PRATHIBHA LOGIC ---
          // Top Scorer (Excluding the Kala Prathibha winner)
          // Note: If no Kala Prathibha, Sargga is just top scorer
          const sarggaCandidates = sectionStudents.filter((s:any) => s.id !== kalaWinner?.id)
          sarggaCandidates.sort((a:any, b:any) => b.total - a.total)

          if (sarggaCandidates.length > 0) {
              const sarggaWinner = sarggaCandidates[0]
               results.push({
                   name: sarggaWinner.name,
                   team: sarggaWinner.team,
                   total: sarggaWinner.total,
                   section: sectionName,
                   type: 'SARGGA'
               })
          }
      })

      setChampions(results)
      setLoading(false)
    }

    calculateChampions()
  }, [refreshTrigger])

  if (loading) return <div className="h-24 flex items-center justify-center text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Calculating Champions...</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
        {['Senior', 'Junior', 'Sub-Junior'].map(section => {
            const kala = champions.find(c => c.section === section && c.type === 'KALA')
            const sargga = champions.find(c => c.section === section && c.type === 'SARGGA')

            return (
                <Card key={section} className="bg-linear-to-br from-slate-900 to-slate-800 text-white border-none shadow-lg overflow-hidden relative">
                    <CardHeader className="pb-2 z-10 relative pt-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider opacity-70 flex justify-between">
                            {section}
                            {kala && <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse"/>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 z-10 relative pb-4">
                        {/* KALA PRATHIBHA */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-linear-to-b from-yellow-300 to-yellow-600 flex items-center justify-center text-white border border-yellow-200 shadow-md">
                                <Crown className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[9px] text-yellow-400 font-bold uppercase tracking-widest">Kala Prathibha</div>
                                <div className="font-bold text-base leading-none truncate w-40">{kala ? kala.name : 'Not Yet Decided'}</div>
                                <div className="text-[10px] opacity-60">{kala ? `${kala.total} pts • ${kala.team}` : 'Pending results'}</div>
                            </div>
                        </div>
                        {/* SARGGA PRATHIBHA */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-linear-to-b from-blue-300 to-blue-600 flex items-center justify-center text-white border border-blue-200 shadow-md">
                                <Star className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[9px] text-blue-300 font-bold uppercase tracking-widest">Sargga Prathibha</div>
                                <div className="font-bold text-base leading-none truncate w-40">{sargga ? sargga.name : 'Not Yet Decided'}</div>
                                <div className="text-[10px] opacity-60">{sargga ? `${sargga.total} pts • ${sargga.team}` : 'Pending results'}</div>
                            </div>
                        </div>
                    </CardContent>
                    {/* Decor */}
                    <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
                </Card>
            )
        })}
    </div>
  )
}