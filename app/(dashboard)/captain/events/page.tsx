"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Check, Search, Info, Lock, ChevronDown, X, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

// --- TYPES ---
interface Student {
  id: string
  name: string
  section: string
  chest_no: string | null
  team_id: string
}

interface Event {
  id: string
  name: string
  category: string
  max_participants_per_team: number
  applicable_section: string[] | null
}

interface Participation {
  id: string
  student_id: string
  event_id: string
  team_id: string
  status: string
}

interface Profile {
  team_id: string | null
}

interface Team {
  id: string
  access_override: boolean | null
}

interface AppConfig {
  registration_open: boolean
}

interface SectionLimit {
  section: string
  category: string
  limit_count: number
}

// Updated Tabs Configuration
const TABS = [
  { id: 'ALIYA_ON', label: 'Aliya On-Stage', section: 'Aliya', cat: 'ON STAGE' },
  { id: 'ALIYA_OFF', label: 'Aliya Off-Stage', section: 'Aliya', cat: 'OFF STAGE' },
  { id: 'FOUNDATION_ON', label: 'Foundation On-Stage', section: 'Foundation', cat: 'ON STAGE' },
  { id: 'FOUNDATION_OFF', label: 'Foundation Off-Stage', section: 'Foundation', cat: 'OFF STAGE' },
  { id: 'GENERAL_ON', label: 'General On-Stage', section: 'General', cat: 'ON STAGE' },
  { id: 'GENERAL_OFF', label: 'General Off-Stage', section: 'General', cat: 'OFF STAGE' },
  { id: 'FDN_GENERAL_ON', label: 'Fdn General On-Stage', section: 'Foundation General', cat: 'ON STAGE' },
  { id: 'FDN_GENERAL_OFF', label: 'Fdn General Off-Stage', section: 'Foundation General', cat: 'OFF STAGE' },
]

