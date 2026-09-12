"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Loader2,
  Check,
  Search,
  Info,
  AlertCircle,
  Users,
  LayoutGrid,
  Table as TableIcon,
  ArrowRightLeft,
  UserPlus,
  Trash2,
  X,
  AlertTriangle,
  UserCheck,
  Sparkles,
  Trophy,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// --- TYPES ---
interface Team {
  id: string
  name: string
  color_hex: string
}

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

interface SectionLimit {
  section: string
  category: string
  limit_count: number
}

interface Props {
  teamId: string
  teamName: string
  teams?: Team[]
  selectedTeam?: string
  onSelectTeam?: (teamId: string) => void
  dataError?: string | null
}

type ViewMode = 'events' | 'students' | 'matrix'

// Tabs Configuration
const TABS = [
  { id: 'ALIYA_ON', label: 'Aliya On-Stage', shortLabel: 'Aliya On', section: 'Aliya', cat: 'ON STAGE' },
  { id: 'ALIYA_OFF', label: 'Aliya Off-Stage', shortLabel: 'Aliya Off', section: 'Aliya', cat: 'OFF STAGE' },
  { id: 'FOUNDATION_ON', label: 'Foundation On-Stage', shortLabel: 'Fdn On', section: 'Foundation', cat: 'ON STAGE' },
  { id: 'FOUNDATION_OFF', label: 'Foundation Off-Stage', shortLabel: 'Fdn Off', section: 'Foundation', cat: 'OFF STAGE' },
  { id: 'GENERAL_ON', label: 'General On-Stage', shortLabel: 'Gen On', section: 'General', cat: 'ON STAGE' },
  { id: 'GENERAL_OFF', label: 'General Off-Stage', shortLabel: 'Gen Off', section: 'General', cat: 'OFF STAGE' },
  { id: 'FDN_GENERAL_ON', label: 'Fdn General On-Stage', shortLabel: 'Fdn Gen On', section: 'Foundation General', cat: 'ON STAGE' },
  { id: 'FDN_GENERAL_OFF', label: 'Fdn General Off-Stage', shortLabel: 'Fdn Gen Off', section: 'Foundation General', cat: 'OFF STAGE' },
]

