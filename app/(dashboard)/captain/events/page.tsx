"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
// Assuming types exist as per user request, otherwise we default to any for build safety
// import { Database } from "@/types/database.types"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Check, Search, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// --- TYPES & INTERFACES ---
type Student = { id: string; name: string; section: string; chest_no?: string | null; team_id: string }
type Event = { id: string; name: string; category: string; max_participants_per_team: number; applicable_section: string[] | null }
type Participation = { id: string; student_id: string; event_id: string; team_id: string; created_at: string; status: string }
type Profile = { team_id: string | null }

// --- CONFIGURATION ---
const LIMITS: Record<string, Record<string, number>> = {
  'Senior': { 'ON STAGE': 3, 'OFF STAGE': 3, 'General': 2 },
  'Junior': { 'ON STAGE': 3, 'OFF STAGE': 4, 'General': 2 },
  'Sub-Junior': { 'ON STAGE': 4, 'OFF STAGE': 5, 'General': 2 },
}

const TABS = [
  { id: 'SENIOR_ON', label: 'Senior On-Stage', section: 'Senior', cat: 'ON STAGE' },
  { id: 'SENIOR_OFF', label: 'Senior Off-Stage', section: 'Senior', cat: 'OFF STAGE' },
  { id: 'JUNIOR_ON', label: 'Junior On-Stage', section: 'Junior', cat: 'ON STAGE' },
  { id: 'JUNIOR_OFF', label: 'Junior Off-Stage', section: 'Junior', cat: 'OFF STAGE' },
  { id: 'SUB_ON', label: 'Sub-Jr On-Stage', section: 'Sub-Junior', cat: 'ON STAGE' },
  { id: 'SUB_OFF', label: 'Sub-Jr Off-Stage', section: 'Sub-Junior', cat: 'OFF STAGE' },
  { id: 'GENERAL_ON', label: 'General On-Stage', section: 'General', cat: 'ON STAGE' },
  { id: 'GENERAL_OFF', label: 'General Off-Stage', section: 'General', cat: 'OFF STAGE' },
]

