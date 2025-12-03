"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trash2, Search, Zap, Layers, Music, Mic } from "lucide-react"

// --- TYPES ---
interface Event {
  id: string
  name: string
  event_code: string
  category: 'OFF STAGE' | 'ON STAGE'
  max_participants_per_team: number
  description: string | null
  grade_type: 'A' | 'B' | 'C'
  applicable_section: string[]
}

export default function AdminEvents() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const supabase = createClient()

  // --- DATA LOADING ---
  async function loadEvents() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_code', { ascending: true })

      if (error) throw error

      setEvents(data as unknown as Event[])
    } catch (err) {
      console.error("Error loading events:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  // --- ACTIONS ---
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event? This will remove all student participations associated with it.")) return

    try {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error

      setEvents(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      console.error(err)
      alert("Failed to delete event")
    }
  }

  // --- FILTERING ---
  const filteredEvents = events.filter(e => {
    const matchesCategory = filterCategory === "all" || e.category === filterCategory
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.event_code?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading) return (
    <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">Events Manager</h2>
          <p className="text-muted-foreground">Manage competition events and regulations.</p>
        </div>
        <Badge variant="outline" className="text-sm px-4 py-1.5 h-9 bg-background/50 backdrop-blur border-border">
          Total Events: <span className="ml-2 font-bold text-primary">{filteredEvents.length}</span>
        </Badge>
      </div>

      {/* FILTER BAR */}
      <Card className="glass-card border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                className="pl-9 bg-background/50 border-border focus-visible:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg border border-border/50">
                {[
                    { id: 'all', label: 'All', icon: Layers },
                    { id: 'ON STAGE', label: 'On Stage', icon: Mic },
                    { id: 'OFF STAGE', label: 'Off Stage', icon: Music }, // Using Music as placeholder icon
                ].map(cat => (
                <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    filterCategory === cat.id
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                >
                    <cat.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{cat.label}</span>
                </button>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EVENTS TABLE */}
      <Card className="glass-card border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="w-20 font-mono text-xs">Code</TableHead>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sections</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-center">Limit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredEvents.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={7} className="text-center h-48 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                            <Zap className="w-8 h-8 opacity-20" />
                            <p>No events found matching your filters.</p>
                        </div>
                    </TableCell>
                    </TableRow>
                ) : (
                    filteredEvents.map((event) => (
                    <TableRow key={event.id} className="group hover:bg-muted/30 border-border/50 transition-colors">
                        <TableCell>
                            <span className="font-mono text-xs font-bold bg-muted/50 px-2 py-1 rounded border border-border text-foreground">
                                {event.event_code || '---'}
                            </span>
                        </TableCell>
                        <TableCell className="font-medium text-base text-foreground/90">
                            {event.name}
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" className={
                                event.category === 'ON STAGE'
                                    ? 'border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10'
                                    : 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10'
                            }>
                                {event.category}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-wrap gap-1">
                                {event.applicable_section?.map(sec => (
                                    <Badge key={sec} variant="secondary" className="text-[10px] font-normal bg-muted border-border/50 text-muted-foreground">
                                        {sec}
                                    </Badge>
                                ))}
                            </div>
                        </TableCell>
                        <TableCell className="text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border ${
                                event.grade_type === 'A' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' :
                                event.grade_type === 'B' ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' :
                                'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                            }`}>
                                {event.grade_type}
                            </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground font-mono text-sm">
                            {event.max_participants_per_team}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10"
                                onClick={() => handleDelete(event.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}