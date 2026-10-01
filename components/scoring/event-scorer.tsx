"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import {
  Trophy,
  CheckCircle2,
  Users,
  User,
  Sparkles,
  Loader2,
  Save,
  Check,
  ChevronsUpDown,
  Tag
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { isGroupEvent, getEventGroupConfig } from "@/lib/event-utils"

interface Event {
  id: string
  name: string
  event_code: string
  grade_type: string
  category: string
  applicable_section: string[]
  max_participants_per_team?: number
}

interface Team { 
  id: string
  name: string
  color_hex: string 
  slug?: string
}

interface Participant {
  id: string
  student_id: string | null
  student?: { id: string; name: string; chest_no: string } | null
  team: { id: string; name: string; color_hex: string; slug?: string }
  result_position: 'FIRST' | 'SECOND' | 'THIRD' | null
  performance_grade: 'A+' | 'A' | 'B' | 'C' | 'NONE' | null
  points_earned?: number
  code_letter?: string | null
}

interface GroupEntry {
  id: string
  teamId: string
  teamName: string
  teamColor: string
  teamSlug?: string
  codeLetter: string | null
  groupLabel: string
  participationIds: string[]
  members: Array<{
    participationId: string
    studentId: string | null
    name: string
    chest_no: string
    code_letter?: string | null
  }>
  result_position: 'FIRST' | 'SECOND' | 'THIRD' | null
  performance_grade: 'A+' | 'A' | 'B' | 'C' | 'NONE' | null
  points_earned?: number
}

const PERF_POINTS: Record<string, number> = { 'A+': 7, 'A': 5, 'B': 3, 'C': 1, 'NONE': 0 }

interface EventScorerProps {
  section: string
  category: string
  onScoreSaved?: () => void
}

