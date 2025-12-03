"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
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
  SelectValue
} from "@/components/ui/select"
import { Loader2, Trash2, Search, Users, Hash, GraduationCap } from "lucide-react"

// --- LOCAL TYPES ---
interface Team {
  id: string
  name: string
  slug: string
  color_hex: string
}

interface Student {
  id: string
  name: string
  chest_no: string | null
  class_grade: string | null
  section: 'Senior' | 'Junior' | 'Sub-Junior'
  team_id: string
  teams?: { name: string; color_hex: string }
}

export default function AdminStudents() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [teams, setTeams] = useState<Team[]>([])

  // Filters
  const [search, setSearch] = useState("")
  const [filterTeam, setFilterTeam] = useState<string>("all")
  const [filterSection, setFilterSection] = useState<string>("all")
  const [filterClass, setFilterClass] = useState<string>("all")

  const supabase = createClient()

  // --- DATA LOADING ---
  async function loadData() {
    try {
      setLoading(true)

      // 1. Fetch Teams
      const { data: teamsData } = await supabase.from('teams').select('*').order('name')
      if (teamsData) setTeams(teamsData as unknown as Team[])

      // 2. Fetch Students with Team Details
      const { data: studentsData, error } = await supabase
        .from('students')
        .select(`
          *,
          teams ( name, color_hex )
        `)
        .order('chest_no', { ascending: true })

      if (error) throw error

      setStudents(studentsData as unknown as Student[])

    } catch (err) {
      console.error("Error loading students:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // --- ACTIONS ---
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the student and ALL their event participations.")) return

    try {
      const { error } = await supabase.from('students').delete().eq('id', id)
      if (error) throw error

      setStudents(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error(err)
      alert("Failed to delete student")
    }
  }

  // --- FILTERING ---
  const availableClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.class_grade).filter(Boolean))
    return Array.from(classes).sort()
  }, [students])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                            (s.chest_no && s.chest_no.toLowerCase().includes(search.toLowerCase()))

      const matchesTeam = filterTeam === "all" || s.team_id === filterTeam
      const matchesSection = filterSection === "all" || s.section === filterSection
      const matchesClass = filterClass === "all" || s.class_grade === filterClass

      return matchesSearch && matchesTeam && matchesSection && matchesClass
    })
  }, [students, search, filterTeam, filterSection, filterClass])

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
          <h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">Students Directory</h2>
          <p className="text-muted-foreground">Manage registered students and their details.</p>
        </div>
        <Badge variant="outline" className="text-sm px-4 py-1.5 h-9 bg-background/50 backdrop-blur border-border">
          Total Students: <span className="ml-2 font-bold text-primary">{filteredStudents.length}</span>
        </Badge>
      </div>

      {/* FILTER BAR */}
      <Card className="glass-card border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col xl:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or chest no..."
                className="pl-9 bg-background/50 border-border focus-visible:ring-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Team Filter */}
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="w-full xl:w-[200px] bg-background/50 border-border">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Section Filter */}
            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-full xl:w-[180px] bg-background/50 border-border">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="Senior">Senior</SelectItem>
                <SelectItem value="Junior">Junior</SelectItem>
                <SelectItem value="Sub-Junior">Sub-Junior</SelectItem>
              </SelectContent>
            </Select>

            {/* Class Filter */}
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full xl:w-[150px] bg-background/50 border-border">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {availableClasses.map(cls => (
                  <SelectItem key={cls as string} value={cls as string}>Class {cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset Filters */}
            {(filterTeam !== 'all' || filterSection !== 'all' || filterClass !== 'all' || search) && (
                <Button
                    variant="ghost"
                    onClick={() => {
                        setFilterTeam('all')
                        setFilterSection('all')
                        setFilterClass('all')
                        setSearch('')
                    }}
                    className="px-3 text-muted-foreground hover:text-foreground"
                >
                    Reset
                </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* STUDENTS TABLE */}
      <Card className="glass-card border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="w-[100px] font-mono text-xs">Chest No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredStudents.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={6} className="text-center h-48 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                            <Users className="w-8 h-8 opacity-20" />
                            <p>No students found matching your filters.</p>
                        </div>
                    </TableCell>
                    </TableRow>
                ) : (
                    filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/30 border-border/50 transition-colors">
                        <TableCell>
                            <span className="flex items-center gap-2 font-mono font-medium text-foreground">
                                <Hash className="w-3 h-3 text-muted-foreground" />
                                {student.chest_no || '-'}
                            </span>
                        </TableCell>
                        <TableCell className="font-medium text-base text-foreground/90">
                            {student.name}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <GraduationCap className="w-3.5 h-3.5 opacity-50" />
                                {student.class_grade || '-'}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary" className="font-normal bg-muted border-border/50 text-muted-foreground hover:bg-muted/80">
                                {student.section}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant="outline" style={{
                                borderColor: student.teams?.color_hex ? `${student.teams.color_hex}50` : 'currentColor',
                                color: student.teams?.color_hex,
                                backgroundColor: student.teams?.color_hex ? `${student.teams.color_hex}15` : 'transparent'
                            }}>
                                {student.teams?.name || "Unknown"}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive h-8 w-8 transition-all hover:bg-destructive/10"
                                onClick={() => handleDelete(student.id)}
                                title="Delete Student"
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