export function ReplacementMatrix({
  teamId,
  teamName,
  teams = [],
  selectedTeam,
  onSelectTeam,
  dataError,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [viewMode, setViewMode] = useState<ViewMode>('events')

  // Mobile scroll collapse state
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollTop = useRef(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Data State
  const [students, setStudents] = useState<Student[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [participations, setParticipations] = useState<Participation[]>([])
  const [limits, setLimits] = useState<SectionLimit[]>([])

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'full'>('all')

  // Replacement / Addition Modal State
  const [replaceModalOpen, setReplaceModalOpen] = useState(false)
  const [targetEvent, setTargetEvent] = useState<Event | null>(null)
  const [studentToReplace, setStudentToReplace] = useState<Student | null>(null)
  const [modalSearchQuery, setModalSearchQuery] = useState("")

  // Override Confirmation Modal State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [overrideData, setOverrideData] = useState<{
    student: Student
    event: Event
    studentToReplace?: Student | null
    reason: string
  } | null>(null)

  // Remove Confirmation Modal State
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [removeData, setRemoveData] = useState<{
    student: Student
    event: Event
  } | null>(null)

  const [actionLoading, setActionLoading] = useState(false)

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

  // --- DATA FETCHING ---
  useEffect(() => {
    async function loadData() {
      if (!teamId) return

      try {
        setLoading(true)

        const [stuRes, evtRes, partRes, limitRes] = await Promise.all([
          supabase.from('students').select('*').eq('team_id', teamId).order('name'),
          supabase.from('events').select('*').order('name'),
          supabase.from('participations').select('*').eq('team_id', teamId),
          supabase.from('section_limits').select('*'),
        ])

        if (stuRes.data) setStudents(stuRes.data as unknown as Student[])
        if (evtRes.data) setEvents(evtRes.data as unknown as Event[])
        if (partRes.data) setParticipations(partRes.data as unknown as Participation[])
        if (limitRes.data) setLimits(limitRes.data as unknown as SectionLimit[])
      } catch (e) {
        console.error("Load error", e)
        toast.error("Failed to load team participant data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [teamId])

  // --- 1. FILTER STUDENTS BASED ON TAB ---
  const eligibleStudents = useMemo(() => {
    let list = students
    if (activeTab.section === 'General') {
      list = list.filter(s => s.section === 'Aliya')
    } else if (activeTab.section === 'Foundation General') {
      list = list.filter(s => s.section === 'Foundation')
    } else {
      list = list.filter(s => s.section === activeTab.section)
    }
    return list
  }, [students, activeTab])

  const filteredStudents = useMemo(() => {
    let list = eligibleStudents

    const rawQuery = searchQuery.trim().toLowerCase()
    if (!rawQuery) return list

    const tokens = rawQuery.replace(/#/g, '').split(/\s+/).filter(Boolean)

    return list.filter(s => {
      const nameLower = s.name.toLowerCase()
      const chestLower = (s.chest_no || '').toLowerCase().replace(/#/g, '')
      const sectionLower = (s.section || '').toLowerCase()

      return tokens.every(token =>
        nameLower.includes(token) ||
        chestLower.includes(token) ||
        sectionLower.includes(token)
      )
    })
  }, [eligibleStudents, searchQuery])

  // --- 1B. FILTER CANDIDATE STUDENTS FOR MODAL ---
  const modalCandidateStudents = useMemo(() => {
    let list = eligibleStudents
    const rawQuery = modalSearchQuery.trim().toLowerCase()
    if (!rawQuery) return list

    const tokens = rawQuery.replace(/#/g, '').split(/\s+/).filter(Boolean)

    return list.filter(s => {
      const nameLower = s.name.toLowerCase()
      const chestLower = (s.chest_no || '').toLowerCase().replace(/#/g, '')
      const sectionLower = (s.section || '').toLowerCase()

      return tokens.every(token =>
        nameLower.includes(token) ||
        chestLower.includes(token) ||
        sectionLower.includes(token)
      )
    })
  }, [eligibleStudents, modalSearchQuery])

  // --- 1C. FIND STUDENTS MATCHING IN OTHER CATEGORIES (Helper for fast search navigation) ---
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
  const eligibleEvents = useMemo(() => {
    return events.filter(e => {
      if (e.category !== activeTab.cat) return false
      if (!e.applicable_section || e.applicable_section.length === 0) return false
      return e.applicable_section.includes(activeTab.section)
    })
  }, [events, activeTab])

  const filteredEvents = useMemo(() => {
    let list = eligibleEvents

    const rawQuery = searchQuery.trim().toLowerCase()
    if (rawQuery) {
      const tokens = rawQuery.replace(/#/g, '').split(/\s+/).filter(Boolean)
      list = list.filter(e => {
        const eventNameLower = e.name.toLowerCase()
        const matchesEvent = tokens.every(token => eventNameLower.includes(token))
        const eventParticipantIds = participations.filter(p => p.event_id === e.id).map(p => p.student_id)
        const matchesStudent = students.some(s => {
          if (!eventParticipantIds.includes(s.id)) return false
          const nameLower = s.name.toLowerCase()
          const chestLower = (s.chest_no || '').toLowerCase().replace(/#/g, '')
          return tokens.every(token => nameLower.includes(token) || chestLower.includes(token))
        })
        return matchesEvent || matchesStudent
      })
    }

    if (statusFilter === 'open') {
      list = list.filter(e => {
        const count = participations.filter(p => p.event_id === e.id).length
        return count < e.max_participants_per_team
      })
    } else if (statusFilter === 'full') {
      list = list.filter(e => {
        const count = participations.filter(p => p.event_id === e.id).length
        return count >= e.max_participants_per_team
      })
    }

    return list
  }, [eligibleEvents, participations, searchQuery, statusFilter, students])

  // --- 3. DYNAMIC LIMIT CHECKER ---
  const getLimitStatus = (student: Student) => {
    const ruleSection = activeTab.section
    const limitRule = limits.find(l => l.section === ruleSection && l.category === activeTab.cat)
    const limit = limitRule ? limitRule.limit_count : 100

    const count = participations.filter(p => {
      const ev = events.find(e => e.id === p.event_id)
      if (!ev) return false
      const isTabSectionEvent = ev.applicable_section?.includes(activeTab.section)
      return p.student_id === student.id &&
        isTabSectionEvent &&
        ev.category === activeTab.cat
    }).length

    return { count, limit, isFull: count >= limit, remaining: Math.max(0, limit - count) }
  }

  // --- 4. PARTICIPANT ACTIONS ---
  const handleOpenReplace = (event: Event, student: Student | null) => {
    setTargetEvent(event)
    setStudentToReplace(student)
    setModalSearchQuery("")
    setReplaceModalOpen(true)
  }

  const handleSelectStudentForEvent = async (selectedStudent: Student) => {
    if (!targetEvent) return

    const { isFull, limit } = getLimitStatus(selectedStudent)
    const eventTeamCount = participations.filter(p => p.event_id === targetEvent.id).length
    const isReplacing = !!studentToReplace

    if (isFull && (!isReplacing || selectedStudent.id !== studentToReplace?.id)) {
      setOverrideData({
        student: selectedStudent,
        event: targetEvent,
        studentToReplace: studentToReplace,
        reason: `Student ${selectedStudent.name} has already reached the maximum limit of ${limit} programmes in this section.`
      })
      setOverrideModalOpen(true)
      return
    }

    if (!isReplacing && eventTeamCount >= targetEvent.max_participants_per_team) {
      setOverrideData({
        student: selectedStudent,
        event: targetEvent,
        studentToReplace: null,
        reason: `Event ${targetEvent.name} already has ${targetEvent.max_participants_per_team} participant(s) registered.`
      })
      setOverrideModalOpen(true)
      return
    }

    await executeReplacement(selectedStudent, targetEvent, studentToReplace)
  }

  const executeReplacement = async (
    newStudent: Student,
    event: Event,
    oldStudent?: Student | null
  ) => {
    try {
      setActionLoading(true)

      if (oldStudent) {
        const { error: delErr } = await supabase
          .from('participations')
          .delete()
          .match({ student_id: oldStudent.id, event_id: event.id, team_id: teamId })

        if (delErr) {
          toast.error(`Failed to remove ${oldStudent.name}: ${delErr.message}`)
          return
        }
      }

      const { data: inserted, error: insErr } = await (supabase.from('participations') as any).insert({
        student_id: newStudent.id,
        event_id: event.id,
        team_id: teamId,
        status: 'registered'
      }).select().single()

      if (insErr) {
        toast.error(`Failed to add ${newStudent.name}: ${insErr.message}`)
        const partRes = await supabase.from('participations').select('*').eq('team_id', teamId)
        if (partRes.data) setParticipations(partRes.data as unknown as Participation[])
      } else {
        if (oldStudent) {
          setParticipations(prev => [
            ...prev.filter(p => !(p.student_id === oldStudent.id && p.event_id === event.id)),
            inserted
          ])
          toast.success(`Replaced ${oldStudent.name} with ${newStudent.name} in ${event.name}`)
        } else {
          setParticipations(prev => [...prev, inserted])
          toast.success(`Added ${newStudent.name} to ${event.name}`)
        }
        setReplaceModalOpen(false)
        setOverrideModalOpen(false)
      }
    } catch (e: any) {
      toast.error(e?.message || "An error occurred during replacement")
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmRemove = async () => {
    if (!removeData) return
    const { student, event } = removeData

    try {
      setActionLoading(true)
      setParticipations(prev => prev.filter(p => !(p.student_id === student.id && p.event_id === event.id)))

      const { error } = await supabase
        .from('participations')
        .delete()
        .match({ student_id: student.id, event_id: event.id, team_id: teamId })

      if (error) {
        toast.error(`Failed to remove ${student.name}: ${error.message}`)
        const partRes = await supabase.from('participations').select('*').eq('team_id', teamId)
        if (partRes.data) setParticipations(partRes.data as unknown as Participation[])
      } else {
        toast.success(`Removed ${student.name} from ${event.name}`)
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove participant")
    } finally {
      setActionLoading(false)
      setRemoveModalOpen(false)
      setRemoveData(null)
    }
  }

  const handleToggleMatrix = async (studentId: string, eventId: string, isChecked: boolean) => {
    if (!teamId) return

    const student = students.find(s => s.id === studentId)
    const event = events.find(e => e.id === eventId)
    if (!student || !event) return

    if (!isChecked) {
      setRemoveData({ student, event })
      setRemoveModalOpen(true)
      return
    }

    const { isFull, limit } = getLimitStatus(student)
    const eventTeamCount = participations.filter(p => p.event_id === eventId).length

    if (isFull) {
      setOverrideData({
        student,
        event,
        reason: `Student ${student.name} has already reached the maximum limit of ${limit} programmes in this section.`
      })
      setOverrideModalOpen(true)
      return
    }

    if (eventTeamCount >= event.max_participants_per_team) {
      setOverrideData({
        student,
        event,
        reason: `Event ${event.name} already has ${event.max_participants_per_team} participant(s) registered.`
      })
      setOverrideModalOpen(true)
      return
    }

    await executeReplacement(student, event, null)
  }

  const currentSelectedTeamObj = teams.find(t => t.id === (selectedTeam || teamId))

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
        <p className="font-medium text-sm">Loading participants for {teamName}...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-1.5 sm:space-y-2 animate-in fade-in h-full w-full overflow-hidden">

      {/* COLLAPSIBLE HEADER BLOCK (Collapses on scroll down, shows on scroll up) */}
      <div className={cn(
        "flex flex-col gap-1.5 shrink-0 w-full transition-all duration-300 ease-in-out origin-top",
        headerVisible
          ? "max-h-[220px] opacity-100 translate-y-0"
          : "max-h-0 opacity-0 -translate-y-2 overflow-hidden pointer-events-none"
      )}>
        
        {/* ROW 0: Team Selection Top Card (if teams prop is passed) */}
        {teams && teams.length > 0 && onSelectTeam && (
          <Card className="p-2 sm:p-2.5 md:py-2 md:px-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0 bg-slate-900 text-white border-none shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-blue-500/20 text-blue-400">
                  <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h1 className="text-xs sm:text-sm md:text-base font-bold leading-tight">
                    Participant Replacement
                  </h1>
                  <p className="text-slate-400 text-[10px] hidden sm:block">
                    Modify, swap, or override participant registrations by team.
                  </p>
                </div>
              </div>
            </div>

            {/* Team Selector Dropdown */}
            <div className="w-full sm:w-56 md:w-64 shrink-0">
              {dataError ? (
                <div className="text-red-400 text-xs bg-red-950/30 p-1.5 rounded border border-red-900">
                  Error: {dataError}
                </div>
              ) : (
                <Select value={selectedTeam || teamId} onValueChange={onSelectTeam}>
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 transition-colors h-7.5 text-xs">
                    <SelectValue placeholder="Select a Team" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] bg-white">
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full border border-slate-300 shadow-2xs shrink-0"
                            style={{ backgroundColor: t.color_hex || '#3b82f6' }}
                          />
                          <span className="font-medium text-slate-900 text-xs">{t.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </Card>
        )}

        {/* ROW 1: Search & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 w-full">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder={
                viewMode === 'events'
                  ? "Search programme, student name, chest #..."
                  : "Search student by name, chest #..."
              }
              className="pl-8 pr-8 bg-white shadow-xs h-7.5 sm:h-8 text-xs border-slate-300 rounded-lg"
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
                className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle Switcher */}
          <div className="flex items-center self-start sm:self-auto bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs gap-0.5">
            <button
              onClick={() => setViewMode('events')}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-all",
                viewMode === 'events'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
              title="Card View by Programme (Best for Mobile)"
            >
              <LayoutGrid className="w-3 h-3 text-primary" />
              <span>Programme View</span>
            </button>

            <button
              onClick={() => setViewMode('students')}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-all",
                viewMode === 'students'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
              title="Card View by Student"
            >
              <Users className="w-3 h-3 text-primary" />
              <span>Student View</span>
            </button>

            <button
              onClick={() => setViewMode('matrix')}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-all",
                viewMode === 'matrix'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
              title="Full Matrix Table Grid"
            >
              <TableIcon className="w-3 h-3 text-primary" />
              <span>Grid Matrix</span>
            </button>
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
          <div className="flex items-center gap-1.5 truncate">
            <div
              className="w-2 h-2 rounded-full border border-white/30 shrink-0"
              style={{ backgroundColor: currentSelectedTeamObj?.color_hex || '#3b82f6' }}
            />
            <span className="font-bold truncate">{teamName}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-medium text-[10.5px] truncate">{activeTab.shortLabel}</span>
            {searchQuery.trim() && (
              <>
                <span className="text-slate-500">•</span>
                <span className="text-blue-300 font-mono text-[10px]">"{searchQuery}"</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-blue-300 bg-blue-950/60 border border-blue-700/60 px-2 py-0.5 rounded shrink-0">
            <Search className="w-3 h-3" />
            <span>Search / Expand</span>
            <ChevronDown className="w-3 h-3" />
          </div>
        </div>
      )}

      {/* ROW 2: Category Tabs with Horizontal Scrolling */}
      <div className="w-full overflow-x-auto pb-0.5 -mx-1 px-1 md:mx-0 md:px-0 scrollbar-none shrink-0">
        <div className="flex gap-1 border-b border-slate-200 min-w-max pb-0.5">
          {TABS.map(tab => {
            const tabEvents = events.filter(e => {
              if (e.category !== tab.cat) return false
              if (!e.applicable_section || e.applicable_section.length === 0) return false
              return e.applicable_section.includes(tab.section)
            })

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all whitespace-nowrap",
                  activeTab.id === tab.id
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  "text-[9px] px-1 py-0.2 rounded-full font-mono font-medium",
                  activeTab.id === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                )}>
                  {tabEvents.length}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter Chips for Programme View */}
      {viewMode === 'events' && (
        <div className="flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                statusFilter === 'all'
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              All ({eligibleEvents.length})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                statusFilter === 'open'
                  ? "bg-amber-100 text-amber-800 font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Has Open Slots
            </button>
            <button
              onClick={() => setStatusFilter('full')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                statusFilter === 'full'
                  ? "bg-emerald-100 text-emerald-800 font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Fully Registered
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-xs shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Showing {filteredEvents.length} programmes</span>
          </div>
        </div>
      )}

      {/* --- VIEW 1: PROGRAMME-CENTRIC CARDS --- */}
      {viewMode === 'events' && (
        <div
          onScroll={handleMatrixScroll}
          className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1"
        >
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-center">
              <Trophy className="w-10 h-10 mb-2 opacity-25" />
              <p className="font-semibold text-slate-700 text-sm">
                {searchQuery.trim() ? `No programmes matching "${searchQuery}"` : "No programmes match your filter"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {searchQuery.trim() ? "Try searching by programme name, student name, or chest number." : "Try choosing another category tab."}
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5">
              {filteredEvents.map(event => {
                const eventParticipations = participations.filter(p => p.event_id === event.id)
                const count = eventParticipations.length
                const max = event.max_participants_per_team
                const isFull = count >= max
                const hasSlots = count < max

                return (
                  <div
                    key={event.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow p-3.5 flex flex-col justify-between gap-3 relative overflow-hidden"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                            {event.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {event.category}
                            </span>
                            <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                              {activeTab.section}
                            </span>
                          </div>
                        </div>

                        <div className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-bold shrink-0 border flex items-center gap-1",
                          isFull
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : count > 0
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        )}>
                          <Users className="w-3 h-3" />
                          <span>{count}/{max} Filled</span>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Registered Participants ({count})
                        </div>

                        {count === 0 ? (
                          <div className="py-3 px-3 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs text-center flex items-center justify-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>No participants registered yet</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {eventParticipations.map(p => {
                              const student = students.find(s => s.id === p.student_id)
                              if (!student) return null

                              const { isFull: studentMaxed, remaining } = getLimitStatus(student)

                              return (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100/80 transition-colors gap-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono text-[11px] font-bold bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                      {student.chest_no || "—"}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-900 text-xs truncate">
                                        {student.name}
                                      </p>
                                      <p className="text-[10px] text-slate-500">
                                        {student.section} • {studentMaxed ? "Maxed (Limit reached)" : `${remaining} slot left`}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenReplace(event, student)}
                                      className="h-7 px-2 text-[11px] font-semibold bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                      title="Replace this student with another"
                                    >
                                      <ArrowRightLeft className="w-3 h-3 mr-1" />
                                      Replace
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setRemoveData({ student, event })
                                        setRemoveModalOpen(true)
                                      }}
                                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                                      title="Remove from event"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant={hasSlots ? "default" : "outline"}
                        onClick={() => handleOpenReplace(event, null)}
                        className={cn(
                          "w-full h-8 text-xs font-semibold flex items-center justify-center gap-1.5",
                          hasSlots
                            ? "bg-slate-900 text-white hover:bg-slate-800"
                            : "border-slate-300 text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{hasSlots ? "Add Participant" : "Add (Override Limit)"}</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* --- VIEW 2: STUDENT-CENTRIC CARDS --- */}
      {viewMode === 'students' && (
        <div
          onScroll={handleMatrixScroll}
          className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1"
        >
          {filteredStudents.length === 0 ? (
            otherTabMatches.length > 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200 text-center max-w-md mx-auto my-4 shadow-xs">
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
                        <span>Switch to {m.tab.shortLabel}</span>
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
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-center">
                <Users className="w-10 h-10 mb-2 opacity-25" />
                <p className="font-semibold text-slate-700 text-sm">
                  {searchQuery.trim() ? `No students matching "${searchQuery}"` : "No students in this category"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {searchQuery.trim() ? "Try searching by a different name, word, or chest number." : "Try choosing another category tab."}
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5">
              {filteredStudents.map(student => {
                const { count, limit, isFull, remaining } = getLimitStatus(student)
                const studentParticipations = participations.filter(p => {
                  const ev = events.find(e => e.id === p.event_id)
                  if (!ev) return false
                  const isTabSectionEvent = ev.applicable_section?.includes(activeTab.section)
                  return p.student_id === student.id && isTabSectionEvent && ev.category === activeTab.cat
                })

                return (
                  <div
                    key={student.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow p-3.5 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                            {student.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px]">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-200">
                              Chest #{student.chest_no || "—"}
                            </span>
                            <span className="text-slate-500 font-sans">{student.section}</span>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-bold px-2 py-0.5 shrink-0 border",
                            isFull
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          )}
                        >
                          {count}/{limit} {isFull ? "Maxed" : `${remaining} left`}
                        </Badge>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Assigned Programmes ({studentParticipations.length})
                        </div>

                        {studentParticipations.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-1">No programmes in this category yet</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {studentParticipations.map(p => {
                              const ev = events.find(e => e.id === p.event_id)
                              if (!ev) return null
                              return (
                                <span
                                  key={p.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 group"
                                >
                                  <span className="truncate max-w-[140px]">{ev.name}</span>
                                  <button
                                    onClick={() => {
                                      setRemoveData({ student, event: ev })
                                      setRemoveModalOpen(true)
                                    }}
                                    className="text-slate-400 hover:text-red-600 transition-colors ml-0.5"
                                    title={`Remove from ${ev.name}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* --- VIEW 3: FULL GRID MATRIX (TABLE) --- */}
      {viewMode === 'matrix' && (
        <div className="flex-1 border border-slate-200 rounded-xl bg-white relative shadow-2xs w-full overflow-hidden flex flex-col min-h-0">
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
                        <span>Switch to {m.tab.shortLabel}</span>
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
          ) : eligibleEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
              <Info className="w-10 h-10 mb-2 opacity-25" />
              <p className="font-medium text-slate-600 text-sm">No programmes available for this category.</p>
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
                    {/* STICKY CORNER HEADER (Top-Left) */}
                    <th className="p-1.5 sm:p-2 md:p-2.5 text-left font-bold sticky left-0 top-0 z-40 bg-white border-r border-b border-slate-200 w-[120px] sm:w-52 md:w-56 lg:w-60 min-w-[120px] sm:min-w-[180px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs sm:text-sm md:text-base text-slate-900 font-bold">Student Name</span>
                        <span className="text-[9.5px] font-normal text-slate-500 uppercase tracking-wider hidden sm:block">
                          {activeTab.section} • {activeTab.cat}
                        </span>
                      </div>
                    </th>

                    {/* EVENT ROTATED COLUMNS (Sticky Top) */}
                    {eligibleEvents.map(event => {
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
                            <Badge
                              className={cn(
                                "text-[8.5px] sm:text-[9px] h-4 px-1 pointer-events-none border font-mono shadow-2xs",
                                isFull
                                  ? "bg-emerald-500 text-white border-emerald-600"
                                  : "bg-white text-slate-600 border-slate-300"
                              )}
                            >
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
                            <div className="font-semibold text-slate-900 text-xs sm:text-sm truncate max-w-[105px] sm:max-w-none">
                              {student.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[10px] text-slate-500 font-mono">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[9px] sm:text-[10px] font-medium">
                                {student.chest_no || '-'}
                              </span>
                              <span className="hidden sm:inline text-slate-500">{student.section}</span>
                            </div>
                            <div className="mt-0.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[8.5px] sm:text-[9px] md:text-[9.5px] h-3.5 sm:h-4 px-1.5 pointer-events-none border font-mono",
                                  isFull
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                )}
                              >
                                {isFull ? "Maxed" : `${remaining} left`}
                              </Badge>
                            </div>
                          </div>
                        </td>

                        {/* CHECKBOX / TAP CELLS */}
                        {eligibleEvents.map(event => {
                          const isRegistered = participations.some(p => p.student_id === student.id && p.event_id === event.id)
                          const eventCount = participations.filter(p => p.event_id === event.id).length
                          const isEventFull = eventCount >= event.max_participants_per_team
                          const isVisualDisabled = !isRegistered && (isFull || isEventFull)
                          const tooltipText = `${student.name} • ${event.name} — ${isRegistered ? 'Registered (Click to remove/replace)' : isVisualDisabled ? (isFull ? 'Student reached category limit (Click to override)' : 'Event capacity full (Click to override)') : 'Click to register'}`

                          return (
                            <td
                              key={`${student.id}-${event.id}`}
                              title={tooltipText}
                              className="border-l border-b border-slate-100 p-0 relative align-middle"
                            >
                              <label
                                className={cn(
                                  "absolute inset-0 flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95 group/cell",
                                  isRegistered
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : isVisualDisabled
                                    ? "bg-slate-100/80 opacity-60 hover:bg-slate-200/80"
                                    : "bg-white hover:bg-blue-50/60"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isRegistered}
                                  onChange={(e) => handleToggleMatrix(student.id, event.id, e.target.checked)}
                                  className="peer sr-only"
                                />
                                {isRegistered && (
                                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-in zoom-in-50 duration-150" strokeWidth={3} />
                                )}
                                {!isRegistered && !isVisualDisabled && (
                                  <Check className="w-4 h-4 text-blue-300 opacity-0 group-hover/cell:opacity-60 transition-opacity" strokeWidth={2} />
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
      )}

      {/* ============================================================ */}
      {/* --- DIALOG 1: REPLACEMENT & ADD PARTICIPANT SELECTOR --- */}
      {/* ============================================================ */}
      <Dialog open={replaceModalOpen} onOpenChange={setReplaceModalOpen}>
        <DialogContent className="max-w-lg p-5 max-h-[90vh] flex flex-col gap-4">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {studentToReplace ? (
                <>
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  <span>Replace Participant</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <span>Add Participant</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {targetEvent?.name} • {activeTab.section} ({activeTab.cat})
            </DialogDescription>
          </DialogHeader>

          {/* Current Participant Info (if replacing) */}
          {studentToReplace && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="text-amber-700 font-medium">Currently Assigned:</span>
                <p className="font-bold text-amber-950 text-sm mt-0.5">
                  {studentToReplace.name}{" "}
                  <span className="font-mono text-xs font-normal">({studentToReplace.chest_no || "No Chest #"})</span>
                </p>
              </div>
              <Badge variant="outline" className="bg-white text-amber-800 border-amber-300 text-[10px]">
                Will be replaced
              </Badge>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search candidate by name or chest no..."
              className="pl-9 bg-slate-50 h-9 text-xs sm:text-sm border-slate-300"
              value={modalSearchQuery}
              onChange={(e) => setModalSearchQuery(e.target.value)}
              autoFocus
            />
            {modalSearchQuery && (
              <button
                onClick={() => setModalSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Student Candidate List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-72 pr-1 scrollbar-thin">
            {modalCandidateStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No eligible students found in {activeTab.section}
              </div>
            ) : (
              modalCandidateStudents.map(student => {
                const isCurrent = student.id === studentToReplace?.id
                const isAlreadyRegisteredInEvent = targetEvent && participations.some(
                  p => p.student_id === student.id && p.event_id === targetEvent.id
                )
                const { count, limit, isFull, remaining } = getLimitStatus(student)

                return (
                  <button
                    key={student.id}
                    disabled={actionLoading || isCurrent}
                    onClick={() => handleSelectStudentForEvent(student)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between gap-3 text-xs",
                      isCurrent
                        ? "bg-amber-50/50 border-amber-200 opacity-60 cursor-not-allowed"
                        : isAlreadyRegisteredInEvent
                        ? "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        : "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/30"
                    )}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 font-mono">
                        {student.chest_no || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-xs truncate">
                          {student.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {student.section} • {isFull ? "Max limit reached" : `${remaining} slot(s) available`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCurrent ? (
                        <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50">
                          Current
                        </Badge>
                      ) : isAlreadyRegisteredInEvent ? (
                        <Badge variant="outline" className="text-[10px] text-slate-500 bg-slate-100">
                          Already in event
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-mono",
                            isFull
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-emerald-50 text-emerald-800 border-emerald-300"
                          )}
                        >
                          {count}/{limit} {isFull ? "Maxed" : "Ready"}
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReplaceModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* --- DIALOG 2: OVERRIDE WARNING CONFIRMATION --- */}
      {/* ============================================================ */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="max-w-md p-5">
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-base font-bold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Admin Override Confirmation</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed">
              {overrideData?.reason}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
            <p className="font-semibold">Do you want to override the rule and proceed?</p>
            <p className="text-[11px] text-amber-800">
              As an Administrator, you have the permission to override category limits and team event capacity.
            </p>
          </div>

          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={() => {
                setOverrideModalOpen(false)
                setOverrideData(null)
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={actionLoading}
              onClick={async () => {
                if (!overrideData) return
                await executeReplacement(
                  overrideData.student,
                  overrideData.event,
                  overrideData.studentToReplace
                )
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
            >
              {actionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 mr-1" />
              )}
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* --- DIALOG 3: REMOVE CONFIRMATION --- */}
      {/* ============================================================ */}
      <Dialog open={removeModalOpen} onOpenChange={setRemoveModalOpen}>
        <DialogContent className="max-w-sm p-5">
          <DialogHeader className="text-left space-y-1.5">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              <span>Remove Participant?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Are you sure you want to remove{" "}
              <strong className="text-slate-900">{removeData?.student.name}</strong> from{" "}
              <strong className="text-slate-900">{removeData?.event.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={() => {
                setRemoveModalOpen(false)
                setRemoveData(null)
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={actionLoading}
              onClick={handleConfirmRemove}
              className="text-xs font-semibold"
            >
              {actionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : null}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}