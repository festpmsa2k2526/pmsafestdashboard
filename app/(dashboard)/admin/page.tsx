"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Calendar, Trophy, BarChart3, Loader2, TrendingUp } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

// Define interfaces to fix TypeScript 'never' errors
interface Team {
  id: string
  name: string
  color_hex: string
}

interface Participation {
  team_id: string
}

export default function AdminOverview() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalEvents: 0,
    totalRegistrations: 0,
    leadingTeam: "N/A",
    leadingPoints: 0
  })
  const [chartData, setChartData] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // 1. Fetch Basic Counts
        const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true })
        const { count: eventCount } = await supabase.from('events').select('*', { count: 'exact', head: true })
        const { count: regCount } = await supabase.from('participations').select('*', { count: 'exact', head: true })

        // 2. Fetch Teams and calculate participation for Chart
        const { data: teamsData } = await supabase.from('teams').select('id, name, color_hex')
        const { data: participationsData } = await supabase.from('participations').select('team_id')

        // Cast data to our interfaces to satisfy TypeScript
        const teams = teamsData as Team[] | null
        const participations = participationsData as Participation[] | null

        if (teams && participations) {
          // Aggregate counts per team
          const teamStats = teams.map(team => {
            const count = participations.filter(p => p.team_id === team.id).length
            return {
              name: team.name.replace(' House', ''), // Shorten name for chart
              participants: count,
              fill: team.color_hex,
              fullTeamName: team.name
            }
          })

          // Find leader
          const leader = teamStats.reduce((prev, current) =>
            (prev.participants > current.participants) ? prev : current
          , { participants: 0, name: 'None' })

          setChartData(teamStats)
          setStats({
            totalStudents: studentCount || 0,
            totalEvents: eventCount || 0,
            totalRegistrations: regCount || 0,
            leadingTeam: leader.name,
            leadingPoints: leader.participants * 5 // Dummy point logic (5 pts per reg)
          })
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">
            Dashboard <span className="text-primary">Overview</span>
        </h2>
        <p className="text-muted-foreground">Real-time statistics and event insights.</p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Students */}
        <Card className="glass-card shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered in system</p>
          </CardContent>
        </Card>

        {/* Card 2: Events */}
        <Card className="glass-card shadow-sm hover:shadow-md transition-all border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground mt-1">Active competitions</p>
          </CardContent>
        </Card>

        {/* Card 3: Registrations */}
        <Card className="glass-card shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registrations</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                <BarChart3 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{stats.totalRegistrations}</div>
            <p className="text-xs text-muted-foreground mt-1">Total student entries</p>
          </CardContent>
        </Card>

        {/* Card 4: Leader */}
        <Card className="glass-card shadow-sm hover:shadow-md transition-all border-l-4 border-l-amber-500 bg-amber-50/10 dark:bg-amber-900/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Leading Team</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                <Trophy className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading text-amber-600 dark:text-amber-500">{stats.leadingTeam}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <TrendingUp className="w-3 h-3 text-amber-500" />
                <span>~{stats.leadingPoints} Points (Est)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="glass-card shadow-md border-border/50">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Participation Analytics</CardTitle>
          <CardDescription>Live registration data by house team</CardDescription>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} stroke="currentColor" />
                <XAxis
                  dataKey="name"
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  opacity={0.5}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  stroke="currentColor"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  opacity={0.5}
                  tickFormatter={(value) => `${value}`}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(var(--border))',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    backgroundColor: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))'
                  }}
                />
                <Bar
                    dataKey="participants"
                    radius={[8, 8, 0, 0]}
                    barSize={60}
                    // Animation
                    animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}