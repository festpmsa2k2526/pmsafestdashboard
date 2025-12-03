"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Users, Trophy, Shield } from "lucide-react"

// Define interfaces locally to handle TypeScript inference issues
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
  const supabase = createClient()

  useEffect(() => {
    async function loadTeams() {
      try {
        // 1. Fetch Teams
        const { data: teamsData, error } = await supabase
          .from('teams')
          .select('*')
          .order('name')

        if (error) throw error

        const teams = teamsData as unknown as Team[]

        // 2. Fetch Student Counts for each team
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

    loadTeams()
  }, [])

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
        <p className="text-muted-foreground">Manage house teams and view member statistics.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {teams.map((team) => (
          <Card
            key={team.id}
            className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 bg-card/50 backdrop-blur-sm group"
          >
            {/* Colored Top Border with Glow */}
            <div
                className="h-2 w-full relative"
                style={{ backgroundColor: team.color_hex }}
            >
                <div className="absolute inset-0 opacity-50 blur-sm" style={{ backgroundColor: team.color_hex }}></div>
            </div>

            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-heading tracking-tight">{team.name}</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1 text-muted-foreground/80 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {team.slug.toUpperCase()}
                  </CardDescription>
                </div>
                <div
                    className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity"
                    style={{ color: team.color_hex }}
                >
                    <Trophy className="w-4 h-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="p-2 rounded-full bg-background shadow-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                    <span className="text-2xl font-bold font-heading leading-none">{team.student_count}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Members</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] h-5 font-mono text-muted-foreground">
                  ID: {team.id.split('-')[0]}...
                </Badge>

                {/* Color Dot with Tooltip Effect */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Hex:</span>
                    <div className="flex items-center gap-1 font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: team.color_hex }}
                        />
                        {team.color_hex}
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}