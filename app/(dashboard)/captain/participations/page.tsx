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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trash2, AlertCircle, Calendar, User, Hash } from "lucide-react"

// Interfaces for Joined Data
interface ParticipationWithDetails {
  id: string
  status: string
  created_at: string
  students: {
    name: string
    section: string
    chest_no: string | null
    class_grade: string | null
  }
  events: {
    name: string
    category: string
  }
}

interface Profile { team_id: string }

export default function CaptainParticipations() {
  const [data, setData] = useState<ParticipationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch Data
  async function loadParticipations() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Get Team ID
      const { data: profileData } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single()

      const profile = profileData as unknown as Profile
      if (!profile?.team_id) return

      // 2. Fetch Participations with Joins
      const { data: participations, error } = await supabase
        .from('participations')
        .select(`
          id,
          status,
          created_at,
          students ( name, section, chest_no, class_grade ),
          events ( name, category )
        `)
        .eq('team_id', profile.team_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setData(participations as any)

    } catch (err) {
      console.error("Error fetching participations:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadParticipations()
  }, [])

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this registration?")) return

    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('participations')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Remove from local state
      setData(prev => prev.filter(p => p.id !== id))

    } catch (err) {
      console.error(err)
      alert("Failed to delete. You might not have permission.")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
        <div className="h-[calc(100vh-10rem)] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10 w-full max-w-full">

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-foreground">Team Registrations</h2>
            <p className="text-muted-foreground text-sm">Manage all active event entries for your house.</p>
        </div>
        <Badge variant="outline" className="text-sm px-4 py-1.5 h-9 bg-background/50 backdrop-blur border-border whitespace-nowrap">
            Total Entries: <span className="ml-2 font-bold text-primary">{data.length}</span>
        </Badge>
      </div>

      <Card className="glass-card shadow-sm border-border/50 bg-card/80 w-full overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4 px-4 sm:px-6">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Active Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-4 px-4">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 opacity-40" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">No registrations found</p>
                <p className="text-sm">Start by registering students for events.</p>
              </div>
              <Button
                variant="outline"
                className="mt-2 border-primary/20 hover:bg-primary/5 text-primary"
                onClick={() => window.location.href = '/captain/events'}
              >
                Go to Registration Matrix
              </Button>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
                <Table className="min-w-[600px] sm:min-w-[800px]">
                <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[200px] sm:w-[250px] pl-4 sm:pl-6">Student Name</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead className="w-[180px] sm:w-[200px]">Event</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-4 sm:pr-6">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-4 sm:pl-6">
                            <div className="flex flex-col">
                                <span className="font-semibold text-foreground flex items-center gap-2">
                                    {row.students?.name}
                                </span>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 font-mono">
                                    <span className="flex items-center gap-0.5 bg-muted/50 px-1 rounded">
                                        <Hash className="w-2.5 h-2.5" /> {row.students?.chest_no || 'N/A'}
                                    </span>
                                    {row.students?.class_grade && (
                                        <span className="flex items-center gap-0.5">
                                            <User className="w-2.5 h-2.5" /> Class {row.students.class_grade}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary" className="font-normal text-xs bg-muted text-muted-foreground border-border/50 whitespace-nowrap">
                                {row.students?.section}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-foreground/90">
                            {row.events?.name}
                        </TableCell>
                        <TableCell>
                        <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 border whitespace-nowrap ${
                                row.events?.category === 'ON STAGE'
                                    ? 'border-purple-200 text-black dark:border-purple-800 dark:text-purple-300 bg-purple-950 dark:bg-purple-950/20'
                                    : 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/20'
                            }`}
                        >
                            {row.events?.category}
                        </Badge>
                        </TableCell>
                        <TableCell>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shadow-sm shrink-0 ${
                            row.status === 'registered' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-gray-400'
                            }`} />
                            <span className="capitalize text-sm text-muted-foreground">{row.status}</span>
                        </div>
                        </TableCell>
                        <TableCell className="text-right pr-4 sm:pr-6">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => handleDelete(row.id)}
                            disabled={deletingId === row.id}
                            title="Cancel Registration"
                        >
                            {deletingId === row.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                            <Trash2 className="w-4 h-4" />
                            )}
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}