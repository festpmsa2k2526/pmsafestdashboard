"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Calendar, Trophy, BarChart3, Loader2, TrendingUp, Medal, Activity } from "lucide-react"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { cn } from "@/lib/utils"

// --- TYPES ---
interface Team {
  id: string
  name: string
  color_hex: string
}

interface DashboardStats {
  totalStudents: number
  totalEvents: number
  totalRegistrations: number
  totalPointsAwarded: number
  leadingTeam: {
    name: string
    points: number
    color: string
    medals: { gold: number; silver: number; bronze: number }
  }
}

export default function AdminOverview() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalEvents: 0,
    totalRegistrations: 0,
    totalPointsAwarded: 0,
    leadingTeam: { name: "N/A", points: 0, color: "#000", medals: { gold: 0, silver: 0, bronze: 0 } }
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [pieData, setPieData] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // 1. Fetch Base Counts
        const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true })
        const { count: eventCount } = await supabase.from('events').select('*', { count: 'exact', head: true })
        const { count: regCount } = await supabase.from('participations').select('*', { count: 'exact', head: true })

        // 2. Fetch Data for Calculations
        const { data: teams } = await supabase.from('teams').select('id, name, color_hex') as { data: Team[] | null }
        const { data: participations } = await supabase
            .from('participations')
            .select(`
                team_id,
                points_earned,
                result_position,
                events ( category )
            `)

        if (teams && participations) {
          let totalPoints = 0
          const categories = { 'ON STAGE': 0, 'OFF STAGE': 0 }

          // Aggregate Data Per Team
          const teamStats = teams.map(team => {
            const teamParts = participations.filter((p: any) => p.team_id === team.id)

            const points = teamParts.reduce((sum: number, p: any) => sum + (p.points_earned || 0), 0)
            const participants = teamParts.length

            // Medal Counts
            const gold = teamParts.filter((p: any) => p.result_position === 'FIRST').length
            const silver = teamParts.filter((p: any) => p.result_position === 'SECOND').length
            const bronze = teamParts.filter((p: any) => p.result_position === 'THIRD').length

            totalPoints += points

            return {
              name: team.name.replace(' House', ''),
              fullName: team.name,
              points,
              participants,
              gold,
              silver,
              bronze,
              fill: team.color_hex
            }
          })

          // Aggregate Categories (Pie Chart)
          participations.forEach((p: any) => {
             const cat = p.events?.category as 'ON STAGE' | 'OFF STAGE'
             if (cat && categories[cat] !== undefined) categories[cat]++
          })

          // Find Leader
          const leader = teamStats.reduce((prev, current) => (prev.points > current.points) ? prev : current, teamStats[0])

          // Set State
          setChartData(teamStats.sort((a, b) => b.points - a.points))
          setPieData([
             { name: 'On Stage', value: categories['ON STAGE'], color: '#f97316' }, // Orange
             { name: 'Off Stage', value: categories['OFF STAGE'], color: '#3b82f6' } // Blue
          ])

          setStats({
            totalStudents: studentCount || 0,
            totalEvents: eventCount || 0,
            totalRegistrations: regCount || 0,
            totalPointsAwarded: totalPoints,
            leadingTeam: {
                name: leader.fullName,
                points: leader.points,
                color: leader.fill,
                medals: { gold: leader.gold, silver: leader.silver, bronze: leader.bronze }
            }
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
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">

      {/* HEADER SECTION */}
      <div className="flex flex-col gap-1 px-1">
         <h2 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight">Dashboard Overview</h2>
         <p className="text-sm md:text-base text-muted-foreground">Live analytics and performance metrics.</p>
      </div>

      {/* HERO STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

         {/* LEADING TEAM CARD */}
         <div className="md:col-span-2 relative overflow-hidden rounded-xl p-6 text-white shadow-lg group transition-all hover:shadow-xl min-h-[220px]"
              style={{ background: `linear-gradient(135deg, ${stats.leadingTeam.color} 0%, #1a1a1a 100%)` }}>
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <p className="text-white/80 font-medium text-xs md:text-sm uppercase tracking-wider flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-yellow-400" /> Current Leader
                    </p>
                    <h3 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">{stats.leadingTeam.name}</h3>
                    <div className="text-4xl md:text-5xl font-bold mt-2 text-white/95">
                        {stats.leadingTeam.points} <span className="text-base md:text-lg font-normal text-white/60">pts</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                    <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1.5 rounded-lg backdrop-blur-sm">
                        <Medal className="w-4 h-4 text-yellow-400" /> <span className="font-bold text-sm">{stats.leadingTeam.medals.gold}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1.5 rounded-lg backdrop-blur-sm">
                        <Medal className="w-4 h-4 text-slate-300" /> <span className="font-bold text-sm">{stats.leadingTeam.medals.silver}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1.5 rounded-lg backdrop-blur-sm">
                        <Medal className="w-4 h-4 text-orange-400" /> <span className="font-bold text-sm">{stats.leadingTeam.medals.bronze}</span>
                    </div>
                </div>

                {/* Decorative Icon - Positioned absolutely but adjusted for mobile */}
                <Trophy className="w-32 h-32 md:w-48 md:h-48 absolute -right-4 -bottom-4 md:-right-6 md:-bottom-8 text-white/10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
            </div>
         </div>

         {/* REGISTRATIONS CARD */}
         <Card className="glass-card border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full min-h-[140px]">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Participation</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between">
                    <div>
                        <span className="text-3xl md:text-4xl font-bold text-foreground">{stats.totalRegistrations}</span>
                        <p className="text-xs text-muted-foreground mt-1">Across all events</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                        <BarChart3 className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                </div>
            </CardContent>
         </Card>

         {/* POINTS AWARDED CARD */}
         <Card className="glass-card border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full min-h-[140px]">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">Points Awarded</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between">
                    <div>
                        <span className="text-3xl md:text-4xl font-bold text-foreground">{stats.totalPointsAwarded}</span>
                        <p className="text-xs text-muted-foreground mt-1">Total score distributed</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                        <Activity className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                </div>
            </CardContent>
         </Card>
      </div>

      {/* DETAILED CHARTS ROW - Now responsive grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* MAIN CHART: POINTS VS PARTICIPATION */}
        <Card className="lg:col-span-2 glass-card shadow-md border-border/50 flex flex-col h-[350px] md:h-[450px]">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <TrendingUp className="w-5 h-5 text-primary" /> Team Performance
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">Comparing total points (Bar) against participation count (Line).</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 w-full pl-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            dy={10}
                            interval={0} // Force show all labels
                        />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} hide />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: 'hsl(var(--card))' }}
                            cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                        />
                        <Bar yAxisId="left" dataKey="points" barSize={32} radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                        <Line yAxisId="right" type="monotone" dataKey="participants" stroke="#64748b" strokeWidth={2} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        {/* SECONDARY CHART: DISTRIBUTION */}
        <Card className="lg:col-span-1 glass-card shadow-md border-border/50 flex flex-col h-[350px] md:h-[450px]">
            <CardHeader className="pb-4">
                <CardTitle className="text-base md:text-lg">Event Mix</CardTitle>
                <CardDescription className="text-xs md:text-sm">On Stage vs Off Stage</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Stat */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                    <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.totalEvents}</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Events</div>
                    </div>
                </div>
            </CardContent>
        </Card>

      </div>

      {/* QUICK STATS FOOTER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
         <div className="p-3 md:p-4 rounded-lg bg-muted/30 border border-border/50 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-md shrink-0"><Users className="w-4 h-4"/></div>
            <div className="min-w-0">
                <div className="text-base md:text-lg font-bold truncate">{stats.totalStudents}</div>
                <div className="text-[10px] uppercase text-muted-foreground font-bold truncate">Students</div>
            </div>
         </div>
         <div className="p-3 md:p-4 rounded-lg bg-muted/30 border border-border/50 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-md shrink-0"><Calendar className="w-4 h-4"/></div>
            <div className="min-w-0">
                <div className="text-base md:text-lg font-bold truncate">{stats.totalEvents}</div>
                <div className="text-[10px] uppercase text-muted-foreground font-bold truncate">Events</div>
            </div>
         </div>
      </div>
    </div>
  )
}