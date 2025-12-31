"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Trophy, Users, CheckCircle, Activity, TrendingUp, BookOpen, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Bar,
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

// Interfaces
interface Profile { team_id: string }
interface Team { id: string; name: string; color_hex: string }

interface DashboardData {
  team: Team
  totalStudents: number
  totalRegistrations: number
  categoryData: { name: string; value: number; color: string }[]
  sectionData: { name: string; students: number }[]
  recentActivity: any[]
  handbookUrl: string | null // Added field for the link
}

export default function CaptainOverview() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)

        // 1. Get User & Team ID
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', user.id)
          .single()

        const profile = profileData as unknown as Profile
        if (!profile?.team_id) return

        // 2. Fetch Team Details
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', profile.team_id)
          .single()

        const team = teamData as unknown as Team

        // 3. Parallel Fetch: Students, Participations, AND Rulebook Link
        const [studentsRes, partsRes, assetRes] = await Promise.all([
          supabase.from('students').select('section').eq('team_id', profile.team_id),
          supabase.from('participations')
            .select('created_at, events ( name, category, applicable_section )')
            .eq('team_id', profile.team_id)
            .order('created_at', { ascending: false }),
          // Fetch the rulebook link from the new table
          supabase.from('site_assets').select('value').eq('key', 'rulebook_link').single()
        ])

        const students = studentsRes.data || []
        const participations = partsRes.data || []
        const handbookUrl = (assetRes.data as { value: string } | null)?.value || null

        // 4. Process Section Data (Bar Chart)
        const sections = { 'Senior': 0, 'Junior': 0, 'Sub-Junior': 0 }
        students.forEach((s: any) => {
          if (sections[s.section as keyof typeof sections] !== undefined) {
            sections[s.section as keyof typeof sections]++
          }
        })
        const sectionData = Object.entries(sections).map(([name, count]) => ({
          name,
          students: count
        }))

        // 5. Process Category Data (Pie Chart)
        const categories = { 'ON STAGE': 0, 'OFF STAGE': 0, 'GENERAL': 0 }

        participations.forEach((p: any) => {
          const event = p.events
          if (!event) return

          if (Array.isArray(event.applicable_section) && event.applicable_section.includes('General')) {
            categories['GENERAL']++
          } else {
            const cat = event.category
            if (cat && categories[cat as keyof typeof categories] !== undefined) {
              categories[cat as keyof typeof categories]++
            }
          }
        })

        const categoryData = [
          { name: 'On Stage', value: categories['ON STAGE'], color: 'hsl(var(--primary))' },
          { name: 'Off Stage', value: categories['OFF STAGE'], color: '#3b82f6' },
          { name: 'General', value: categories['GENERAL'], color: '#f59e0b' },
        ]

        setData({
          team,
          totalStudents: students.length,
          totalRegistrations: participations.length,
          sectionData,
          categoryData,
          recentActivity: participations.slice(0, 5), // Last 5
          handbookUrl
        })

      } catch (err) {
        console.error("Error loading dashboard", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <div className="h-4 w-48 rounded bg-muted animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (!data) return <div className="p-8 text-center text-muted-foreground">No Team Data Found</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-700 p-2 pb-10">

      {/* HEADER BANNER */}
      <div
        className="relative overflow-hidden rounded-xl p-8 text-white shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${data.team.color_hex} 0%, #000000 150%)`
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight mb-2 text-white">{data.team.name}</h1>
              <p className="opacity-90 font-medium flex items-center gap-2 text-white/80">
                <Trophy className="w-4 h-4" /> Captain's Command Center
              </p>
            </div>

            {/* NEW HANDBOOK BUTTON */}
            {data.handbookUrl && (
              <Button
                onClick={() => window.open(data.handbookUrl!, '_blank')}
                className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-md shadow-lg group transition-all duration-300"
              >
                <BookOpen className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                View Fest Handbook
                <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
              </Button>
            )}
          </div>

          <div className="text-left md:text-right bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/10 min-w-[140px]">
            <div className="text-3xl font-bold font-mono">{data.totalRegistrations}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-75">Active Entries</div>
          </div>
        </div>

        {/* Decorative Blobs */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-black opacity-20 rounded-full blur-2xl"></div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-all glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Strength</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">{data.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">Students registered</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Participation Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">
              {data.totalStudents > 0
                ? Math.round((data.totalRegistrations / (data.totalStudents * 3)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Engagement score</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest Activity</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">+{data.recentActivity.length}</div>
            <p className="text-xs text-muted-foreground mt-1">New entries recently</p>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS ROW */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 1. Student Distribution Bar Chart */}
        <Card className="col-span-1 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="font-heading">Team Composition</CardTitle>
            <CardDescription>Student distribution by section</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sectionData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} stroke="currentColor" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={80}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                      color: 'hsl(var(--card-foreground))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="students" fill={data.team.color_hex} radius={[0, 4, 4, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. Participation Pie Chart */}
        <Card className="col-span-1 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="font-heading">Event Distribution</CardTitle>
            <CardDescription>Registrations by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                      color: 'hsl(var(--card-foreground))'
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RECENT ACTIVITY LIST */}
      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="font-heading">Recent Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recentActivity.map((activity: any, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{activity.events?.name}</p>
                    <p className="text-xs text-muted-foreground">{activity.events?.category}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {new Date(activity.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {data.recentActivity.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">No recent activity.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}