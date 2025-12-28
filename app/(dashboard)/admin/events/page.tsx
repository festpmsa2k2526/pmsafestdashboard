"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { EventFormDialog } from "@/components/admin/events/event-form-dialog"
import { EventsCsvUpload } from "@/components/admin/events/events-csv-upload"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Loader2, Trash2, Search, Edit2, Upload, Plus, AlertTriangle, Filter, X } from "lucide-react"

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

const SECTIONS_LIST = ['Senior', 'Junior', 'Sub-Junior', 'General', 'Foundation']

export default function AdminEvents() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])

  // Filters State
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterSection, setFilterSection] = useState<string>("all")
  const [filterGrade, setFilterGrade] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)

  const supabase = createClient()

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
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setIsAddOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const { error } = await supabase.from('events').delete().eq('id', deleteId)
      if (error) throw error
      setEvents(prev => prev.filter(e => e.id !== deleteId))
    } catch (err) {
      alert("Failed to delete")
    } finally {
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      setEvents([])
      setIsBulkDeleteOpen(false)
    } catch (err) {
      alert("Failed to delete all events")
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
        const matchesCategory = filterCategory === "all" || e.category === filterCategory

        const matchesSection = filterSection === "all" || (e.applicable_section && e.applicable_section.includes(filterSection))

        const matchesGrade = filterGrade === "all" || e.grade_type === filterGrade

        const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              e.event_code?.toLowerCase().includes(searchQuery.toLowerCase())

        return matchesCategory && matchesSection && matchesGrade && matchesSearch
    })
  }, [events, filterCategory, filterSection, filterGrade, searchQuery])

  const clearFilters = () => {
      setFilterCategory("all")
      setFilterSection("all")
      setFilterGrade("all")
      setSearchQuery("")
  }

  const hasActiveFilters = filterCategory !== "all" || filterSection !== "all" || filterGrade !== "all" || searchQuery !== ""

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Events Manager</h2>
          <p className="text-muted-foreground text-sm">Manage competition events and regulations.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <Button onClick={() => { setEditingEvent(null); setIsAddOpen(true); }} className="gap-2 flex-1 lg:flex-none bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4" /> New Event
            </Button>
            <Button variant="outline" onClick={() => setIsUploadOpen(true)} className="gap-2 flex-1 lg:flex-none">
                <Upload className="w-4 h-4" /> Import CSV
            </Button>
            {events.length > 0 && (
                <Button variant="outline" onClick={() => setIsBulkDeleteOpen(true)} className="gap-2 flex-1 lg:flex-none bg-red-50 text-red-600">
                    <Trash2 className="w-4 h-4" /> Reset
                </Button>
            )}
        </div>
      </div>

      {/* ADVANCED FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:gap-4 sticky top-4 z-20">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search events by name or code..."
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {/* Dropdown Group */}
        <div className="flex flex-wrap gap-2 items-center">
            {/* Category Filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wider"></span>
                    </div>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                    <SelectItem value="all">Types</SelectItem>
                    <SelectItem value="ON STAGE">On Stage</SelectItem>
                    <SelectItem value="OFF STAGE">Off Stage</SelectItem>
                </SelectContent>
            </Select>

            {/* Section Filter */}
            <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wider"></span>
                    </div>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                    <SelectItem value="all">Sections</SelectItem>
                    {SECTIONS_LIST.map(sec => (
                        <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Grade Filter */}
            <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="w-[130px] bg-slate-50 border-slate-200">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold uppercase tracking-wider"></span>
                    </div>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                    <SelectItem value="all">Grades</SelectItem>
                    <SelectItem value="A">Grade A</SelectItem>
                    <SelectItem value="B">Grade B</SelectItem>
                    <SelectItem value="C">Grade C</SelectItem>
                </SelectContent>
            </Select>

            {/* Clear Button */}
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFilters}
                    className="h-10 w-10 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                    title="Clear Filters"
                >
                    <X className="w-4 h-4" />
                </Button>
            )}
        </div>
      </div>

      {/* EVENTS TABLE */}
      <Card className="border shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50">
                <TableHead className="w-20 font-bold text-xs uppercase tracking-wider pl-4">Code</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Event Name</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Category</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Section</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase tracking-wider">Grade</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase tracking-wider">Max</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-48 text-muted-foreground bg-slate-50/30">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <p>No events found matching your filters.</p>
                        {hasActiveFilters && (
                            <Button variant="link" onClick={clearFilters} className="text-primary">Clear all filters</Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event) => (
                  <TableRow key={event.id} className="group hover:bg-blue-50/30 transition-colors">
                    <TableCell className="pl-4 font-mono text-xs font-medium text-slate-500">
                        {event.event_code || '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700">
                      {event.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        event.category === 'ON STAGE'
                            ? 'border-purple-200 text-purple-700 bg-purple-50 text-[10px]'
                            : 'border-indigo-200 text-indigo-700 bg-indigo-50 text-[10px]'
                      }>
                        {event.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {event.applicable_section?.map(sec => (
                                <span key={sec} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    {sec}
                                </span>
                            ))}
                        </div>
                    </TableCell>
                    <TableCell className="text-center">
                        <Badge className={`h-5 min-w-5 justify-center px-1 text-[10px] pointer-events-none ${
                            event.grade_type === 'A' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200' :
                            event.grade_type === 'B' ? 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200' :
                            'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200'
                        }`}>
                            {event.grade_type}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-center text-slate-500 font-mono text-xs">
                      {event.max_participants_per_team}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-blue-50" onClick={() => handleEdit(event)}>
                            <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(event.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIALOGS */}
      <EventFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        event={editingEvent}
        onSuccess={loadEvents}
      />
      <EventsCsvUpload
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={loadEvents}
      />

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently remove the event and all associated student results/participations.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-800">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Delete All Events?</AlertDialogTitle>
                <AlertDialogDescription>This is extremely destructive. It will wipe all events and scoring data. Are you sure?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-800">Yes, Delete All</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}