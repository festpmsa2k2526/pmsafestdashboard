"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Loader2, Trophy, Save, User, Users, CheckCircle2, ChevronsUpDown, Check, Award } from "lucide-react"
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
  const [completedEventIds, setCompletedEventIds] = useState<Set<string>>(new Set())
  const [teams, setTeams] = useState<Team[]>([])

  // Selection
  const [openCombobox, setOpenCombobox] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string>("")

  const [participants, setParticipants] = useState<Participant[]>([])
  const [pointsTable, setPointsTable] = useState<any>({})

  // Winners State (Top 3)
  const [winners, setWinners] = useState<{
    FIRST: Map<string, string>,
    SECOND: Map<string, string>,
    THIRD: Map<string, string>
  }>({
    FIRST: new Map(),
    SECOND: new Map(),
    THIRD: new Map()
  })

  // Grades for everyone else (Not in Top 3)
  const [otherGrades, setOtherGrades] = useState<Map<string, string>>(new Map())

  const supabase = createClient()

  // 1. Load Initial Data & Completed Status
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [evtRes, teamRes, gradeRes] = await Promise.all([
        supabase.from('events').select('*').eq('category', category).contains('applicable_section', [section]).order('name'),
        supabase.from('teams').select('*').order('name'),
        supabase.from('grade_settings').select('*')
      ])

      if (evtRes.data) {
          const evts = evtRes.data as Event[]
          setEvents(evts)

          // Fetch completed status (events with at least one result_position OR grade)
          // We consider an event "touched" if it has any entries in participations
          // But strict completion usually means results. Let's stick to existing logic for now.
          const { data: doneData } = await supabase
            .from('participations')
            .select('event_id')
            .in('event_id', evts.map(e => e.id))
            .not('result_position', 'is', null)

          if (doneData) {
              // Cast to any[] to avoid strict type errors on 'event_id'
              setCompletedEventIds(new Set((doneData as any[]).map(d => d.event_id)))
          }
      }

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
      setOtherGrades(new Map())
      return
    }

    const event = events.find(e => e.id === selectedEventId)
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

        // Populate existing winners and other grades
        const newWinners = { FIRST: new Map(), SECOND: new Map(), THIRD: new Map() }
        const newOtherGrades = new Map<string, string>()

        mapped.forEach((p: any) => {
            const key = p.student_id ? p.id : p.team.id // Use participant ID for individual, Team ID for team events

            if (p.result_position) {
                // @ts-ignore
                newWinners[p.result_position].set(key, p.performance_grade || 'NONE')
            } else if (p.performance_grade) {
                // If they have a grade but no position, they go to 'otherGrades'
                newOtherGrades.set(key, p.performance_grade)
            }
        })
        // @ts-ignore
        setWinners(newWinners)
        setOtherGrades(newOtherGrades)
      }
      setLoading(false)
    }
    loadParts()
  }, [selectedEventId])

  // 3. Logic: Toggle Winner / Update Grade
  const toggleWinner = (pos: 'FIRST'|'SECOND'|'THIRD', id: string) => {
      setWinners(prev => {
          const next = { ...prev }
          const currentMap = new Map(next[pos])

          const inFirst = prev.FIRST.has(id) && pos !== 'FIRST'
          const inSecond = prev.SECOND.has(id) && pos !== 'SECOND'
          const inThird = prev.THIRD.has(id) && pos !== 'THIRD'

          if (inFirst || inSecond || inThird) {
              return prev // Prevent same person in multiple winner slots
          }

          if (currentMap.has(id)) {
              currentMap.delete(id)
              // Optionally move back to 'otherGrades' if needed, but for now we just clear rank.
              // The user can re-assign grade in the bottom section.
          } else {
              currentMap.set(id, 'NONE')
              // If moving to winners, remove from otherGrades
              setOtherGrades(prevOthers => {
                  const nextOthers = new Map(prevOthers)
                  nextOthers.delete(id)
                  return nextOthers
              })
          }
          next[pos] = currentMap
          return next
      })
  }

  const updateWinnerGrade = (pos: 'FIRST'|'SECOND'|'THIRD', id: string, grade: string) => {
      setWinners(prev => {
          const next = { ...prev }
          const currentMap = new Map(next[pos])
          if (currentMap.has(id)) currentMap.set(id, grade)
          next[pos] = currentMap
          return next
      })
  }

  const updateOtherGrade = (id: string, grade: string) => {
      // Ensure this person isn't a winner first (safety check)
      if (winners.FIRST.has(id) || winners.SECOND.has(id) || winners.THIRD.has(id)) return;

      setOtherGrades(prev => {
          const next = new Map(prev)
          if (grade === 'NONE') {
              next.delete(id)
          } else {
              next.set(id, grade)
          }
          return next
      })
  }

  // 4. Save
  const handleSave = async () => {
    if (!selectedEventId) return
    setSaving(true)

    const event = events.find(e => e.id === selectedEventId)
    if (!event) return

    // @ts-ignore
    const basePoints = pointsTable[event.grade_type || 'A']
    let hasWinners = false

    try {
       if (mode === 'INDIVIDUAL') {
          const updates = participants.filter(p => p.student).map(p => {
              let pos: any = null
              let perf: any = null
              let pts = 0

              if (winners.FIRST.has(p.id)) {
                  pos = 'FIRST';
                  perf = winners.FIRST.get(p.id);
                  hasWinners = true;
                  const key = (perf || 'NONE') as keyof typeof PERF_POINTS;
                  pts = basePoints.FIRST + PERF_POINTS[key];
              }
              else if (winners.SECOND.has(p.id)) {
                  pos = 'SECOND';
                  perf = winners.SECOND.get(p.id);
                  hasWinners = true;
                  const key = (perf || 'NONE') as keyof typeof PERF_POINTS;
                  pts = basePoints.SECOND + PERF_POINTS[key];
              }
              else if (winners.THIRD.has(p.id)) {
                  pos = 'THIRD';
                  perf = winners.THIRD.get(p.id);
                  hasWinners = true;
                  const key = (perf || 'NONE') as keyof typeof PERF_POINTS;
                  pts = basePoints.THIRD + PERF_POINTS[key];
              }
              else if (otherGrades.has(p.id)) {
                  // Not a winner, but has a grade
                  pos = null;
                  perf = otherGrades.get(p.id);
                  const key = (perf || 'NONE') as keyof typeof PERF_POINTS;
                  // No base points for non-winners, only grade points
                  pts = 0 + PERF_POINTS[key];
              }

              return {
                  id: p.id,
                  event_id: selectedEventId,
                  team_id: p.team.id,
                  student_id: p.student_id,
                  result_position: pos,
                  performance_grade: perf === 'NONE' ? null : perf,
                  points_earned: pts,
                  status: pos ? 'winner' : (perf ? 'completed' : 'registered')
              }
          })

          if (updates.length > 0) {
              const { error } = await (supabase.from('participations') as any).upsert(updates)
              if (error) throw error
          }
       } else {
          // Team Logic
          // Clear existing team results for this event
          await supabase.from('participations').delete().eq('event_id', selectedEventId).is('student_id', null)

          const newResults: any[] = []

          // Helper to add results
          const addResult = (teamId: string, pos: string | null, grade: string | null, basePts: number) => {
              if (pos) hasWinners = true
              const key = (grade || 'NONE') as keyof typeof PERF_POINTS;
              const total = basePts + PERF_POINTS[key]

              newResults.push({
                  event_id: selectedEventId,
                  team_id: teamId,
                  student_id: null,
                  result_position: pos,
                  performance_grade: grade === 'NONE' ? null : grade,
                  points_earned: total,
                  status: pos ? 'winner' : 'completed'
              })
          }

          // Process Winners
          winners.FIRST.forEach((perf, teamId) => addResult(teamId, 'FIRST', perf, basePoints.FIRST))
          winners.SECOND.forEach((perf, teamId) => addResult(teamId, 'SECOND', perf, basePoints.SECOND))
          winners.THIRD.forEach((perf, teamId) => addResult(teamId, 'THIRD', perf, basePoints.THIRD))

          // Process Others (Teams not in winners)
          teams.forEach(t => {
             const isWinner = winners.FIRST.has(t.id) || winners.SECOND.has(t.id) || winners.THIRD.has(t.id)
             if (!isWinner && otherGrades.has(t.id)) {
                 addResult(t.id, null, otherGrades.get(t.id) || 'NONE', 0)
             }
          })

          if (newResults.length > 0) {
              const { error } = await (supabase.from('participations') as any).insert(newResults)
              if (error) throw error
          }
       }

       // Update completed status locally
       if (hasWinners) {
           setCompletedEventIds(prev => new Set(prev).add(selectedEventId))
       } else {
           const next = new Set(completedEventIds)
           next.delete(selectedEventId)
           setCompletedEventIds(next)
       }

       if (onScoreSaved) onScoreSaved()
    } catch (err: any) {
       alert("Save failed: " + err.message)
    } finally {
       setSaving(false)
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  // Filter lists
  const winnerIds = new Set([
      ...Array.from(winners.FIRST.keys()),
      ...Array.from(winners.SECOND.keys()),
      ...Array.from(winners.THIRD.keys())
  ])

  const itemList = mode === 'INDIVIDUAL' ? participants.filter(p => p.student) : teams.map(t => ({ ...t, id: t.id })) // Normalized
  const otherParticipants = itemList.filter(item => !winnerIds.has(mode === 'INDIVIDUAL' ? item.id : item.id))

  return (
    <div className="flex flex-col h-full space-y-3">
        {/* TOP BAR: Combobox & Mode */}
        <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-2 rounded-lg border border-border/50 shrink-0 shadow-sm">

            <div className="w-full md:w-[400px]">
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="w-full justify-between h-9 text-xs md:text-sm"
                        >
                            {selectedEventId
                                ? events.find((e) => e.id === selectedEventId)?.name
                                : "-- Search & Select Event --"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 bg-white">
                        <Command>
                            <CommandInput placeholder="Search event..." />
                            <CommandList>
                                <CommandEmpty>No event found.</CommandEmpty>
                                <CommandGroup>
                                    {events.map((event) => {
                                        const isCompleted = completedEventIds.has(event.id)
                                        return (
                                            <CommandItem
                                                key={event.id}
                                                value={event.name}
                                                onSelect={() => {
                                                    setSelectedEventId(event.id)
                                                    setOpenCombobox(false)
                                                }}
                                                className={cn(
                                                    "flex items-center justify-between cursor-pointer",
                                                    isCompleted ? "bg-green-50 text-green-700 data-[selected=true]:bg-green-100" : ""
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isCompleted && <Check className="w-3 h-3 text-green-600" />}
                                                    <span>{event.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] opacity-60">
                                                    <span>{event.event_code}</span>
                                                    <span className="bg-slate-100 px-1 rounded">Cate {event.grade_type}</span>
                                                </div>
                                            </CommandItem>
                                        )
                                    })}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {selectedEvent && (
                <div className="flex items-center gap-2 ml-auto">
                    <Badge variant={mode === 'TEAM' ? 'destructive' : 'outline'} className="h-8 px-3 text-xs">
                       {mode === 'TEAM' ? <><Users className="w-3 h-3 mr-1"/> Team Event (Cate C)</> : <><User className="w-3 h-3 mr-1"/> Individual (Cate {selectedEvent.grade_type})</>}
                    </Badge>
                </div>
            )}
        </div>

        {/* MAIN SCORING AREA */}
        {selectedEventId && (
            <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 rounded-lg p-2 md:p-4 space-y-4">

                {/* 1. TOP 3 WINNERS */}
                <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
                    {['FIRST', 'SECOND', 'THIRD'].map(pos => {
                        // @ts-ignore
                        const basePts = pointsTable[selectedEvent?.grade_type || 'A']?.[pos] || 0
                        // @ts-ignore
                        const selectedMap = winners[pos] as Map<string, string>

                        const style = {
                            FIRST: { border: 'border-yellow-400', icon: 'text-yellow-600', bg: 'bg-yellow-50/30' },
                            SECOND: { border: 'border-slate-300', icon: 'text-slate-600', bg: 'bg-slate-50/30' },
                            THIRD: { border: 'border-orange-300', icon: 'text-orange-700', bg: 'bg-orange-50/30' }
                        }[pos as 'FIRST'|'SECOND'|'THIRD']

                        return (
                            <Card key={pos} className={cn("border-t-4 shadow-sm flex flex-col h-[400px]", style.border, style.bg)}>
                                <CardHeader className="py-2 px-3 shrink-0 border-b border-border/10 bg-white/50">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className={cn("flex items-center gap-2 text-sm font-heading", style.icon)}>
                                            <Trophy className="w-4 h-4" /> {pos} Place
                                        </CardTitle>
                                        <Badge variant="secondary" className="font-mono text-[10px] h-5">Base: {basePts} + Grade</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto p-2 bg-white/60 space-y-1.5">
                                    {itemList.map((item: any) => {
                                        const id = mode === 'INDIVIDUAL' ? item.id : item.id
                                        const isSelected = selectedMap.has(id)
                                        const grade = selectedMap.get(id) || 'NONE'
                                        const isAlreadyWinner = winnerIds.has(id) && !isSelected

                                        // If already a winner elsewhere, hide from this list to reduce clutter,
                                        // or keep visuals consistent. Let's hide if chosen elsewhere for cleaner UI
                                        if (isAlreadyWinner) return null;

                                        return (
                                            <div
                                                key={id}
                                                onClick={() => toggleWinner(pos as any, id)}
                                                className={cn(
                                                    "p-2 rounded border transition-all duration-200 cursor-pointer relative",
                                                    isSelected ? "bg-white ring-1 ring-primary border-primary shadow-sm" : "bg-white border-slate-100 hover:border-primary/20 hover:bg-slate-50"
                                                )}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div className="min-w-0 flex-1">
                                                        <div className={cn("font-semibold text-sm truncate", isSelected ? "text-primary" : "text-slate-700")}>
                                                            {mode === 'INDIVIDUAL' ? item.student?.name : item.name}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                            {mode === 'INDIVIDUAL' && <span className="font-mono bg-slate-100 px-1 rounded text-slate-600">{item.student?.chest_no}</span>}
                                                            <span className="truncate">{mode === 'INDIVIDUAL' ? item.team.name : 'Team Entry'}</span>
                                                        </div>
                                                    </div>
                                                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-2" />}
                                                </div>

                                                {/* Grade Select Buttons - Only visible if selected */}
                                                {isSelected && (
                                                    <div className="mt-2 pt-1.5 border-t border-dashed border-slate-200 flex items-center justify-between gap-2 animate-in fade-in zoom-in-95 duration-200">
                                                        <span className="text-[9px] font-bold uppercase text-slate-400">Perf.</span>
                                                        <div className="flex gap-0.5">
                                                            {['A', 'B', 'C', 'NONE'].map(g => (
                                                                <button
                                                                    key={g}
                                                                    onClick={(e) => { e.stopPropagation(); updateWinnerGrade(pos as any, id, g) }}
                                                                    className={cn(
                                                                        "text-[9px] w-5 h-5 rounded flex items-center justify-center font-bold border transition-colors",
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

                {/* 2. OTHER PARTICIPANTS (GRADES) */}
                <Card className="border-t-4 border-slate-200 shadow-sm bg-slate-50/50">
                    <CardHeader className="py-3 px-4 bg-white border-b border-border/10">
                        <div className="flex items-center gap-2">
                           <Award className="w-4 h-4 text-slate-500" />
                           <CardTitle className="text-sm text-slate-700">Participation Grades</CardTitle>
                           <Badge variant="outline" className="ml-2 font-normal text-slate-500">{otherParticipants.length} Remaining</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        {otherParticipants.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-sm">All participants ranked!</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {otherParticipants.map((item: any) => {
                                    const id = mode === 'INDIVIDUAL' ? item.id : item.id
                                    const grade = otherGrades.get(id) || 'NONE'
                                    const hasGrade = otherGrades.has(id) && grade !== 'NONE'

                                    return (
                                        <div key={id} className={cn("bg-white p-3 rounded-md border shadow-sm flex flex-col gap-2 transition-all", hasGrade ? "border-slate-300 ring-1 ring-slate-200" : "border-slate-100")}>
                                            <div className="flex justify-between items-start min-w-0">
                                                <div className="min-w-0">
                                                    <div className="font-medium text-sm truncate text-slate-800">
                                                        {mode === 'INDIVIDUAL' ? item.student?.name : item.name}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                        {mode === 'INDIVIDUAL' && <span className="font-mono bg-slate-100 px-1 rounded text-slate-500">{item.student?.chest_no}</span>}
                                                        <span className="truncate max-w-[100px]">{mode === 'INDIVIDUAL' ? item.team.name : 'Team'}</span>
                                                    </div>
                                                </div>
                                                {hasGrade && <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-slate-100 text-slate-700">+{PERF_POINTS[grade as keyof typeof PERF_POINTS]} pts</Badge>}
                                            </div>

                                            <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-slate-50">
                                                <span className="text-[9px] text-slate-400 font-medium">GRADE</span>
                                                <div className="flex gap-1">
                                                     {['A', 'B', 'C'].map(g => (
                                                        <button
                                                            key={g}
                                                            onClick={() => updateOtherGrade(id, g)}
                                                            className={cn(
                                                                "w-6 h-6 rounded text-[10px] font-bold border transition-all",
                                                                grade === g
                                                                    ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                                                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                                            )}
                                                        >
                                                            {g}
                                                        </button>
                                                     ))}
                                                     <button
                                                        onClick={() => updateOtherGrade(id, 'NONE')}
                                                        className={cn(
                                                            "w-6 h-6 rounded text-[10px] border transition-all",
                                                            grade === 'NONE' ? "bg-slate-100 text-slate-400 border-transparent" : "text-red-400 hover:bg-red-50 border-transparent"
                                                        )}
                                                        title="Clear"
                                                     >
                                                        ✕
                                                     </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
                <div className="h-16"></div> {/* Spacer for fixed save button */}
            </div>
        )}

        {/* BOTTOM FLOATING SAVE */}
        {selectedEventId && (
             <div className="fixed bottom-4 right-4 md:right-8 z-50 animate-in slide-in-from-bottom-4">
                 <Button
                    size="lg"
                    onClick={handleSave}
                    disabled={saving}
                    className="shadow-2xl h-12 px-6 rounded-full bg-slate-900 hover:bg-slate-800 text-white border-2 border-white ring-4 ring-black/5"
                 >
                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Scores
                 </Button>
            </div>
        )}
    </div>
  )
}