export default function MatrixRegistration() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [teamId, setTeamId] = useState<string | null>(null)

  // Mobile scroll collapse state
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollTop = useRef(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [isLocked, setIsLocked] = useState(false)
  const [lockReason, setLockReason] = useState("")
  // Data State
  const [students, setStudents] = useState<Student[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [limits, setLimits] = useState<SectionLimit[]>([])

  // Search
  const [searchQuery, setSearchQuery] = useState("")

  const supabase = createClient()

  // Scroll listener for collapsing header on mobile
  const handleMatrixScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop
    const delta = currentScrollTop - lastScrollTop.current

    if (currentScrollTop <= 15) {
      setHeaderVisible(true)
    } else if (delta > 8 && currentScrollTop > 30) {
      setHeaderVisible(false)
    } else if (delta < -6) {
      setHeaderVisible(true)
    }

    lastScrollTop.current = currentScrollTop
  }

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

        // Fetch All Data needed for the matrix
        const [stuRes, evtRes, partRes, limitRes, configRes, teamRes] = await Promise.all([
          supabase.from('students').select('*').eq('team_id', profile.team_id).order('name'),
          supabase.from('events').select('*').order('name'),
          supabase.from('participations').select('*').eq('team_id', profile.team_id),
          supabase.from('section_limits').select('*'),
          supabase.from('app_config').select('*').single(),
          supabase.from('teams').select('access_override').eq('id', profile.team_id).single()
        ])

        if (stuRes.data) setStudents(stuRes.data as unknown as Student[])
        if (evtRes.data) setEvents(evtRes.data as unknown as Event[])
        if (partRes.data) setParticipations(partRes.data as unknown as Participation[])
        if (limitRes.data) setLimits(limitRes.data as unknown as SectionLimit[])

        // CHECK LOCK STATUS
        const config = configRes.data as unknown as AppConfig
        const team = teamRes.data as unknown as Team

        const globalOpen = config?.registration_open ?? false
        const teamOverride = team?.access_override

        // Logic: Override takes precedence. If null, use global.
        let access = false
        if (teamOverride === true) access = true // Force Open
        else if (teamOverride === false) access = false // Force Closed
        else access = globalOpen // Follow Global

        if (!access) {
          setIsLocked(true)
          setLockReason(teamOverride === false ? "Your team's registration has been locked by Admin." : "Registration is currently closed.")
        } else {
          setIsLocked(false)
        }

      } catch (e) {
        console.error("Load error", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // --- 1. FILTER STUDENTS BASED ON TAB ---
  const eligibleStudents = useMemo(() => {
    let list = students
    if (activeTab.section === 'General') {
      return list.filter(s => s.section === 'Aliya')
    } else if (activeTab.section === 'Foundation General') {
      return list.filter(s => s.section === 'Foundation')
    } else {
      return list.filter(s => s.section === activeTab.section)
    }
  }, [students, activeTab])

  const filteredStudents = useMemo(() => {
    let list = eligibleStudents

    const rawQuery = searchQuery.trim().toLowerCase()
    if (!rawQuery) return list

    // Normalize query tokens (e.g. "Adil 103" matches student name "Adil" with chest "103")
    const tokens = rawQuery.replace(/#/g, '').split(/\s+/).filter(Boolean)

    return list.filter(s => {
      const nameLower = s.name.toLowerCase()
      const chestLower = (s.chest_no || '').toLowerCase().replace(/#/g, '')
      const sectionLower = (s.section || '').toLowerCase()

      // Every token typed by user must match either name, chest no, or section
      return tokens.every(token =>
        nameLower.includes(token) ||
        chestLower.includes(token) ||
        sectionLower.includes(token)
      )
    })
  }, [eligibleStudents, searchQuery])

  // --- 1B. FIND STUDENTS MATCHING IN OTHER CATEGORIES (Helper for fast search navigation) ---
  const otherTabMatches = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase()
    if (!rawQuery || filteredStudents.length > 0) return []

    const tokens = rawQuery.replace(/#/g, '').split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return []

    const matches: { student: Student; tab: typeof TABS[0] }[] = []

    students.forEach(s => {
      const nameLower = s.name.toLowerCase()
      const chestLower = (s.chest_no || '').toLowerCase().replace(/#/g, '')
      const sectionLower = (s.section || '').toLowerCase()

      const isMatch = tokens.every(token =>
        nameLower.includes(token) ||
        chestLower.includes(token) ||
        sectionLower.includes(token)
      )

      if (isMatch) {
        TABS.forEach(tab => {
          let isEligible = false
          if (tab.section === 'General' && s.section === 'Aliya') isEligible = true
          else if (tab.section === 'Foundation General' && s.section === 'Foundation') isEligible = true
          else if (tab.section === s.section) isEligible = true

          if (isEligible && tab.id !== activeTab.id) {
            if (!matches.some(m => m.student.id === s.id && m.tab.id === tab.id)) {
              matches.push({ student: s, tab })
            }
          }
        })
      }
    })

    return matches
  }, [searchQuery, filteredStudents.length, students, activeTab.id])

  // --- 2. FILTER EVENTS BASED ON TAB ---
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // 1. Category Match (On/Off)
      if (e.category !== activeTab.cat) return false

      // 2. Section Match
      if (!e.applicable_section || e.applicable_section.length === 0) return false

      // Check strict inclusion of the tab's section
      return e.applicable_section.includes(activeTab.section)
    })
  }, [events, activeTab])

  // --- 3. DYNAMIC LIMIT CHECKER ---
  const getLimitStatus = (student: Student) => {
    // Determine the rule key based on the Tab, NOT just student section
    let ruleSection = activeTab.section

    // Find limit in DB array
    const limitRule = limits.find(l => l.section === ruleSection && l.category === activeTab.cat)
    const limit = limitRule ? limitRule.limit_count : 100 // Default to 100 if not found (Unlimited)

    // Count participations for this student in this specific Context (Tab)
    const count = participations.filter(p => {
      const ev = events.find(e => e.id === p.event_id)
      if (!ev) return false

      // Does this event belong to the current Tab's section definition?
      const isTabSectionEvent = ev.applicable_section?.includes(activeTab.section)

      return p.student_id === student.id &&
        isTabSectionEvent &&
        ev.category === activeTab.cat
    }).length

    return { count, limit, isFull: count >= limit, remaining: limit - count }
  }

  // --- 4. TOGGLE HANDLER ---
  const handleToggle = async (studentId: string, eventId: string, isChecked: boolean) => {
    if (!teamId) return

    if (isLocked) {
      alert(`Action Blocked: ${lockReason}`)
      return
    }

    // REMOVE
    if (!isChecked) {
      setParticipations(prev => prev.filter(p => !(p.student_id === studentId && p.event_id === eventId)))
      await supabase.from('participations').delete().match({ student_id: studentId, event_id: eventId, team_id: teamId })
      return
    }

    // ADD
    const student = students.find(s => s.id === studentId)
    const event = events.find(e => e.id === eventId)
    if (!student || !event) return

    // Limit Checks
    const { isFull, limit } = getLimitStatus(student)

    if (isFull) {
      alert(`Limit Reached! Maximum ${limit} events allowed for ${activeTab.section} ${activeTab.cat}.`)
      return
    }

    const eventTeamCount = participations.filter(p => p.event_id === eventId).length
    if (eventTeamCount >= event.max_participants_per_team) {
      alert(`Event Limit Reached! Max ${event.max_participants_per_team} participants allowed.`)
      // Proceed anyway if it's not a hard block
    }

    // Optimistic Update
    const tempId = Math.random().toString()
    const newPart = {
      id: tempId,
      student_id: studentId,
      event_id: eventId,
      team_id: teamId,
      status: 'registered',
      created_at: new Date().toISOString()
    } as any

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
      setParticipations(prev => prev.map(p => p.id === tempId ? inserted : p))
    }
  }

  // Helper for Cell Colors
  const getCellColor = (isRegistered: boolean, isDisabled: boolean) => {
    if (isRegistered) return "bg-orange-500 text-white border-orange-600" // Started/Active
    if (isDisabled) return "bg-slate-100 opacity-50 cursor-not-allowed" // Disabled
    return "bg-white border-slate-200 hover:bg-slate-50" // Empty/Available
  }

  const getLimitBadgeColor = (isFull: boolean) => {
    return isFull
      ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600" // Green for Limit Reached
      : "bg-white text-slate-500 border-slate-200"
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="flex flex-col space-y-1.5 sm:space-y-2 animate-in fade-in h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] w-full overflow-hidden p-1.5 sm:p-2 md:p-3">
      {isLocked && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-medium animate-in slide-in-from-top-2 shrink-0">
          <Lock className="w-4 h-4" />
          {lockReason}
        </div>
      )}

      {/* COLLAPSIBLE HEADER (Collapses on scroll down on mobile & laptop, shows on scroll up) */}
      <div className={cn(
        "flex flex-col gap-1.5 shrink-0 w-full transition-all duration-300 ease-in-out origin-top",
        headerVisible
          ? "max-h-[160px] opacity-100 translate-y-0"
          : "max-h-0 opacity-0 -translate-y-2 overflow-hidden pointer-events-none"
      )}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-2 w-full">
          <div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-900">Registration Matrix</h2>
            <p className="text-slate-500 text-[10.5px] sm:text-xs hidden sm:block">Select category to register students. Green indicates limit reached.</p>
          </div>

          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-1.5 sm:gap-2 items-stretch sm:items-center">
            <div className="relative w-full sm:w-60 md:w-68">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <Input
                ref={searchInputRef}
                placeholder="Search by name, chest no..."
                className="pl-8 pr-7 bg-white shadow-xs h-7.5 sm:h-8 w-full border-slate-300 text-xs rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("")
                    searchInputRef.current?.focus()
                  }}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-right text-xs text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs shrink-0 h-7.5 sm:h-8 flex items-center justify-center">
              <span className="font-semibold text-slate-900 mr-1">{filteredStudents.length}</span>
              {searchQuery.trim() && <span className="text-slate-400 mr-1">/ {eligibleStudents.length}</span>}
              Students
            </div>
          </div>
        </div>
      </div>

      {/* COMPACT RESTORE PILL (Shown when collapsed on mobile & laptop) */}
      {!headerVisible && (
        <div
          onClick={() => {
            setHeaderVisible(true)
            setTimeout(() => searchInputRef.current?.focus(), 120)
          }}
          className="flex items-center justify-between px-2.5 py-1 bg-slate-900 text-white rounded-md text-[11px] shadow-sm animate-in slide-in-from-top-1 duration-200 cursor-pointer shrink-0 hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold truncate">{activeTab.label}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 text-[10.5px]">
              {filteredStudents.length} {searchQuery.trim() ? "found" : "students"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-blue-300 bg-blue-950/60 border border-blue-700/60 px-2 py-0.5 rounded shrink-0">
            <Search className="w-3 h-3" />
            <span>Search / Expand</span>
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>
      )}

      {/* TABS SCROLLER */}
      <div className="w-full overflow-x-auto pb-0.5 -mx-1 px-1 md:mx-0 md:px-0 scrollbar-none shrink-0">
        <div className="flex gap-1 border-b border-slate-200 min-w-max pb-0.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-semibold border-b-2 whitespace-nowrap transition-all uppercase tracking-wide shrink-0",
                activeTab.id === tab.id
                  ? "border-primary text-primary bg-primary/5 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {tab.label.replace('On-Stage', 'On').replace('Off-Stage', 'Off')}
            </button>
          ))}
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div className={cn(
        "flex-1 border border-slate-200 rounded-xl bg-white relative shadow-sm w-full overflow-hidden flex flex-col min-h-0",
        isLocked && "opacity-75 pointer-events-none grayscale"
      )}>
        {filteredStudents.length === 0 ? (
          otherTabMatches.length > 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-6 text-center animate-in fade-in duration-200">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
                <Search className="w-5 h-5" />
              </div>
              <p className="font-bold text-slate-800 text-sm">
                Student Found in Other Categories
              </p>
              <p className="text-xs text-slate-500 mt-0.5 mb-3 leading-relaxed">
                "{searchQuery}" is not in <strong className="text-slate-700">{activeTab.label}</strong>, but was found here:
              </p>
              <div className="flex flex-col gap-1.5 w-full max-h-48 overflow-y-auto pr-0.5 scrollbar-thin">
                {otherTabMatches.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(m.tab)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 transition-all text-left text-xs group"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900 group-hover:text-blue-700 block truncate">
                        {m.student.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Chest #{m.student.chest_no || "—"} • {m.student.section}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 shrink-0 ml-2">
                      <span>Switch to {m.tab.label.replace('On-Stage', 'On').replace('Off-Stage', 'Off')}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setSearchQuery("")
                  searchInputRef.current?.focus()
                }}
                className="mt-3.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
              <Search className="w-10 h-10 mb-2 opacity-25" />
              <p className="font-semibold text-slate-700 text-sm">
                {searchQuery.trim() ? `No students matching "${searchQuery}"` : "No students in this category"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {searchQuery.trim() ? "Try searching by a different name, word, or chest number." : "Choose another category tab."}
              </p>
              {searchQuery.trim() && (
                <button
                  onClick={() => {
                    setSearchQuery("")
                    searchInputRef.current?.focus()
                  }}
                  className="mt-3 px-3 py-1 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
            <Info className="w-10 h-10 mb-2 opacity-25" />
            <p>No programmes available for this category.</p>
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            onScroll={handleMatrixScroll}
            className="overflow-auto h-full w-full scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
          >
            <table className="w-full border-collapse text-sm bg-white">
              <thead className="sticky top-0 z-30 shadow-xs bg-white">
                <tr>
                  {/* STICKY CORNER (Top-Left) */}
                  <th className="p-1.5 sm:p-2 md:p-2.5 text-left font-bold sticky left-0 top-0 z-40 bg-white border-r border-b border-slate-200 w-[120px] sm:w-52 md:w-56 lg:w-60 min-w-[120px] sm:min-w-[180px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs sm:text-sm md:text-base text-slate-900 font-bold">Student Name</span>
                      <span className="text-[9.5px] font-normal text-slate-500 uppercase tracking-wider hidden sm:block">
                        {activeTab.section} • {activeTab.cat}
                      </span>
                    </div>
                  </th>

                  {/* EVENT COLUMNS (Sticky Top) */}
                  {filteredEvents.map(event => {
                    const count = participations.filter(p => p.event_id === event.id).length
                    const limit = event.max_participants_per_team
                    const isFull = count >= limit

                    return (
                      <th
                        key={event.id}
                        title={`${event.name} (${event.category} - ${count}/${limit} registered)`}
                        className="p-0.5 sm:p-1 border-l border-b border-slate-200 min-w-[44px] sm:min-w-14 md:min-w-[50px] lg:min-w-[56px] h-20 sm:h-22 md:h-24 max-h-[96px] align-bottom transition-colors relative group bg-white sticky top-0 z-30 hover:bg-slate-50/80"
                      >
                        <div className="flex flex-col items-center justify-end h-full w-full pb-1 sm:pb-1.5 gap-1">
                          <Badge className={cn("text-[8.5px] sm:text-[9px] h-4 px-1 pointer-events-none border font-mono shadow-2xs", getLimitBadgeColor(isFull))}>
                            {count}/{limit}
                          </Badge>
                          <div
                            className="text-[9.5px] sm:text-[10px] md:text-[11px] font-semibold whitespace-nowrap tracking-wide text-slate-700 group-hover:text-slate-900 transition-colors"
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
                {filteredStudents.map((student) => {
                  const { isFull, remaining } = getLimitStatus(student)

                  return (
                    <tr key={student.id} className="group border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      {/* ROW HEADER (Sticky Left) */}
                      <td className="p-2 sm:p-3 md:p-3.5 border-r border-slate-200 sticky left-0 z-20 bg-white group-hover:bg-slate-50/90 transition-colors border-b shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)]">
                        <div className="flex flex-col gap-0.5 relative z-10">
                          <div className="font-semibold text-slate-900 text-xs sm:text-sm truncate max-w-[105px] sm:max-w-none">{student.name}</div>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[10px] text-slate-500 font-mono">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[9px] sm:text-[10px] font-medium">{student.chest_no || '-'}</span>
                            <span className="hidden sm:inline text-slate-500">{student.section}</span>
                          </div>
                          <div className="mt-0.5">
                            <Badge variant="outline" className={cn("text-[8.5px] sm:text-[9px] md:text-[9.5px] h-3.5 sm:h-4 px-1.5 pointer-events-none border font-mono", getLimitBadgeColor(isFull))}>
                              {isFull ? "Maxed" : `${remaining} left`}
                            </Badge>
                          </div>
                        </div>
                      </td>

                      {/* CHECKBOX CELLS */}
                      {filteredEvents.map(event => {
                        const isRegistered = participations.some(p => p.student_id === student.id && p.event_id === event.id)
                        const eventCount = participations.filter(p => p.event_id === event.id).length
                        const isEventFull = eventCount >= event.max_participants_per_team
                        const isDisabled = !isRegistered && (isFull || isEventFull)
                        const tooltipText = `${student.name} • ${event.name} — ${isRegistered ? 'Registered (Click to unregister)' : isDisabled ? (isFull ? 'Student limit reached' : 'Event capacity full') : 'Click to register'}`

                        return (
                          <td key={`${student.id}-${event.id}`} title={tooltipText} className="border-l border-b border-slate-100 p-0 relative align-middle">
                            <label className={cn(
                              "absolute inset-0 flex items-center justify-center cursor-pointer transition-all duration-150 group/cell",
                              getCellColor(isRegistered, isDisabled)
                            )}>
                              <input
                                type="checkbox"
                                checked={isRegistered}
                                disabled={isDisabled}
                                onChange={(e) => handleToggle(student.id, event.id, e.target.checked)}
                                className="peer sr-only"
                              />
                              {isRegistered && <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-in zoom-in duration-150" strokeWidth={3} />}
                              {!isRegistered && !isDisabled && (
                                <Check className="w-4 h-4 text-slate-300 opacity-0 group-hover/cell:opacity-60 transition-opacity" strokeWidth={2} />
                              )}
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
        )}
      </div>
    </div>
  )
}