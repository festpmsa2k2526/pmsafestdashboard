"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { TeamCard } from "@/components/admin/teams/team-card"
import { TeamEditDialog } from "@/components/admin/teams/team-edit-dialog"
import { TeamDetailsDialog } from "@/components/admin/teams/team-details-dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, Lock, Unlock, Globe, Settings2, ShieldCheck, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

// Types
interface Team {
  id: string
  name: string
  slug: string
  color_hex: string
  access_override: boolean | null
}

interface TeamWithCounts extends Team {
  student_count: number
}

interface AppConfig {
  registration_open: boolean
}

export default function AdminTeams() {
  const [teams, setTeams] = useState<TeamWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [globalOpen, setGlobalOpen] = useState(false)
  const [updatingGlobal, setUpdatingGlobal] = useState(false)

  // Modal States
  const [editingTeam, setEditingTeam] = useState<TeamWithCounts | null>(null)
  const [viewingTeam, setViewingTeam] = useState<TeamWithCounts | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)

  const supabase = createClient()

  const loadData = async () => {
    try {
      const { data: configData } = await supabase.from('app_config').select('registration_open').single()
      const config = configData as unknown as AppConfig
      if (config) setGlobalOpen(config.registration_open)

      const { data: teamsData, error } = await supabase.from('teams').select('*').order('name')
      if (error) throw error

      const teams = teamsData as unknown as Team[]

      const teamsWithCounts = await Promise.all(
        teams.map(async (team) => {
          const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('team_id', team.id)
          return { ...team, student_count: count || 0 }
        })
      )
      setTeams(teamsWithCounts)
    } catch (err) {
      console.error("Error loading data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // --- ACTIONS ---

  const handleGlobalToggle = async (checked: boolean) => {
    setUpdatingGlobal(true)
    try {
        const { error } = await (supabase.from('app_config') as any)
            .update({ registration_open: checked })
            .eq('id', 1)

        if (error) throw error
        setGlobalOpen(checked)
    } catch (err) {
        alert("Failed to update global settings")
    } finally {
        setUpdatingGlobal(false)
    }
  }

  const handleTeamOverride = async (teamId: string, newVal: boolean | null) => {
    // Determine optimistic label for toast if you had one
    try {
        // Optimistic Update
        setTeams(prev => prev.map(t => t.id === teamId ? { ...t, access_override: newVal } : t))

        await (supabase.from('teams') as any)
            .update({ access_override: newVal })
            .eq('id', teamId)
    } catch (err) {
        alert("Failed to update team access")
        loadData() // Revert
    }
  }

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

      {/* HEADER & GLOBAL CONTROL */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h2 className="text-3xl font-heading font-bold tracking-tight text-foreground">Teams Overview</h2>
                <p className="text-muted-foreground mt-1">Manage houses and control registration access.</p>
            </div>

            {/* Global Control Card */}
            <Card className="bg-card border-border/60 shadow-sm w-full md:w-auto overflow-hidden">
                <div className="flex items-center p-1">
                    <div className={`p-3 flex items-center justify-center border-r border-border/50 ${globalOpen ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                        {globalOpen ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <Lock className="w-5 h-5 text-destructive" />}
                    </div>
                    <div className="flex items-center gap-4 px-4 py-2">
                        <div className="flex flex-col">
                            <Label htmlFor="global-lock" className="font-bold text-sm cursor-pointer">Registration Status</Label>
                            <span className={`text-[10px] uppercase font-bold tracking-wider ${globalOpen ? 'text-emerald-600' : 'text-red-600'}`}>
                                {globalOpen ? "Active (Open)" : "Locked (Closed)"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 pl-2 border-l border-border/50">
                             {updatingGlobal && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground"/>}
                             <Switch
                                id="global-lock"
                                checked={globalOpen}
                                onCheckedChange={handleGlobalToggle}
                                className="bg-red-600 data-[state=checked]:bg-emerald-500"
                             />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
      </div>

      {/* TEAMS GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {teams.map((team) => (
          <div key={team.id} className="relative group">
             <TeamCard
                team={team}
                onEdit={handleEdit}
                onView={handleView}
             />

             {/* DROPDOWN ACCESS CONTROL (Top Right) */}
             <div className="absolute top-3 right-3 z-30">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="secondary"
                            size="sm"
                            className={`h-7 px-2 gap-1.5 shadow-sm border border-border/50 transition-all ${
                                team.access_override === true ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200' :
                                team.access_override === false ? 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200' :
                                'bg-white/90 text-muted-foreground hover:bg-white hover:text-foreground'
                            }`}
                        >
                            {team.access_override === true ? <Unlock className="w-3 h-3" /> :
                             team.access_override === false ? <Lock className="w-3 h-3" /> :
                             <Globe className="w-3 h-3" />}

                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                {team.access_override === true ? 'Open' :
                                 team.access_override === false ? 'Locked' :
                                 'Global'}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white">
                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Set Access Rule</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => handleTeamOverride(team.id, null)} className="gap-2 cursor-pointer">
                            <Globe className="w-4 h-4 text-slate-500" />
                            <div className="flex flex-col">
                                <span>Use Global Settings</span>
                                <span className="text-[10px] text-muted-foreground">Follows main switch</span>
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleTeamOverride(team.id, true)} className="gap-2 cursor-pointer focus:bg-emerald-50">
                            <Unlock className="w-4 h-4 text-emerald-600" />
                            <div className="flex flex-col">
                                <span className="text-emerald-700 font-medium">Force Unlock</span>
                                <span className="text-[10px] text-muted-foreground">Always allow access</span>
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleTeamOverride(team.id, false)} className="gap-2 cursor-pointer focus:bg-red-50">
                            <Lock className="w-4 h-4 text-red-600" />
                            <div className="flex flex-col">
                                <span className="text-red-700 font-medium">Force Lock</span>
                                <span className="text-[10px] text-muted-foreground">Always block access</span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
             </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <TeamEditDialog
        team={editingTeam}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={loadData}
      />

      <TeamDetailsDialog
        team={viewingTeam}
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
      />
    </div>
  )
}