export default function MatrixRegistration() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [teamId, setTeamId] = useState<string | null>(null)

  // Search State
  const [searchQuery, setSearchQuery] = useState("")

  const [students, setStudents] = useState<Student[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabase.from('profiles').select('team_id').eq('id', user.id).single()
        const profile = profileData as unknown as Profile
        if (!profile?.team_id) return
        setTeamId(profile.team_id)

        const [stuRes, evtRes, partRes] = await Promise.all([
          supabase.from('students').select('*').eq('team_id', profile.team_id).order('name'),
          supabase.from('events').select('*').order('name'),
          supabase.from('participations').select('*').eq('team_id', profile.team_id)
        ])

        if (stuRes.data) setStudents(stuRes.data as unknown as Student[])
        if (evtRes.data) setEvents(evtRes.data as unknown as Event[])
        if (partRes.data) setParticipations(partRes.data as unknown as Participation[])

      } catch (e) {
        console.error("Load error", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // --- FILTERING LOGIC ---

  const filteredStudents = useMemo(() => {
    let list = students;
    if (activeTab.section !== 'General') {
        list = list.filter(s => s.section === activeTab.section)
    }
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        list = list.filter(s =>
            s.name.toLowerCase().includes(q) ||
            (s.chest_no && s.chest_no.toLowerCase().includes(q))
        )
    }
    return list
  }, [students, activeTab, searchQuery])

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (e.category !== activeTab.cat) return false
      if (e.applicable_section && e.applicable_section.length > 0) {
        return e.applicable_section.includes(activeTab.section)
      }
      return false
    })
  }, [events, activeTab])

  // --- HELPER: GET LIMIT STATUS ---
  const getStudentLimitStatus = (student: Student) => {
    const isGeneralEvent = activeTab.section === 'General'
    const count = participations.filter(p => {
        const ev = events.find(e => e.id === p.event_id)
        if (!ev) return false
        const pIsGeneral = ev.applicable_section?.includes('General')
        if (isGeneralEvent) {
            return p.student_id === student.id && pIsGeneral
        } else {
            return p.student_id === student.id && !pIsGeneral && ev.category === activeTab.cat
        }
    }).length
    const sectionLimits = LIMITS[student.section] || LIMITS['Senior']
    const limit = isGeneralEvent ? sectionLimits['General'] : sectionLimits[activeTab.cat as keyof typeof sectionLimits]
    return { count, limit, isFull: count >= limit, remaining: limit - count }
  }

  // --- HANDLER ---
  const handleToggle = async (studentId: string, eventId: string, isChecked: boolean) => {
    if (!teamId) return
    if (!isChecked) {
      setParticipations(prev => prev.filter(p => !(p.student_id === studentId && p.event_id === eventId)))
      await supabase.from('participations').delete().match({ student_id: studentId, event_id: eventId, team_id: teamId })
      return
    }
    const student = students.find(s => s.id === studentId)
    const event = events.find(e => e.id === eventId)
    if (!student || !event) return
    const { isFull, limit } = getStudentLimitStatus(student)
    if (isFull) {
      const type = activeTab.section === 'General' ? 'General' : `${activeTab.section} ${activeTab.cat}`
      alert(`Limit Reached! ${student.name} can only do ${limit} ${type} events.`)
      return
    }
    const eventTeamCount = participations.filter(p => p.event_id === eventId).length
    if (eventTeamCount >= event.max_participants_per_team) {
      alert(`Event Full! Only ${event.max_participants_per_team} per team allowed.`)
      return
    }
    const tempId = Math.random().toString()
    const newPart = {
      id: tempId,
      student_id: studentId,
      event_id: eventId,
      team_id: teamId,
      status: 'registered',
      created_at: new Date().toISOString(),
      result_position: null,
      points_earned: 0
    }
    // @ts-ignore
    setParticipations(prev => [...prev, newPart])
    const { data: inserted, error } = await (supabase.from('participations') as any).insert({
      student_id: studentId,
      event_id: eventId,
      team_id: teamId,
      status: 'registered'
    }).select().single()
    if (error) {
       setParticipations(prev => prev.filter(p => p.id !== tempId))
       alert("Error adding: " + error.message)
    } else {
       // @ts-ignore
       setParticipations(prev => prev.map(p => p.id === tempId ? inserted : p))
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>

  return (
    // Replaced max-w-[100vw] with w-full to prevent layout breakage on small screens
    <div className="flex flex-col space-y-4 animate-in fade-in h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] w-full overflow-hidden p-2 md:p-4">

      {/* HEADER SECTION (Responsive Stack) */}
      <div className="flex flex-col gap-4 shrink-0 w-full">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 w-full">
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-tight text-foreground">Registration Matrix</h2>
              <p className="text-muted-foreground text-sm hidden sm:block">Select a category below to check availability and register students.</p>
            </div>

            <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 items-stretch sm:items-center">
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search student..."
                        className="pl-9 bg-card border-input h-10 w-full focus-visible:ring-primary"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Stats Block */}
                <div className="text-right text-xs text-muted-foreground bg-card px-3 py-2 rounded-md border border-border shadow-sm flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2 shrink-0 h-10 sm:h-auto">
                    <p className="font-medium">Students: <span className="text-foreground">{filteredStudents.length}</span></p>
                    <p>Tab: <span className="text-primary font-medium">{activeTab.label}</span></p>
                </div>
            </div>
        </div>

        {/* TABS SCROLLER (Responsive Scroll) */}
        <div className="w-full overflow-x-auto pb-1 -mx-2 px-2 md:mx-0 md:px-0 scrollbar-none">
            <div className="flex gap-1 border-b border-border/60 min-w-max">
                {TABS.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                    "px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all uppercase tracking-wide",
                    activeTab.id === tab.id
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    {tab.label.replace('On-Stage', 'On').replace('Off-Stage', 'Off')}
                </button>
                ))}
            </div>
        </div>
      </div>

      {/* THE MATRIX (Responsive Container) */}
      <div className="flex-1 border border-border/60 rounded-xl bg-card relative shadow-sm w-full overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto h-full w-full scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <table className="w-full border-collapse text-sm">

            {/* STICKY HEADER */}
            <thead className="sticky top-0 z-20 shadow-sm bg-white">
                <tr>
                {/* TOP LEFT CORNER (Sticky X & Y) */}
                <th className="p-3 text-left font-bold sticky left-0 top-0 z-30 bg-white border-r border-b border-border w-[140px] sm:w-60 min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm sm:text-base text-foreground">Student Name</span>
                        <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-wider hidden sm:block">
                            {activeTab.section === 'General' ? 'All Students' : `${activeTab.section} Only`}
                        </span>
                    </div>
                </th>

                {/* EVENT HEADERS */}
                {filteredEvents.map(event => {
                    const count = participations.filter(p => p.event_id === event.id).length
                    const limit = event.max_participants_per_team
                    const isFull = count >= limit

                    return (
                    <th key={event.id} className="p-1 sm:p-2 border-l border-b border-border min-w-[60px] sm:min-w-20 h-40 sm:h-[180px] align-bottom transition-colors relative group bg-white">
                        <div className="flex flex-col items-center justify-end h-full w-full pb-2 sm:pb-3 gap-2 sm:gap-3">
                            <div className={cn(
                                "text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-full border shadow-sm",
                                isFull
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : "bg-muted text-muted-foreground border-border"
                            )}>
                                {count}/{limit}
                            </div>
                            <div
                              className="text-[10px] sm:text-xs font-semibold whitespace-nowrap tracking-wide text-foreground/80"
                              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            >
                                {event.name}
                            </div>
                        </div>
                    </th>
                    )
                })}
                </tr>
            </thead>
            <tbody>
                {filteredStudents.map((student, idx) => {
                const { isFull, remaining } = getStudentLimitStatus(student)

                return (
                    <tr key={student.id} className={cn("group border-b border-border transition-colors", idx % 2 === 0 ? "bg-white" : "bg-white")}>
                    {/* STUDENT NAME ROW (Sticky Left) */}
                    <td className={cn(
                        "p-2 sm:p-3 border-r border-border sticky left-0 z-10 transition-colors border-b",
                        idx % 2 === 0 ? "bg-white" : "bg-white" // Match row background to prevent transparency glitch
                    )}>
                        <div className="flex flex-col gap-1 relative z-10">
                            <div className="font-semibold text-foreground text-xs sm:text-sm truncate max-w-[110px] sm:max-w-none">{student.name}</div>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] text-muted-foreground font-mono">
                                <span className="bg-muted px-1 py-0.5 rounded border border-border">{student.chest_no || '-'}</span>
                                <span className="hidden sm:inline">{student.section}</span>
                            </div>
                            <div className="mt-0.5 sm:mt-1">
                                <Badge variant="outline" className={cn(
                                    "text-[9px] h-4 px-1 pointer-events-none",
                                    isFull
                                      ? "bg-destructive/10 text-destructive border-destructive/20"
                                      : "bg-background text-muted-foreground border-border"
                                )}>
                                    {isFull ? "Maxed" : `${remaining} left`}
                                </Badge>
                            </div>
                        </div>
                        {/* Shadow to separate sticky column */}
                        <div className="absolute inset-y-0 right-0 w-px shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] pointer-events-none" />
                    </td>

                    {/* CHECKBOXES */}
                    {filteredEvents.map(event => {
                        const isRegistered = participations.some(p => p.student_id === student.id && p.event_id === event.id)
                        const eventCount = participations.filter(p => p.event_id === event.id).length
                        const isEventFull = eventCount >= event.max_participants_per_team
                        const isDisabled = !isRegistered && (isFull || isEventFull)

                        return (
                        <td key={`${student.id}-${event.id}`} className="border-l border-b border-border p-0 relative align-middle bg-inherit">
                            <label className={cn(
                                "absolute inset-0 flex items-center justify-center cursor-pointer transition-colors",
                                isDisabled ? "bg-muted/50 cursor-not-allowed opacity-50" : "hover:bg-primary/5"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={isRegistered}
                                    disabled={isDisabled}
                                    onChange={(e) => handleToggle(student.id, event.id, e.target.checked)}
                                    className="peer sr-only"
                                />
                                <div className={cn(
                                    "w-4 h-4 sm:w-5 sm:h-5 rounded border flex items-center justify-center transition-all shadow-sm",
                                    isRegistered
                                        ? "bg-primary border-primary text-primary-foreground scale-110"
                                        : "bg-card border-muted-foreground/30 text-transparent",
                                    isDisabled && !isRegistered && "opacity-20 bg-muted"
                                )}>
                                    <Check className="w-3 h-3" strokeWidth={3} />
                                </div>
                            </label>
                        </td>
                        )
                    })}
                    </tr>
                )
                })}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}