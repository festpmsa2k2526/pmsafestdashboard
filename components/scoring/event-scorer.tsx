"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Trophy, Save, User, Users, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

// --- TYPES ---
interface Event {
  id: string
  name: string
  event_code: string
  grade_type: 'A' | 'B' | 'C'
  category: string
  applicable_section: string[]
}

interface Team { id: string; name: string; color_hex: string }

interface Participant {
  id: string
  student_id: string | null
  student?: { id: string; name: string; chest_no: string } | null
  team: { id: string; name: string; color_hex: string }
  result_position: 'FIRST' | 'SECOND' | 'THIRD' | null
  performance_grade: 'A' | 'B' | 'C' | 'NONE' | null
}

const PERF_POINTS = { 'A': 5, 'B': 3, 'C': 1, 'NONE': 0 }

interface EventScorerProps {
  section: string
  category: string
  onScoreSaved?: () => void
}

export function EventScorer({ section, category, onScoreSaved }: EventScorerProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL')

  // Data
  const [events, setEvents] = useState<Event[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [participants, setParticipants] = useState<Participant[]>([])
  const [pointsTable, setPointsTable] = useState<any>({})

  // Winners State (Map of ID -> Perf Grade)
  // We use a Map to store "ID" => "PerformanceGrade" for selected winners
  const [winners, setWinners] = useState<{
    FIRST: Map<string, string>,
    SECOND: Map<string, string>,
    THIRD: Map<string, string>
  }>({
    FIRST: new Map(),
    SECOND: new Map(),
    THIRD: new Map()
  })

  const supabase = createClient()

  // 1. Load Initial Data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [evtRes, teamRes, gradeRes] = await Promise.all([
        supabase.from('events').select('*').eq('category', category).contains('applicable_section', [section]).order('name'),
        supabase.from('teams').select('*').order('name'),
        supabase.from('grade_settings').select('*')
      ])

      if (evtRes.data) setEvents(evtRes.data as any)
      if (teamRes.data) setTeams(teamRes.data as any)

      if (gradeRes.data) {
        const pt: any = {}
        gradeRes.data.forEach((g: any) => {
           pt[g.grade_type] = { FIRST: g.first_place, SECOND: g.second_place, THIRD: g.third_place }
        })
        setPointsTable(pt)
      }
      setLoading(false)
    }
    loadData()
  }, [section, category])

  // 2. Load Participants when Event Selected
  useEffect(() => {
    if (!selectedEventId) {
      setParticipants([])
      setWinners({ FIRST: new Map(), SECOND: new Map(), THIRD: new Map() })
      return
    }

    const event = events.find(e => e.id === selectedEventId)
    // AUTO SWITCH MODE based on Grade Type
    // Grade C = Team Event. Grade A/B = Individual.
    setMode(event?.grade_type === 'C' ? 'TEAM' : 'INDIVIDUAL')

    async function loadParts() {
      setLoading(true)
      const { data } = await supabase
        .from('participations')
        .select(`
            id, result_position, performance_grade, student_id,
            students ( id, name, chest_no ),
            teams ( id, name, color_hex )
        `)
        .eq('event_id', selectedEventId)

      if (data) {
        const mapped = data.map((p: any) => ({
          id: p.id,
          student_id: p.student_id,
          result_position: p.result_position,
          performance_grade: p.performance_grade,
          student: p.students,
          team: p.teams
        }))
        setParticipants(mapped)

        // Populate existing winners
        const newWinners = { FIRST: new Map(), SECOND: new Map(), THIRD: new Map() }

        mapped.forEach((p: any) => {
            if (p.result_position) {
                // For Team mode, we use TeamID as key. For Individual, ParticipationID.
                const key = p.student_id ? p.id : p.team.id
                // @ts-ignore
                newWinners[p.result_position].set(key, p.performance_grade || 'NONE')
            }
        })
        // @ts-ignore
        setWinners(newWinners)
      }
      setLoading(false)
    }
    loadParts()
  }, [selectedEventId])

  // 3. Toggle Winner
  const toggleWinner = (pos: 'FIRST'|'SECOND'|'THIRD', id: string) => {
      setWinners(prev => {
          const next = { ...prev }
          const currentMap = new Map(next[pos]) // Clone map

          // Check if already in another position
          const inFirst = prev.FIRST.has(id) && pos !== 'FIRST'
          const inSecond = prev.SECOND.has(id) && pos !== 'SECOND'
          const inThird = prev.THIRD.has(id) && pos !== 'THIRD'

          if (inFirst || inSecond || inThird) {
              alert("Participant already has a rank.")
              return prev
          }

          if (currentMap.has(id)) {
              currentMap.delete(id) // Toggle OFF
          } else {
              currentMap.set(id, 'NONE') // Toggle ON (Default Perf Grade: None)
          }

          next[pos] = currentMap
          return next
      })
  }

  // 4. Update Performance Grade
  const updatePerfGrade = (pos: 'FIRST'|'SECOND'|'THIRD', id: string, grade: string) => {
      setWinners(prev => {
          const next = { ...prev }
          const currentMap = new Map(next[pos])
          if (currentMap.has(id)) {
              currentMap.set(id, grade)
          }
          next[pos] = currentMap
          return next
      })
  }

  // 5. Save
  const handleSave = async () => {
    if (!selectedEventId) return
    setSaving(true)

    const event = events.find(e => e.id === selectedEventId)
    if (!event) return

    // Base Points from DB
    // @ts-ignore
    const basePoints = pointsTable[event.grade_type || 'A']

    try {
       if (mode === 'INDIVIDUAL') {
          // --- INDIVIDUAL SAVING ---
          const updates = participants.filter(p => p.student).map(p => {
              let pos: any = null
              let perf: any = null
              let pts = 0

              if (winners.FIRST.has(p.id)) {
                  pos = 'FIRST'; perf = winners.FIRST.get(p.id);
                  // @ts-ignore
                  pts = basePoints.FIRST + PERF_POINTS[perf || 'NONE']
              }
              else if (winners.SECOND.has(p.id)) {
                  pos = 'SECOND'; perf = winners.SECOND.get(p.id);
                  // @ts-ignore
                  pts = basePoints.SECOND + PERF_POINTS[perf || 'NONE']
              }
              else if (winners.THIRD.has(p.id)) {
                  pos = 'THIRD'; perf = winners.THIRD.get(p.id);
                  // @ts-ignore
                  pts = basePoints.THIRD + PERF_POINTS[perf || 'NONE']
              }

              return {
                  id: p.id,
                  event_id: selectedEventId,
                  team_id: p.team.id,
                  student_id: p.student_id,
                  result_position: pos,
                  performance_grade: perf === 'NONE' ? null : perf,
                  points_earned: pts,
                  status: pos ? 'winner' : 'registered'
              }
          })
          if (updates.length > 0) {
              const { error } = await (supabase.from('participations') as any).upsert(updates)
              if (error) throw error
          }

       } else {
          // --- TEAM SAVING ---
          // Clear old team results
          await supabase.from('participations').delete().eq('event_id', selectedEventId).is('student_id', null)

          const newResults: any[] = []
          const process = (posMap: Map<string, string>, posName: string, basePts: number) => {
              posMap.forEach((perf, teamId) => {
                  // @ts-ignore
                  const total = basePts + PERF_POINTS[perf || 'NONE']
                  newResults.push({
                      event_id: selectedEventId,
                      team_id: teamId,
                      student_id: null,
                      result_position: posName,
                      performance_grade: perf === 'NONE' ? null : perf,
                      points_earned: total,
                      status: 'winner'
                  })
              })
          }
          process(winners.FIRST, 'FIRST', basePoints.FIRST)
          process(winners.SECOND, 'SECOND', basePoints.SECOND)
          process(winners.THIRD, 'THIRD', basePoints.THIRD)

          if (newResults.length > 0) {
              const { error } = await (supabase.from('participations') as any).insert(newResults)
              if (error) throw error
          }
       }

       if (onScoreSaved) onScoreSaved()

    } catch (err: any) {

        alert("Save failed: " + err.message)
    } finally {
        setSaving(false)
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
        {/* EVENT SELECTOR */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-muted/20 p-4 rounded-lg border border-border/50 shrink-0">
            <div className="w-full md:w-1/2 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Event</label>
                <div onClick={(e) => e.stopPropagation()}>
                    <Select value={selectedEventId} onValueChange={(v) => { setSelectedEventId(v) }}>
                        <SelectTrigger className="bg-background shadow-sm h-10"><SelectValue placeholder="-- Choose Event --" /></SelectTrigger>
                        <SelectContent className="bg-white">
                            {events.map(e => (
                                <SelectItem key={e.id} value={e.id}>
                                    {e.name} <span className="text-xs text-muted-foreground">({e.event_code} • Grade {e.grade_type})</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Mode Indicator */}
            {selectedEventId && (
                <Badge variant={mode === 'TEAM' ? 'destructive' : 'default'} className="h-8 px-3">
                    {mode === 'TEAM' ? <><Users className="w-3 h-3 mr-2"/> Team Event (Grade C)</> : <><User className="w-3 h-3 mr-2"/> Individual Event</>}
                </Badge>
            )}
        </div>

        {/* SCORING GRIDS */}
        {selectedEventId && (
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-20 md:pb-4">
                <div className="grid md:grid-cols-3 gap-4 pb-4">
                    {['FIRST', 'SECOND', 'THIRD'].map(pos => {
                        // @ts-ignore
                        const basePts = pointsTable[events.find(e => e.id === selectedEventId)?.grade_type || 'A']?.[pos] || 0
                        // @ts-ignore
                        const selectedMap = winners[pos] as Map<string, string>

                        const style = {
                            FIRST: { border: 'border-yellow-400', icon: 'text-yellow-600', bg: 'bg-yellow-50/50' },
                            SECOND: { border: 'border-slate-300', icon: 'text-slate-600', bg: 'bg-slate-50/50' },
                            THIRD: { border: 'border-orange-300', icon: 'text-orange-700', bg: 'bg-orange-50/50' }
                        }[pos as 'FIRST'|'SECOND'|'THIRD']

                        return (
                            <Card key={pos} className={cn("border-t-4 shadow-sm flex flex-col h-[500px]", style.border, style.bg)}>
                                <CardHeader className="pb-2 shrink-0 border-b border-border/10 bg-white/50">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className={cn("flex items-center gap-2 text-base font-heading", style.icon)}>
                                            <Trophy className="w-4 h-4" /> {pos} Place
                                        </CardTitle>
                                        <Badge variant="secondary" className="font-mono text-xs">Base: {basePts}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto pt-2 space-y-2 p-3 bg-white/80">

                                    {/* LIST OF CANDIDATES */}
                                    {(mode === 'INDIVIDUAL' ? participants.filter(p => p.student) : teams).map((item: any) => {
                                        const id = mode === 'INDIVIDUAL' ? item.id : item.id
                                        const isSelected = selectedMap.has(id)
                                        const grade = selectedMap.get(id) || 'NONE'

                                        return (
                                            <div
                                                key={id}
                                                className={cn(
                                                    "p-3 border rounded-lg transition-all duration-200 relative group",
                                                    isSelected ? "bg-white ring-2 ring-primary border-primary shadow-md" : "bg-white border-slate-200 hover:border-primary/30"
                                                )}
                                            >
                                                {/* Selection Area */}
                                                <div className="flex justify-between items-start cursor-pointer" onClick={() => toggleWinner(pos as any, id)}>
                                                    <div>
                                                        <div className={cn("font-bold text-sm", isSelected ? "text-primary" : "text-slate-700")}>
                                                            {mode === 'INDIVIDUAL' ? item.student?.name : item.name}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground flex gap-1 mt-0.5">
                                                            {mode === 'INDIVIDUAL' && <span className="font-mono bg-slate-100 px-1 rounded">{item.student?.chest_no}</span>}
                                                            <span>{mode === 'INDIVIDUAL' ? item.team.name : 'Team Entry'}</span>
                                                        </div>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                                </div>

                                                {/* Grade Selector (Only if Selected) */}
                                                {isSelected && (
                                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between animate-in slide-in-from-top-1 fade-in duration-200">
                                                        <span className="text-[10px] font-bold uppercase text-slate-400">Perf. Grade</span>
                                                        <div className="flex gap-1">
                                                            {['A', 'B', 'C', 'NONE'].map(g => (
                                                                <button
                                                                    key={g}
                                                                    onClick={(e) => { e.stopPropagation(); updatePerfGrade(pos as any, id, g) }}
                                                                    className={cn(
                                                                        "text-[10px] w-6 h-6 rounded flex items-center justify-center font-bold border transition-colors",
                                                                        grade === g
                                                                            ? "bg-slate-800 text-white border-slate-800"
                                                                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                                                                    )}
                                                                >
                                                                    {g === 'NONE' ? '-' : g}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        )}

        {/* Save Button */}
        {selectedEventId && (
            <div className="flex justify-end pt-4 border-t mt-auto sticky bottom-0 bg-background/80 backdrop-blur z-20">
                <Button size="lg" onClick={handleSave} disabled={saving} className="shadow-lg">
                    {saving ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Scores
                </Button>
            </div>
        )}
    </div>
  )
}