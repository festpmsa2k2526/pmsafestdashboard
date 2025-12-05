"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { TeamCard } from "@/components/admin/teams/team-card"
import { TeamEditDialog } from "@/components/admin/teams/team-edit-dialog"
import { TeamDetailsDialog } from "@/components/admin/teams/team-details-dialog"
import { Loader2 } from "lucide-react"

// Types
interface Team {
  id: string
  name: string
  slug: string
  color_hex: string
}

interface TeamWithCounts extends Team {
  student_count: number
}

export default function AdminTeams() {
  const [teams, setTeams] = useState<TeamWithCounts[]>([])
  const [loading, setLoading] = useState(true)

  // Modal States
  const [editingTeam, setEditingTeam] = useState<TeamWithCounts | null>(null)
  const [viewingTeam, setViewingTeam] = useState<TeamWithCounts | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)

  const supabase = createClient()

  const loadTeams = async () => {
    try {
      // 1. Fetch Teams
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select('*')
        .order('name')

      if (error) throw error

      const teams = teamsData as unknown as Team[]

      // 2. Fetch Student Counts
      const teamsWithCounts = await Promise.all(
        teams.map(async (team) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)

          return {
            ...team,
            student_count: count || 0
          }
        })
      )

      setTeams(teamsWithCounts)
    } catch (err) {
      console.error("Error loading teams:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeams()
  }, [])

  // Handlers
  const handleEdit = (team: TeamWithCounts) => {
    setEditingTeam(team)
    setIsEditOpen(true)
  }

  const handleView = (team: TeamWithCounts) => {
    setViewingTeam(team)
    setIsViewOpen(true)
  }

  if (loading) {
    return (
        <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">Teams Overview</h2>
        <p className="text-muted-foreground">Manage house teams and view registration statistics.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            onEdit={handleEdit}
            onView={handleView}
          />
        ))}
      </div>

      {/* Modals */}
      <TeamEditDialog
        team={editingTeam}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={loadTeams}
      />

      <TeamDetailsDialog
        team={viewingTeam}
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
      />
    </div>
  )
}