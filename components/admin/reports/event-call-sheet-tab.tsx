"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, CheckCircle2, CircleDashed } from "lucide-react"

interface Event {
  id: string
  name: string
  event_code: string
  category: string
  max_participants_per_team: number
}

interface ParticipationRecord {
  id: string
  event_id: string
  student_id: string | null
  attendance_status: string | null
  status: string | null
  teams?: {
    name?: string
    color_hex?: string
  } | null
  students?: {
    name?: string
    chest_no?: string | null
    class_grade?: string | null
    section?: string | null
  } | null
}

interface EventCallSheetTabProps {
  events: Event[]
}

const normalizeAttendance = (status?: string | null) =>
  (status ?? "pending").toLowerCase().trim()

const isMarked = (status?: string | null) =>
  normalizeAttendance(status) !== "pending"

const badgeClassByAttendance = (status?: string | null) => {
  const s = normalizeAttendance(status)

  if (s === "present") {
    return "bg-green-100 text-green-700 border-green-200"
  }

  if (s === "absent") {
    return "bg-red-100 text-red-700 border-red-200"
  }

  return "bg-yellow-100 text-yellow-700 border-yellow-200"
}

export function EventCallSheetTab({ events }: EventCallSheetTabProps) {
  const supabase = createClient()

  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [participants, setParticipants] = useState<ParticipationRecord[]>([])
  const [completedEventIds, setCompletedEventIds] = useState<Set<string>>(new Set())
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingEvent, setLoadingEvent] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  )

  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id)
    }
  }, [events, selectedEventId])

  useEffect(() => {
    async function loadCompletedEvents() {
      try {
        setLoadingSummary(true)

        const { data, error } = await supabase
          .from("participations")
          .select("event_id, student_id, attendance_status")
          .not("student_id", "is", null)

        if (error) throw error

        const grouped = new Map<string, string[]>()

        ;(data ?? []).forEach((row: any) => {
          const eventId = row.event_id as string
          const status = normalizeAttendance(row.attendance_status)

          const arr = grouped.get(eventId) ?? []
          arr.push(status)
          grouped.set(eventId, arr)
        })

        const completed = new Set<string>()

        grouped.forEach((statuses, eventId) => {
          if (statuses.length > 0 && statuses.every((s) => s !== "pending")) {
            completed.add(eventId)
          }
        })

        setCompletedEventIds(completed)
      } catch (err) {
        console.error("Failed to load attendance completion summary:", err)
      } finally {
        setLoadingSummary(false)
      }
    }

    loadCompletedEvents()
  }, [supabase])

  useEffect(() => {
    if (!selectedEventId) {
      setParticipants([])
      return
    }

    async function loadEventParticipants() {
      try {
        setLoadingEvent(true)

        const { data, error } = await supabase
          .from("participations")
          .select(`
            id,
            event_id,
            student_id,
            status,
            attendance_status,
            teams (
              name,
              color_hex
            ),
            students!inner (
              name,
              chest_no,
              class_grade,
              section
            )
          `)
          .eq("event_id", selectedEventId)
          .not("student_id", "is", null)
          .order("created_at", { ascending: true })

        if (error) throw error

        const formatted: ParticipationRecord[] = (data ?? []).map((p: any) => ({
          id: p.id,
          event_id: p.event_id,
          student_id: p.student_id,
          status: p.status,
          attendance_status: normalizeAttendance(p.attendance_status),
          teams: p.teams
            ? {
                name: p.teams.name ?? "Unknown Team",
                color_hex: p.teams.color_hex ?? "#cbd5e1",
              }
            : null,
          students: p.students
            ? {
                name: p.students.name ?? "Unknown",
                chest_no: p.students.chest_no ?? "",
                class_grade: p.students.class_grade ?? "-",
                section: p.students.section ?? "-",
              }
            : null,
        }))

        formatted.sort((a, b) => {
          const chestA = parseInt(a.students?.chest_no || "999999", 10)
          const chestB = parseInt(b.students?.chest_no || "999999", 10)

          if (Number.isNaN(chestA) && Number.isNaN(chestB)) {
            return (a.students?.name || "").localeCompare(b.students?.name || "")
          }

          if (Number.isNaN(chestA)) return 1
          if (Number.isNaN(chestB)) return -1

          return chestA - chestB
        })

        setParticipants(formatted)

        const allMarked =
          formatted.length > 0 &&
          formatted.every((p) => isMarked(p.attendance_status))

        setCompletedEventIds((prev) => {
          const next = new Set(prev)
          if (allMarked) next.add(selectedEventId)
          else next.delete(selectedEventId)
          return next
        })
      } catch (err) {
        console.error("Failed to load event participants:", err)
        setParticipants([])
      } finally {
        setLoadingEvent(false)
      }
    }

    loadEventParticipants()
  }, [selectedEventId, supabase])

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return participants

    return participants.filter((p) => {
      const name = p.students?.name?.toLowerCase() || ""
      const chest = p.students?.chest_no?.toLowerCase() || ""
      const grade = p.students?.class_grade?.toLowerCase() || ""
      const section = p.students?.section?.toLowerCase() || ""
      const team = p.teams?.name?.toLowerCase() || ""

      return (
        name.includes(q) ||
        chest.includes(q) ||
        grade.includes(q) ||
        section.includes(q) ||
        team.includes(q)
      )
    })
  }, [participants, searchQuery])

  const markedCount = useMemo(
    () => participants.filter((p) => isMarked(p.attendance_status)).length,
    [participants]
  )

  const pendingCount = participants.length - markedCount

  const updateAttendance = async (
    participationId: string,
    newStatus: "present" | "absent" | "pending"
  ) => {
    const prevParticipants = participants

    const nextParticipants = prevParticipants.map((p) =>
      p.id === participationId
        ? { ...p, attendance_status: normalizeAttendance(newStatus) }
        : p
    )

    setParticipants(nextParticipants)

    const allMarked =
      nextParticipants.length > 0 &&
      nextParticipants.every((p) => isMarked(p.attendance_status))

    setCompletedEventIds((prev) => {
      const next = new Set(prev)
      if (allMarked) next.add(selectedEventId)
      else next.delete(selectedEventId)
      return next
    })

    const { error } = await supabase
      .from("participations")
      .update({ attendance_status: newStatus })
      .eq("id", participationId)

    if (error) {
      console.error("Failed to update attendance:", error)

      setParticipants(prevParticipants)

      const rollbackAllMarked =
        prevParticipants.length > 0 &&
        prevParticipants.every((p) => isMarked(p.attendance_status))

      setCompletedEventIds((prev) => {
        const next = new Set(prev)
        if (rollbackAllMarked) next.add(selectedEventId)
        else next.delete(selectedEventId)
        return next
      })
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="bg-white border rounded-xl shadow-sm p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full sm:w-[320px] bg-slate-50 border-slate-200">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {events.map((event) => {
                const completed = completedEventIds.has(event.id)
                return (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center gap-2">
                      <span>{event.name}</span>
                      {completed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <CircleDashed className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student, chest no, team..."
              className="pl-9 bg-slate-50 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-slate-50">
            Total: {participants.length}
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Marked: {markedCount}
          </Badge>
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending: {pendingCount}
          </Badge>
          {selectedEventId && completedEventIds.has(selectedEventId) && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Attendance Completed
            </Badge>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm flex-1 min-h-0 overflow-hidden">
        {loadingSummary || loadingEvent ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !selectedEvent ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Select an event to view attendance.
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No participants found.
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr className="border-b">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Chest No</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Class</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Team</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3">{p.students?.chest_no || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.students?.name || "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      {p.students?.class_grade || "-"} {p.students?.section || ""}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full border"
                          style={{ backgroundColor: p.teams?.color_hex || "#cbd5e1" }}
                        />
                        <span>{p.teams?.name || "Unknown Team"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={normalizeAttendance(p.attendance_status)}
                        onValueChange={(val: "present" | "absent" | "pending") =>
                          updateAttendance(p.id, val)
                        }
                      >
                        <SelectTrigger
                          className={`w-[140px] border ${badgeClassByAttendance(
                            p.attendance_status
                          )}`}
                        >
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