export function EventScorer({ section, category, onScoreSaved }: EventScorerProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'INDIVIDUAL' | 'GROUP'>('INDIVIDUAL')

  // Data
  const [events, setEvents] = useState<Event[]>([])
  const [completedEventIds, setCompletedEventIds] = useState<Set<string>>(new Set())
  const [teams, setTeams] = useState<Team[]>([])

  // Selection
  const [openCombobox, setOpenCombobox] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string>("")

  // Loaded participations
  const [participants, setParticipants] = useState<Participant[]>([])
  const [pointsTable, setPointsTable] = useState<any>({})

  // Winners State (Top 3) - Keys are participant ID (individual) or group entry ID (group)
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

        const { data: doneData } = await supabase
          .from('participations')
          .select('event_id')
          .in('event_id', evts.map(e => e.id))
          .not('result_position', 'is', null)

        if (doneData) {
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

  const selectedEvent = useMemo(() => events.find(e => e.id === selectedEventId), [events, selectedEventId])
  const eventConfig = useMemo(() => selectedEvent ? getEventGroupConfig(selectedEvent) : null, [selectedEvent])

  // 2. Load Participants when Event Selected
  useEffect(() => {
    if (!selectedEventId || !selectedEvent) {
      setParticipants([])
      setWinners({ FIRST: new Map(), SECOND: new Map(), THIRD: new Map() })
      setOtherGrades(new Map())
      return
    }

    const isGroup = isGroupEvent(selectedEvent)
    setMode(isGroup ? 'GROUP' : 'INDIVIDUAL')

    async function loadParts() {
      setLoading(true)
      const { data } = await supabase
        .from('participations')
        .select(`
          id, result_position, performance_grade, points_earned, student_id, code_letter,
          students ( id, name, chest_no ),
          teams ( id, name, color_hex, slug )
        `)
        .eq('event_id', selectedEventId)

      if (data) {
        const mapped: Participant[] = data.map((p: any) => ({
          id: p.id,
          student_id: p.student_id,
          result_position: p.result_position,
          performance_grade: p.performance_grade,
          points_earned: p.points_earned,
          code_letter: p.code_letter,
          student: p.students,
          team: p.teams
        }))
        setParticipants(mapped)

        // Populate existing winners and other grades
        const newWinners = { FIRST: new Map(), SECOND: new Map(), THIRD: new Map() }
        const newOtherGrades = new Map<string, string>()

        if (isGroup) {
          // Build group entries first to match keys
          const groupEntries = buildGroupEntries(mapped, selectedEvent, teams)
          groupEntries.forEach(grp => {
            if (grp.result_position) {
              // @ts-ignore
              newWinners[grp.result_position]?.set(grp.id, grp.performance_grade || 'NONE')
            } else if (grp.performance_grade && grp.performance_grade !== 'NONE') {
              newOtherGrades.set(grp.id, grp.performance_grade)
            }
          })
        } else {
          // Individual mode
          mapped.forEach((p) => {
            if (p.result_position) {
              // @ts-ignore
              newWinners[p.result_position]?.set(p.id, p.performance_grade || 'NONE')
            } else if (p.performance_grade && p.performance_grade !== 'NONE') {
              newOtherGrades.set(p.id, p.performance_grade)
            }
          })
        }

        // @ts-ignore
        setWinners(newWinners)
        setOtherGrades(newOtherGrades)
      }
      setLoading(false)
    }
    loadParts()
  }, [selectedEventId, selectedEvent])

  // Helper to build group entries from participations
  function buildGroupEntries(parts: Participant[], evt: Event | undefined, allTeams: Team[]): GroupEntry[] {
    if (!evt) return []
    const config = getEventGroupConfig(evt)
    const isTwoGroups = config.groupType === 'TWO_GROUPS_PER_TEAM'

    const entries: GroupEntry[] = []
    const teamMap: Record<string, Participant[]> = {}

    // Group participants by team
    parts.forEach(p => {
      const tid = p.team?.id || 'unknown'
      if (!teamMap[tid]) teamMap[tid] = []
      teamMap[tid].push(p)
    })

    allTeams.forEach(tm => {
      const teamParts = teamMap[tm.id] || []

      if (teamParts.length === 0) {
        // Empty team placeholder
        entries.push({
          id: `${tm.id}_grp_1`,
          teamId: tm.id,
          teamName: tm.name,
          teamColor: tm.color_hex,
          teamSlug: tm.slug,
          codeLetter: null,
          groupLabel: isTwoGroups ? `${tm.name} (Group 1)` : tm.name,
          participationIds: [],
          members: [],
          result_position: null,
          performance_grade: null
        })
        if (isTwoGroups) {
          entries.push({
            id: `${tm.id}_grp_2`,
            teamId: tm.id,
            teamName: tm.name,
            teamColor: tm.color_hex,
            teamSlug: tm.slug,
            codeLetter: null,
            groupLabel: `${tm.name} (Group 2)`,
            participationIds: [],
            members: [],
            result_position: null,
            performance_grade: null
          })
        }
        return
      }

      // Check if participants have distinct code letters assigned
      const codeLetterGroups: Record<string, Participant[]> = {}
      const unassigned: Participant[] = []

      teamParts.forEach(p => {
        if (p.code_letter && p.code_letter.trim() !== '') {
          const c = p.code_letter.trim().toUpperCase()
          if (!codeLetterGroups[c]) codeLetterGroups[c] = []
          codeLetterGroups[c].push(p)
        } else {
          unassigned.push(p)
        }
      })

      const codeLetterKeys = Object.keys(codeLetterGroups).sort()

      if (codeLetterKeys.length > 0) {
        // Group by assigned code letter
        codeLetterKeys.forEach((code, idx) => {
          const grpParts = codeLetterGroups[code]
          const firstWithPos = grpParts.find(p => p.result_position)
          const firstWithGrade = grpParts.find(p => p.performance_grade && p.performance_grade !== 'NONE')

          entries.push({
            id: `${tm.id}_code_${code}`,
            teamId: tm.id,
            teamName: tm.name,
            teamColor: tm.color_hex,
            teamSlug: tm.slug,
            codeLetter: code,
            groupLabel: isTwoGroups ? `${tm.name} (Group ${code})` : `${tm.name} (Code ${code})`,
            participationIds: grpParts.map(p => p.id),
            members: grpParts.map(p => ({
              participationId: p.id,
              studentId: p.student_id,
              name: p.student?.name || 'Unknown',
              chest_no: p.student?.chest_no || '-',
              code_letter: p.code_letter
            })),
            result_position: firstWithPos?.result_position || null,
            performance_grade: firstWithGrade?.performance_grade || null
          })
        })
      }

      // Handle unassigned students (or chunk by group size)
      if (unassigned.length > 0) {
        const chunkSize = config.studentsPerGroup || 2
        for (let i = 0; i < unassigned.length; i += chunkSize) {
          const chunk = unassigned.slice(i, i + chunkSize)
          const grpNum = codeLetterKeys.length + Math.floor(i / chunkSize) + 1
          const firstWithPos = chunk.find(p => p.result_position)
          const firstWithGrade = chunk.find(p => p.performance_grade && p.performance_grade !== 'NONE')

          entries.push({
            id: `${tm.id}_chunk_${grpNum}`,
            teamId: tm.id,
            teamName: tm.name,
            teamColor: tm.color_hex,
            teamSlug: tm.slug,
            codeLetter: null,
            groupLabel: isTwoGroups ? `${tm.name} (Group ${grpNum})` : tm.name,
            participationIds: chunk.map(p => p.id),
            members: chunk.map(p => ({
              participationId: p.id,
              studentId: p.student_id,
              name: p.student?.name || 'Unknown',
              chest_no: p.student?.chest_no || '-',
              code_letter: p.code_letter
            })),
            result_position: firstWithPos?.result_position || null,
            performance_grade: firstWithGrade?.performance_grade || null
          })
        }
      }
    })

    return entries
  }

  // Memoized Group Entries list for rendering
  const groupEntriesList = useMemo(() => {
    if (mode !== 'GROUP') return []
    return buildGroupEntries(participants, selectedEvent, teams)
  }, [mode, participants, selectedEvent, teams])

  // Normalized item list for scoring selection
  const scoringItems = useMemo(() => {
    if (mode === 'GROUP') {
      return groupEntriesList.map(g => ({
        id: g.id,
        isGroup: true,
        groupData: g,
        title: g.groupLabel,
        codeLetter: g.codeLetter ? g.codeLetter.trim().toUpperCase() : null,
        subtitle: g.members.length > 0 
          ? g.members.map(m => `${m.name} (${m.chest_no})`).join(', ')
          : 'No students registered',
        badge: null,
        teamColor: g.teamColor
      }))
    } else {
      return participants.filter(p => p.student).map(p => ({
        id: p.id,
        isGroup: false,
        participantData: p,
        title: p.student?.name || 'Unknown',
        codeLetter: p.code_letter ? p.code_letter.trim().toUpperCase() : null,
        subtitle: p.team?.name || 'Team Entry',
        badge: p.student?.chest_no ? `#${p.student.chest_no}` : null,
        teamColor: p.team?.color_hex
      }))
    }
  }, [mode, groupEntriesList, participants])

  // 3. Logic: Toggle Winner / Update Grade
  const toggleWinner = (pos: 'FIRST' | 'SECOND' | 'THIRD', id: string) => {
    setWinners(prev => {
      const next = { ...prev }
      const currentMap = new Map(next[pos])

      const inFirst = prev.FIRST.has(id) && pos !== 'FIRST'
      const inSecond = prev.SECOND.has(id) && pos !== 'SECOND'
      const inThird = prev.THIRD.has(id) && pos !== 'THIRD'

      if (inFirst || inSecond || inThird) {
        return prev // Prevent same item in multiple winner slots
      }

      if (currentMap.has(id)) {
        currentMap.delete(id)
      } else {
        currentMap.set(id, 'NONE')
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

  const updateWinnerGrade = (pos: 'FIRST' | 'SECOND' | 'THIRD', id: string, grade: string) => {
    setWinners(prev => {
      const next = { ...prev }
      const currentMap = new Map(next[pos])
      if (currentMap.has(id)) currentMap.set(id, grade)
      next[pos] = currentMap
      return next
    })
  }

  const updateOtherGrade = (id: string, grade: string) => {
    if (winners.FIRST.has(id) || winners.SECOND.has(id) || winners.THIRD.has(id)) return

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

  // 4. Save Scores (Guarantees points are added ONCE per group, never multiplied)
  const handleSave = async () => {
    if (!selectedEventId || !selectedEvent) return
    setSaving(true)

    const basePoints = pointsTable[selectedEvent.grade_type || 'A'] || { FIRST: 10, SECOND: 6, THIRD: 3 }
    let hasWinners = false

    try {
      if (mode === 'GROUP') {
        // Group event scoring logic
        const participationUpdates: any[] = []

        groupEntriesList.forEach(grp => {
          let pos: 'FIRST' | 'SECOND' | 'THIRD' | null = null
          let grade: string | null = null

          if (winners.FIRST.has(grp.id)) {
            pos = 'FIRST'
            grade = winners.FIRST.get(grp.id) || 'NONE'
            hasWinners = true
          } else if (winners.SECOND.has(grp.id)) {
            pos = 'SECOND'
            grade = winners.SECOND.get(grp.id) || 'NONE'
            hasWinners = true
          } else if (winners.THIRD.has(grp.id)) {
            pos = 'THIRD'
            grade = winners.THIRD.get(grp.id) || 'NONE'
            hasWinners = true
          } else if (otherGrades.has(grp.id)) {
            pos = null
            grade = otherGrades.get(grp.id) || 'NONE'
          }

          const basePts = pos ? (basePoints[pos] || 0) : 0
          const gradeKey = (grade || 'NONE') as keyof typeof PERF_POINTS
          const gradePts = PERF_POINTS[gradeKey] || 0
          const totalGroupPoints = basePts + gradePts
          const finalPerfGrade = grade === 'NONE' ? null : grade

          // CRITICAL RULE: Assign totalGroupPoints to ONLY 1 student in the group, and 0 to other members
          // so team points are never multiplied by group size!
          if (grp.participationIds.length > 0) {
            grp.participationIds.forEach((pId, idx) => {
              participationUpdates.push({
                id: pId,
                event_id: selectedEventId,
                team_id: grp.teamId,
                result_position: pos,
                performance_grade: finalPerfGrade,
                points_earned: idx === 0 ? totalGroupPoints : 0,
                status: pos ? 'winner' : (finalPerfGrade ? 'completed' : 'registered')
              })
            })
          }
        })

        if (participationUpdates.length > 0) {
          const { error } = await (supabase.from('participations') as any).upsert(participationUpdates)
          if (error) throw error
        }
      } else {
        // Individual event scoring logic
        const updates = participants.filter(p => p.student).map(p => {
          let pos: 'FIRST' | 'SECOND' | 'THIRD' | null = null
          let perf: string | null = null
          let pts = 0

          if (winners.FIRST.has(p.id)) {
            pos = 'FIRST'
            perf = winners.FIRST.get(p.id) || 'NONE'
            hasWinners = true
            const key = (perf || 'NONE') as keyof typeof PERF_POINTS
            pts = (basePoints.FIRST || 10) + (PERF_POINTS[key] || 0)
          } else if (winners.SECOND.has(p.id)) {
            pos = 'SECOND'
            perf = winners.SECOND.get(p.id) || 'NONE'
            hasWinners = true
            const key = (perf || 'NONE') as keyof typeof PERF_POINTS
            pts = (basePoints.SECOND || 6) + (PERF_POINTS[key] || 0)
          } else if (winners.THIRD.has(p.id)) {
            pos = 'THIRD'
            perf = winners.THIRD.get(p.id) || 'NONE'
            hasWinners = true
            const key = (perf || 'NONE') as keyof typeof PERF_POINTS
            pts = (basePoints.THIRD || 3) + (PERF_POINTS[key] || 0)
          } else if (otherGrades.has(p.id)) {
            pos = null
            perf = otherGrades.get(p.id) || 'NONE'
            const key = (perf || 'NONE') as keyof typeof PERF_POINTS
            pts = 0 + (PERF_POINTS[key] || 0)
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
      }

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

  const winnerIds = new Set([
    ...Array.from(winners.FIRST.keys()),
    ...Array.from(winners.SECOND.keys()),
    ...Array.from(winners.THIRD.keys())
  ])

  const otherItems = scoringItems.filter(item => !winnerIds.has(item.id))

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
                      const isGrp = isGroupEvent(event)
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
                          <div className="flex items-center gap-1.5 text-[10px] opacity-70">
                            {isGrp ? (
                              <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <Users className="w-2.5 h-2.5" /> Group
                              </span>
                            ) : (
                              <span className="bg-slate-100 px-1 rounded">Cate {event.grade_type}</span>
                            )}
                            <span className="font-mono text-slate-500">{event.event_code}</span>
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
            <Badge 
              variant={mode === 'GROUP' ? 'default' : 'outline'} 
              className={cn("h-8 px-3 text-xs font-bold gap-1.5", mode === 'GROUP' ? "bg-amber-600 hover:bg-amber-700 text-white" : "")}
            >
              {mode === 'GROUP' ? (
                <>
                  <Users className="w-3.5 h-3.5" /> 
                  Group Event ({eventConfig?.groupType === 'TWO_GROUPS_PER_TEAM' ? '2 Groups/Team' : '1 Group/Team'})
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-primary" /> Individual (Cate {selectedEvent.grade_type})
                </>
              )}
            </Badge>
          </div>
        )}
      </div>

      {/* MAIN SCORING AREA */}
      {selectedEventId && (
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 rounded-lg p-2 md:p-4 space-y-4">
          {/* 1. TOP 3 WINNERS */}
          <div className="grid lg:grid-cols-3 gap-3 md:gap-4">
            {(['FIRST', 'SECOND', 'THIRD'] as const).map(pos => {
              const basePts = pointsTable[selectedEvent?.grade_type || 'A']?.[pos] || 0
              const selectedMap = winners[pos] as Map<string, string>

              const style = {
                FIRST: { border: 'border-yellow-400', icon: 'text-yellow-600', bg: 'bg-yellow-50/30' },
                SECOND: { border: 'border-slate-300', icon: 'text-slate-600', bg: 'bg-slate-50/30' },
                THIRD: { border: 'border-orange-300', icon: 'text-orange-700', bg: 'bg-orange-50/30' }
              }[pos]

              return (
                <Card key={pos} className={cn("border-t-4 shadow-sm flex flex-col h-[420px]", style.border, style.bg)}>
                  <CardHeader className="py-2 px-3 shrink-0 border-b border-border/10 bg-white/50">
                    <div className="flex justify-between items-center">
                      <CardTitle className={cn("flex items-center gap-2 text-sm font-heading", style.icon)}>
                        <Trophy className="w-4 h-4" /> {pos} Place
                      </CardTitle>
                      <Badge variant="secondary" className="font-mono text-[10px] h-5">Base: {basePts} + Grade</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-2 bg-white/60 space-y-2">
                    {scoringItems.map((item) => {
                      const id = item.id
                      const isSelected = selectedMap.has(id)
                      const grade = selectedMap.get(id) || 'NONE'
                      const isAlreadyWinner = winnerIds.has(id) && !isSelected

                      if (isAlreadyWinner) return null

                      return (
                        <div
                          key={id}
                          onClick={() => toggleWinner(pos, id)}
                          className={cn(
                            "p-2.5 rounded-lg border transition-all duration-200 cursor-pointer relative",
                            isSelected 
                              ? "bg-white ring-2 ring-primary border-primary shadow-sm" 
                              : "bg-white border-slate-100 hover:border-primary/30 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn("font-bold text-sm truncate", isSelected ? "text-primary" : "text-slate-800")}>
                                  {item.title}
                                </span>
                                {item.codeLetter && (
                                  <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 shrink-0">
                                    Code: {item.codeLetter}
                                  </span>
                                )}
                                {item.badge && (
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 shrink-0">
                                    {item.badge}
                                  </span>
                                )}
                              </div>

                              <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                {item.subtitle}
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-2 mt-0.5" />}
                          </div>

                          {/* Grade Select Buttons */}
                          {isSelected && (
                            <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 flex items-center justify-between gap-1 animate-in fade-in zoom-in-95 duration-200">
                              <span className="text-[9px] font-bold uppercase text-slate-400">Perf Grade:</span>
                              <div className="flex gap-0.5">
                                {['A+', 'A', 'B', 'C', 'NONE'].map(g => (
                                  <button
                                    key={g}
                                    onClick={(e) => { e.stopPropagation(); updateWinnerGrade(pos, id, g) }}
                                    className={cn(
                                      "text-[9px] min-w-[24px] px-1.5 h-6 rounded flex items-center justify-center font-bold border transition-colors",
                                      grade === g 
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs" 
                                        : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
                                    )}
                                  >
                                    {g}
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

          {/* 2. OTHER PARTICIPANTS / GROUPS (Grades Only) */}
          <Card className="border shadow-sm">
            <CardHeader className="py-2.5 px-4 bg-slate-50 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Performance Grades Only (Non-Winners)
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">Assign A+, A, B, or C grades for grade points</p>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              {otherItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground italic">
                  All {mode === 'GROUP' ? 'groups' : 'participants'} are currently placed in top 3 rankings.
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {otherItems.map(item => {
                    const id = item.id
                    const currentGrade = otherGrades.get(id) || 'NONE'

                    return (
                      <div key={id} className="p-2.5 rounded-lg border border-slate-100 bg-white hover:border-slate-200 flex flex-col justify-between gap-2 shadow-2xs">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-xs text-slate-800 truncate">{item.title}</span>
                              {item.codeLetter && (
                                <span className="font-mono text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-200 shrink-0">
                                  Code: {item.codeLetter}
                                </span>
                              )}
                            </div>
                            {item.badge && (
                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-50">
                          <span className="text-[9px] font-semibold text-slate-400">Grade:</span>
                          <div className="flex gap-0.5">
                            {['A+', 'A', 'B', 'C', 'NONE'].map(g => (
                              <button
                                key={g}
                                onClick={() => updateOtherGrade(id, g)}
                                className={cn(
                                  "text-[9px] min-w-[20px] px-1 h-5 rounded flex items-center justify-center font-bold border transition-colors",
                                  currentGrade === g 
                                    ? "bg-primary text-primary-foreground border-primary" 
                                    : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                                )}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* FOOTER ACTION */}
      {selectedEventId && (
        <div className="flex items-center justify-between pt-2 border-t shrink-0">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Points Rule:</span>
            <span className="font-mono font-bold text-slate-700">
              A+: +7 | A: +5 | B: +3 | C: +1 | None: +0
            </span>
            {mode === 'GROUP' && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                1 Group Score Awarded
              </Badge>
            )}
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 px-6 shadow-md"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Scores</span>
          </Button>
        </div>
      )}
    </div>
  )
}