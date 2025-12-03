"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import {
  Card, CardContent
} from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { Loader2, UserX, Filter, FileText, Search, Printer, Layers, Mic, Music } from "lucide-react"
import { cn } from "@/lib/utils"

// --- TYPES ---
interface Team { id: string; name: string; color_hex: string }
interface Event { id: string; name: string; event_code: string; category: string }

interface StudentWithData {
  id: string
  name: string
  chest_no: string | null
  class_grade: string | null
  section: string
  team_id: string
  teams: { name: string; color_hex: string }
  participations: {
    events: { category: string }
  }[]
}

interface EventParticipant {
  id: string
  student: {
    name: string
    chest_no: string
    class_grade: string
    section: string
    team: { name: string; color_hex: string }
  }
  status: string
}

export default function AdminReports() {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [events, setEvents] = useState<Event[]>([])

  // Data Stores
  const [allStudents, setAllStudents] = useState<StudentWithData[]>([])
  const [eventParticipants, setEventParticipants] = useState<EventParticipant[]>([])

  // Filter States
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [loadingEvent, setLoadingEvent] = useState(false)

  const supabase = createClient()

  // 1. Initial Data Load
  useEffect(() => {
    async function loadBaseData() {
      try {
        setLoading(true)

        // Fetch Teams
        const { data: teamsData } = await supabase.from('teams').select('*').order('name')
        if (teamsData) setTeams(teamsData as any)

        // Fetch Events (for dropdowns)
        const { data: eventsData } = await supabase.from('events').select('*').order('name')
        if (eventsData) setEvents(eventsData as any)

        // Fetch All Students
        const { data: studentsData, error } = await supabase
          .from('students')
          .select(`
            *,
            teams ( name, color_hex ),
            participations (
              events ( category )
            )
          `)
          .order('name')

        if (error) throw error
        setAllStudents(studentsData as any)

      } catch (err) {
        console.error("Error loading reports data:", err)
      } finally {
        setLoading(false)
      }
    }
    loadBaseData()
  }, [])

  // 2. Fetch Specific Event Participants
  useEffect(() => {
    if (!selectedEventId) {
      setEventParticipants([])
      return
    }

    async function loadEventData() {
      setLoadingEvent(true)
      const { data } = await supabase
        .from('participations')
        .select(`
          id,
          status,
          students!inner ( name, chest_no, class_grade, section, team:teams(name, color_hex) )
        `)
        .eq('event_id', selectedEventId)
        .order('created_at', { ascending: true })

      if (data) {
        const formatted = data.map((p: any) => ({
          id: p.id,
          status: p.status,
          student: {
            name: p.students.name,
            chest_no: p.students.chest_no || 'N/A',
            class_grade: p.students.class_grade || '-',
            section: p.students.section,
            team: p.students.team
          }
        }))
        // Numeric sort by Chest No
        formatted.sort((a: any, b: any) => {
           const chestA = parseInt(a.student.chest_no) || 99999
           const chestB = parseInt(b.student.chest_no) || 99999
           return chestA - chestB
        })
        setEventParticipants(formatted)
      }
      setLoadingEvent(false)
    }
    loadEventData()
  }, [selectedEventId])

  // --- COMPUTED LISTS ---

  // Filter 1: Zero Participations
  const zeroParticipationList = useMemo(() => {
    return allStudents.filter(s => {
      const isTeamMatch = selectedTeam === "all" || s.team_id === selectedTeam
      const isZero = s.participations.length === 0
      const isSearchMatch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (s.chest_no && s.chest_no.includes(searchQuery))
      return isTeamMatch && isZero && isSearchMatch
    })
  }, [allStudents, selectedTeam, searchQuery])

  // Filter 2: Single Section Analysis
  const getSectionExclusiveList = (category: string) => {
    return allStudents.filter(s => {
      if (s.participations.length === 0) return false

      const isTeamMatch = selectedTeam === "all" || s.team_id === selectedTeam
      const isSearchMatch = s.name.toLowerCase().includes(searchQuery.toLowerCase())

      // @ts-ignore
      const allMatch = s.participations.every(p => p.events?.category === category)

      return isTeamMatch && isSearchMatch && allMatch
    })
  }

  // Filter 3: Event Participants
  const filteredEventParticipants = useMemo(() => {
    return eventParticipants.filter(p => {
      const isSearchMatch = p.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.student.chest_no.includes(searchQuery)
      return isSearchMatch
    })
  }, [eventParticipants, searchQuery])

  if (loading) return (
    <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4 animate-in fade-in duration-500 pb-2">

      {/* HEADER SECTION */}
      <div className="shrink-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">Reports & Analysis</h2>
          <p className="text-muted-foreground text-sm">Deep dive into participation metrics and generate lists.</p>
        </div>

        {/* GLOBAL FILTERS CARD */}
        <Card className="glass-card border-border/50 shadow-sm w-full lg:w-auto">
            <CardContent className="p-2 flex flex-col sm:flex-row gap-2">
                <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search students..."
                        className="pl-9 bg-background/50 border-border focus-visible:ring-primary h-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-border h-9">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Filter className="w-3.5 h-3.5" />
                            <SelectValue placeholder="All Teams" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {teams.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>
      </div>

      {/* TABS CONTAINER */}
      <Tabs defaultValue="zero" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 mb-4">
            <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 border border-border/50 rounded-lg overflow-x-auto">
            <TabsTrigger
                value="zero"
                className="py-2 px-4 rounded-md data-[state=active]:bg-background data-[state=active]:text-destructive data-[state=active]:shadow-sm transition-all"
            >
                <UserX className="w-4 h-4 mr-2" /> Zero Participation
            </TabsTrigger>
            <TabsTrigger
                value="section"
                className="py-2 px-4 rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
                <Layers className="w-4 h-4 mr-2" /> Section Exclusive
            </TabsTrigger>
            <TabsTrigger
                value="event"
                className="py-2 px-4 rounded-md data-[state=active]:bg-background data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-sm transition-all"
            >
                <FileText className="w-4 h-4 mr-2" /> Event Call Sheet
            </TabsTrigger>
            </TabsList>
        </div>

        <div className="flex-1 glass-card border border-border/50 rounded-xl shadow-sm overflow-hidden flex flex-col relative bg-card/50">

          {/* TAB 1: ZERO PARTICIPATION */}
          <TabsContent value="zero" className="m-0 h-full flex flex-col">
            {/* Sticky Header Row within Tab */}
            <div className="shrink-0 p-4 border-b border-border/50 bg-destructive/5 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-3 text-destructive">
                    <div className="p-2 bg-destructive/10 rounded-full"><UserX className="w-4 h-4" /></div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">Inactive Students</span>
                        <span className="text-xs text-destructive/70">Students with 0 registered events</span>
                    </div>
                </div>
                <Badge variant="destructive" className="text-sm px-3 py-0.5">{zeroParticipationList.length}</Badge>
            </div>

            {/* Scrollable Table Area */}
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                        <TableRow className="hover:bg-transparent border-border/50">
                            <TableHead className="w-[100px] font-mono text-xs">Chest No</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead>Team</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {zeroParticipationList.map(s => (
                            <TableRow key={s.id} className="hover:bg-muted/30 border-border/50">
                                <TableCell className="font-mono font-medium text-muted-foreground">{s.chest_no || '-'}</TableCell>
                                <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                                <TableCell className="text-muted-foreground">{s.class_grade}</TableCell>
                                <TableCell><Badge variant="secondary" className="font-normal bg-muted border-border/50">{s.section}</Badge></TableCell>
                                <TableCell>
                                    <Badge variant="outline" style={{
                                        borderColor: s.teams.color_hex + '50',
                                        color: s.teams.color_hex,
                                        backgroundColor: s.teams.color_hex + '10'
                                    }}>
                                        {s.teams.name}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {zeroParticipationList.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Great job! Every student is participating.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
          </TabsContent>

          {/* TAB 2: SECTION EXCLUSIVE */}
          <TabsContent value="section" className="m-0 h-full flex flex-col">
             <div className="grid grid-cols-1 lg:grid-cols-2 h-full divide-y lg:divide-y-0 lg:divide-x divide-border/50">
                {/* LEFT: ONLY OFF STAGE */}
                <div className="flex flex-col h-full overflow-hidden bg-background/30">
                    <div className="shrink-0 p-3 border-b border-border/50 flex justify-between items-center sticky top-0 z-10 bg-card/80 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <Music className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold text-foreground text-sm">Only OFF STAGE</span>
                        </div>
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                            {getSectionExclusiveList('OFF STAGE').length}
                        </Badge>
                    </div>
                    <div className="overflow-auto flex-1 p-0">
                        <SimpleStudentTable students={getSectionExclusiveList('OFF STAGE')} />
                    </div>
                </div>

                {/* RIGHT: ONLY ON STAGE */}
                <div className="flex flex-col h-full overflow-hidden bg-background/30">
                    <div className="shrink-0 p-3 border-b border-border/50 flex justify-between items-center sticky top-0 z-10 bg-card/80 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <Mic className="w-4 h-4 text-orange-500" />
                            <span className="font-semibold text-foreground text-sm">Only ON STAGE</span>
                        </div>
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                            {getSectionExclusiveList('ON STAGE').length}
                        </Badge>
                    </div>
                    <div className="overflow-auto flex-1 p-0">
                        <SimpleStudentTable students={getSectionExclusiveList('ON STAGE')} />
                    </div>
                </div>
             </div>
          </TabsContent>

          {/* TAB 3: EVENT CALL SHEET */}
          <TabsContent value="event" className="m-0 h-full flex flex-col">
             {/* Toolbar */}
             <div className="shrink-0 p-4 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row gap-4 justify-between items-end">
                <div className="w-full sm:w-[320px] space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Event Sheet</label>
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                        <SelectTrigger className="w-full bg-background border-border h-10 shadow-sm">
                            <SelectValue placeholder="Choose an event to view..." />
                        </SelectTrigger>
                        <SelectContent>
                            {events.map(e => (
                                <SelectItem key={e.id} value={e.id}>
                                    <span className="font-medium">{e.name}</span>
                                    <span className="ml-2 text-xs text-muted-foreground font-mono border border-border px-1 rounded">{e.event_code || '---'}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedEventId && (
                    <Button variant="outline" className="gap-2 bg-background border-border hover:bg-muted" onClick={() => window.print()}>
                        <Printer className="w-4 h-4 text-muted-foreground" />
                        <span>Print Call Sheet</span>
                    </Button>
                )}
             </div>

             {/* Content Area */}
             <div className="flex-1 overflow-auto bg-card relative">
                {!selectedEventId ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50">
                        <div className="p-6 rounded-full bg-muted/30 mb-4">
                            <FileText className="w-10 h-10" />
                        </div>
                        <p className="font-medium">Select an event above to generate the list</p>
                    </div>
                ) : loadingEvent ? (
                    <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-20 shadow-sm border-b border-border/50 backdrop-blur-sm">
                            <TableRow className="hover:bg-transparent border-border/50">
                                <TableHead className="w-[100px] font-bold text-foreground">Chest No</TableHead>
                                <TableHead className="font-bold text-foreground">Student Name</TableHead>
                                <TableHead className="font-bold text-foreground">Class</TableHead>
                                <TableHead className="font-bold text-foreground">Team</TableHead>
                                <TableHead className="font-bold text-foreground">Status</TableHead>
                                <TableHead className="w-[150px] text-right font-bold text-foreground">Signature / Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEventParticipants.map((p, idx) => (
                                <TableRow key={p.id} className={cn("hover:bg-muted/30 border-border/50 transition-colors", idx % 2 === 0 ? "bg-card" : "bg-muted/10")}>
                                    <TableCell className="font-bold font-mono text-base text-foreground/80 bg-muted/20 border-r border-border/50">{p.student.chest_no}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-foreground">{p.student.name}</div>
                                        <div className="text-xs text-muted-foreground">{p.student.section}</div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{p.student.class_grade}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.student.team.color_hex }}></div>
                                            <span className="font-medium text-sm text-foreground/80">{p.student.team.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full",
                                            p.status === 'registered' ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-muted text-muted-foreground"
                                        )}>
                                            {p.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="border-l border-dashed border-border">
                                        <div className="h-8 border-b border-border/50 w-full"></div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredEventParticipants.length === 0 && (
                                <TableRow><TableCell colSpan={6} className="text-center py-16 text-muted-foreground italic">No participants found for this event.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
             </div>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  )
}

// Simple Sub-component for Section Lists
function SimpleStudentTable({ students }: { students: StudentWithData[] }) {
    if (students.length === 0) return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm italic">
            <UserX className="w-8 h-8 opacity-20 mb-2" />
            No students found in this category.
        </div>
    )
    return (
        <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm border-b border-border/50 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="w-[60%]">Name</TableHead>
                    <TableHead>Team</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {students.map(s => (
                    <TableRow key={s.id} className="hover:bg-muted/30 border-b border-border/50 last:border-0">
                        <TableCell>
                            <div className="font-medium text-sm text-foreground">{s.name}</div>
                            <div className="text-xs text-muted-foreground flex gap-1 items-center mt-0.5">
                                <span className="font-mono bg-muted px-1 rounded">{s.chest_no || '?'}</span>
                                <span>• Class {s.class_grade}</span>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" style={{ color: s.teams.color_hex, borderColor: s.teams.color_hex + '40', backgroundColor: s.teams.color_hex + '10' }}>
                                {s.teams.name}
                            </Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}