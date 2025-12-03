"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Trash2, Search, Filter } from "lucide-react"

// --- LOCAL TYPES ---
interface ParticipationDetail {
  id: string
  status: string
  created_at: string
  students: {
    name: string
    admission_no: string
    section: string
  }
  events: {
    name: string
    category: string
  }
  teams: {
    name: string
    color_hex: string
  }
}

interface Team { id: string; name: string }

export default function AdminParticipations() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ParticipationDetail[]>([])
  const [teams, setTeams] = useState<Team[]>([])

  // Filters
  const [search, setSearch] = useState("")
  const [filterTeam, setFilterTeam] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const supabase = createClient()

  async function loadData() {
    try {
      setLoading(true)

      // 1. Fetch Teams for Filter
      const { data: teamsData } = await supabase.from('teams').select('id, name').order('name')
      if (teamsData) setTeams(teamsData as unknown as Team[])

      // 2. Fetch All Participations with Joins
      const { data: partsData, error } = await supabase
        .from('participations')
        .select(`
          id,
          status,
          created_at,
          students ( name, admission_no, section ),
          events ( name, category ),
          teams ( name, color_hex )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setData(partsData as unknown as ParticipationDetail[])

    } catch (err) {
      console.error("Error loading participations:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this entry?")) return

    try {
      setDeletingId(id)
      const { error } = await supabase.from('participations').delete().eq('id', id)
      if (error) throw error

      setData(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error(err)
      alert("Failed to delete entry")
    } finally {
      setDeletingId(null)
    }
  }

  // --- FILTERING LOGIC ---
  const filteredData = data.filter(item => {
    const matchesSearch =
      item.students?.name.toLowerCase().includes(search.toLowerCase()) ||
      item.students?.admission_no.toLowerCase().includes(search.toLowerCase()) ||
      item.events?.name.toLowerCase().includes(search.toLowerCase())

    const matchesTeam = filterTeam === "all" || item.teams?.name === filterTeam
    const matchesCategory = filterCategory === "all" || item.events?.category === filterCategory

    return matchesSearch && matchesTeam && matchesCategory
  })

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Master Registration List</h2>
          <p className="text-muted-foreground">View and manage all student entries across all teams.</p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          Total: {filteredData.length}
        </Badge>
      </div>

      {/* FILTERS BAR */}
      <Card className="bg-muted/10">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student, admission no, or event..."
                className="pl-8 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Team Filter */}
            <div className="w-full md:w-[200px]">
              <select
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
              >
                <option value="all">All Teams</option>
                {teams.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-[200px]">
              <select
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="OFF STAGE">Off Stage</option>
                <option value="ON STAGE">On Stage</option>
                <option value="GENERAL">General</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DATA TABLE */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No records found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.students?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.students?.admission_no} • {row.students?.section}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" style={{ borderColor: row.teams?.color_hex }}>
                        {row.teams?.name}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.events?.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {row.events?.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        row.status === 'registered' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                      >
                        {deletingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}