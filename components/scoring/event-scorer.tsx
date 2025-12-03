"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, Users, User, Medal } from "lucide-react"
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

interface Team {
  id: string
  name: string
  color_hex: string
}

interface Participant {
  id: string // participation_id
  student_id: string | null
  student?: { id: string; name: string; chest_no: string } | null
  team: { id: string; name: string; color_hex: string }
  result_position: 'FIRST' | 'SECOND' | 'THIRD' | null
}

const POINTS_TABLE = {
  'A': { 'FIRST': 15, 'SECOND': 10, 'THIRD': 5 },
  'B': { 'FIRST': 10, 'SECOND': 5, 'THIRD': 3 },
  'C': { 'FIRST': 20, 'SECOND': 15, 'THIRD': 10 },
}

interface EventScorerProps {
  section: string
  category: string
  onScoreSaved?: () => void
}

export function EventScorer({ section, category, onScoreSaved }: EventScorerProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scoreMode, setScoreMode] = useState<'INDIVIDUAL' | 'TEAM'>('INDIVIDUAL')

  // Data
  const [events, setEvents] = useState<Event[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [participants, setParticipants] = useState<Participant[]>([])

  // Winners State (IDs of participation or team)
  const [firstPlace, setFirstPlace] = useState<string[]>([])
  const [secondPlace, setSecondPlace] = useState<string[]>([])
  const [thirdPlace, setThirdPlace] = useState<string[]>([])

  const supabase = createClient()

  // 1. Load Events & Teams
  useEffect(() => {
    async function loadData() {
      setLoading(true)

      // Fetch Events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('category', category)
        .contains('applicable_section', [section])
        .order('name')

      if (eventsData) setEvents(eventsData as any)

      // Fetch Teams (for Team Mode)
      const { data: teamsData } = await supabase.from('teams').select('*').order('name')
      if (teamsData) setTeams(teamsData as any)

      setLoading(false)
    }
    loadData()
  }, [section, category])

  // 2. Load Participants/Results when Event Selected
  useEffect(() => {
    if (!selectedEventId) {
      setParticipants([])
      setFirstPlace([])
      setSecondPlace([])
      setThirdPlace([])
      return
    }

    async function loadParts() {
      setLoading(true)

      const { data } = await supabase
        .from('participations')
        .select(`
          id,
          result_position,
          student_id,
          students ( id, name, chest_no ),
          teams ( id, name, color_hex )
        `)
        .eq('event_id', selectedEventId)

      if (data) {
        const mapped = data.map((p: any) => ({
          id: p.id,
          student_id: p.student_id,
          result_position: p.result_position,
          student: p.students,
          team: p.teams
        }))
        setParticipants(mapped)

        // Detect Mode based on existing data (if any team-only results exist)
        const hasTeamOnlyResults = mapped.some(p => !p.student_id && p.result_position)
        if (hasTeamOnlyResults) setScoreMode('TEAM')

        // Populate winners state
        const getIds = (pos: string) => {
             return mapped
                .filter((p: any) => p.result_position === pos)
                .map((p: any) => p.student_id ? p.id : p.team.id)
        }

        setFirstPlace(getIds('FIRST'))
        setSecondPlace(getIds('SECOND'))
        setThirdPlace(getIds('THIRD'))
      }
      setLoading(false)
    }
    loadParts()
  }, [selectedEventId])

  // 3. Toggle Logic
  const toggleWinner = (position: 'FIRST' | 'SECOND' | 'THIRD', id: string) => {
    const setter = position === 'FIRST' ? setFirstPlace : position === 'SECOND' ? setSecondPlace : setThirdPlace
    const current = position === 'FIRST' ? firstPlace : position === 'SECOND' ? secondPlace : thirdPlace

    const allSelected = [...firstPlace, ...secondPlace, ...thirdPlace]

    // Allow toggle off
    if (current.includes(id)) {
      setter(prev => prev.filter(x => x !== id))
      return
    }

    // Prevent duplicates
    if (allSelected.includes(id)) {
      alert("Already assigned a position. Remove first.")
      return
    }

    setter(prev => [...prev, id])
  }

  // 4. Save Results
  const handleSave = async () => {
    if (!selectedEventId) return
    setSaving(true)

    const event = events.find(e => e.id === selectedEventId)
    if (!event) return

    // @ts-ignore
    const points = POINTS_TABLE[event.grade_type || 'A']

    try {
      if (scoreMode === 'INDIVIDUAL') {
        // --- INDIVIDUAL MODE ---
        const updates = participants.filter(p => p.student).map(p => {
            let pos: any = null
            let pts = 0
            if (firstPlace.includes(p.id)) { pos = 'FIRST'; pts = points.FIRST }
            else if (secondPlace.includes(p.id)) { pos = 'SECOND'; pts = points.SECOND }
            else if (thirdPlace.includes(p.id)) { pos = 'THIRD'; pts = points.THIRD }

            return {
                id: p.id,
                event_id: selectedEventId,
                team_id: p.team.id,
                student_id: p.student_id,
                result_position: pos,
                points_earned: pts,
                status: pos ? 'winner' : 'registered'
            }
        })

        if (updates.length > 0) {
            const { error } = await (supabase.from('participations') as any).upsert(updates)
            if (error) throw error
        }

      } else {
        // --- TEAM MODE ---
        await supabase.from('participations')
            .delete()
            .eq('event_id', selectedEventId)
            .is('student_id', null)

        const newTeamResults: any[] = []
        const processTeamPos = (teamIds: string[], pos: string, pts: number) => {
            teamIds.forEach(tid => {
                newTeamResults.push({
                    event_id: selectedEventId,
                    team_id: tid,
                    student_id: null,
                    result_position: pos,
                    points_earned: pts,
                    status: 'winner'
                })
            })
        }
        processTeamPos(firstPlace, 'FIRST', points.FIRST)
        processTeamPos(secondPlace, 'SECOND', points.SECOND)
        processTeamPos(thirdPlace, 'THIRD', points.THIRD)

        if (newTeamResults.length > 0) {
            const { error } = await (supabase.from('participations') as any).insert(newTeamResults)
            if (error) throw error
        }
      }

      if (onScoreSaved) onScoreSaved()

    } catch (err: any) {
      console.error(err)
      alert("Failed to save: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col gap-4 bg-muted/20 p-4 rounded-lg border border-border/50 shrink-0">

        {/* EVENT SELECTOR */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
            <div className="w-full md:w-1/2 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Event</label>
                <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={selectedEventId}
                      onValueChange={(value) => {
                        setSelectedEventId(value)
                        setFirstPlace([]); setSecondPlace([]); setThirdPlace([]);
                      }}
                    >
                      <SelectTrigger className="w-full bg-background border-border">
                        <SelectValue placeholder="-- Choose Event --" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            <span className="font-medium">{e.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground font-mono border border-border px-1 rounded">
                              ({e.event_code}) • Grade {e.grade_type}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
            </div>

            {/* MODE TOGGLE */}
            {selectedEventId && (
                <div className="w-full md:w-auto">
                    <Tabs value={scoreMode} onValueChange={(v) => {
                        setScoreMode(v as any)
                        setFirstPlace([]); setSecondPlace([]); setThirdPlace([]);
                    }} className="w-full">
                        <TabsList className="bg-background border border-border">
                            <TabsTrigger value="INDIVIDUAL"><User className="w-4 h-4 mr-2" /> Student</TabsTrigger>
                            <TabsTrigger value="TEAM"><Users className="w-4 h-4 mr-2" /> Team Prize</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            )}
        </div>
      </div>

      {selectedEventId && (
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            <div className="grid md:grid-cols-3 gap-4 pb-4">
                {['FIRST', 'SECOND', 'THIRD'].map((pos) => {
                    // @ts-ignore
                    const pts = POINTS_TABLE[events.find(e => e.id === selectedEventId)?.grade_type || 'A'][pos]
                    const selectedIds = pos === 'FIRST' ? firstPlace : pos === 'SECOND' ? secondPlace : thirdPlace

                    // Colors
                    const colors = {
                        FIRST: { border: 'border-amber-400', bg: 'bg-amber-50/30 dark:bg-amber-900/10', icon: 'text-amber-500' },
                        SECOND: { border: 'border-slate-300', bg: 'bg-slate-50/30 dark:bg-slate-800/10', icon: 'text-slate-500' },
                        THIRD: { border: 'border-orange-400', bg: 'bg-orange-50/30 dark:bg-orange-900/10', icon: 'text-orange-600' }
                    }
                    const style = colors[pos as keyof typeof colors]

                    return (
                        <Card key={pos} className={cn("border-t-4 shadow-sm flex flex-col h-[450px]", style.border, style.bg)}>
                            <CardHeader className="pb-2 shrink-0 border-b border-border/10">
                                <div className="flex justify-between items-center">
                                    <CardTitle className={cn("flex items-center gap-2 text-base font-heading", style.icon)}>
                                        <Medal className="w-5 h-5" /> {pos} Place
                                    </CardTitle>
                                    <Badge variant="outline" className="font-mono text-sm bg-background/50 border-border/50">{pts} pts</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto min-h-0 pt-3 space-y-2">
                                {scoreMode === 'INDIVIDUAL' ? (
                                    participants.filter(p => p.student).length > 0 ? (
                                        participants.filter(p => p.student).map((p) => (
                                            <div
                                                key={p.id}
                                                onClick={() => toggleWinner(pos as any, p.id)}
                                                className={cn(
                                                    "p-2.5 rounded-lg border cursor-pointer flex justify-between items-center transition-all",
                                                    selectedIds.includes(p.id)
                                                        ? "bg-primary/10 border-primary ring-1 ring-primary"
                                                        : "bg-background border-border hover:bg-muted"
                                                )}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-sm truncate text-foreground">{p.student?.name}</div>
                                                    <div className="text-[10px] text-muted-foreground flex gap-1 mt-0.5">
                                                        <span className="font-mono bg-muted px-1 rounded">{p.student?.chest_no}</span>
                                                        <span className="truncate">{p.team.name}</span>
                                                    </div>
                                                </div>
                                                {selectedIds.includes(p.id) && (
                                                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-sm shrink-0 ml-2">
                                                        <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : <div className="text-center text-sm text-muted-foreground mt-10">No students found</div>
                                ) : (
                                    teams.map((t) => (
                                        <div
                                            key={t.id}
                                            onClick={() => toggleWinner(pos as any, t.id)}
                                            className={cn(
                                                "p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all",
                                                selectedIds.includes(t.id)
                                                    ? "bg-primary/10 border-primary ring-1 ring-primary"
                                                    : "bg-background border-border hover:bg-muted"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: t.color_hex }} />
                                                <span className="font-semibold text-sm text-foreground">{t.name}</span>
                                            </div>
                                            {selectedIds.includes(t.id) && (
                                                <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-sm shrink-0">
                                                    <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
      )}

      {selectedEventId && (
        <div className="flex justify-end pt-4 border-t border-border/50 mt-auto shrink-0 sticky bottom-0 bg-background/80 backdrop-blur-sm">
          <Button size="lg" onClick={handleSave} disabled={saving} className="gap-2 shadow-lg shadow-primary/20">
            {saving ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Publish Scores
          </Button>
        </div>
      )}
    </div>
  )
}