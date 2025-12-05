"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Team { id: string; name: string; color_hex: string }

const SECTIONS = ['Senior', 'Junior', 'Sub-Junior', 'General']

export function TeamDetailsDialog({ team, open, onOpenChange }: { team: Team | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<any[]>([])
  const [participations, setParticipations] = useState<any[]>([])
  const [activeSection, setActiveSection] = useState("Senior")

  const supabase = createClient()

  useEffect(() => {
    if (!team || !open) return

    async function fetchData() {
      setLoading(true)
      try {
        // Fetch all events
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, name, category, applicable_section, max_participants_per_team')
          .order('name')

        // Fetch team participations
        const { data: partData } = await supabase
          .from('participations')
          .select('event_id')
          .eq('team_id', team!.id)

        if (eventsData) setEvents(eventsData)
        if (partData) setParticipations(partData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [team, open])

  // Process Data for current section
  const sectionStats = useMemo(() => {
    const sectionEvents = events.filter(e =>
      e.applicable_section && e.applicable_section.includes(activeSection)
    )

    const stats = sectionEvents.map(e => {
      const registeredCount = participations.filter(p => p.event_id === e.id).length
      const isFull = registeredCount >= e.max_participants_per_team
      const isEmpty = registeredCount === 0

      return {
        ...e,
        registeredCount,
        status: isFull ? 'FULL' : isEmpty ? 'EMPTY' : 'PARTIAL'
      }
    })

    const totalEvents = sectionEvents.length
    const filledEvents = stats.filter(s => s.status !== 'EMPTY').length

    return { list: stats, totalEvents, filledEvents }
  }, [events, participations, activeSection])

  if (!team) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-50/50">
        <DialogHeader className="p-6 pb-2 bg-white border-b shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.color_hex }} />
             <DialogTitle className="text-2xl">{team.name} <span className="text-muted-foreground font-normal text-lg">Report</span></DialogTitle>
          </div>
          <DialogDescription>
            Detailed event registration breakdown by section.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
            {/* Top Stats Bar */}
            <div className="flex gap-4 p-4 bg-white border-b shrink-0">
                <div className="flex-1 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-full text-emerald-700">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-emerald-600 font-semibold uppercase">Participating</p>
                        <p className="text-xl font-bold text-emerald-800">{sectionStats.filledEvents} Events</p>
                    </div>
                </div>
                <div className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-full text-slate-500">
                        <Circle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Not Registered</p>
                        <p className="text-xl font-bold text-slate-700">{sectionStats.totalEvents - sectionStats.filledEvents} Events</p>
                    </div>
                </div>
            </div>

            {/* Tabs & Content */}
            <div className="flex-1 p-6 min-h-0 flex flex-col">
                <Tabs value={activeSection} onValueChange={setActiveSection} className="h-full flex flex-col">
                    <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 mb-4 shrink-0">
                        {SECTIONS.map(sec => (
                            <TabsTrigger
                                key={sec}
                                value={sec}
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-2"
                            >
                                {sec}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* REPLACED SCROLLAREA WITH STANDARD DIV FOR ROBUST SCROLLING */}
                    <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                        {loading ? (
                            <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                                {sectionStats.list.map(event => (
                                    <div
                                        key={event.id}
                                        className={cn(
                                            "p-3 rounded-lg border flex items-center justify-between transition-all",
                                            event.status === 'FULL' ? "bg-white border-emerald-200 shadow-sm" :
                                            event.status === 'PARTIAL' ? "bg-white border-orange-200 shadow-sm" :
                                            "bg-slate-50/50 border-slate-100 opacity-80"
                                        )}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium text-sm text-slate-800">{event.name}</span>
                                            <Badge variant="outline" className="w-fit text-[10px] font-normal text-muted-foreground bg-transparent border-slate-200">
                                                {event.category}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge className={cn(
                                                "font-mono text-xs px-2 py-1",
                                                event.status === 'FULL' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" :
                                                event.status === 'PARTIAL' ? "bg-orange-100 text-orange-700 hover:bg-orange-100" :
                                                "bg-slate-200 text-slate-500 hover:bg-slate-200"
                                            )}>
                                                {event.registeredCount}/{event.max_participants_per_team}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {sectionStats.list.length === 0 && (
                                    <div className="col-span-2 text-center py-10 text-muted-foreground">
                                        No events found for this section.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Tabs>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}