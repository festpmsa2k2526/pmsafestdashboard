"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LiveLeaderboard } from "@/components/scoring/live-leaderboard"
import { IndividualLeaderboard } from "@/components/scoring/individual-leaderboard"
import { ChampionsBoard } from "@/components/scoring/champions-board"
import { Button } from "@/components/ui/button"
import { Edit3, RefreshCw } from "lucide-react"

export default function LeaderboardPage() {
  const router = useRouter()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 overflow-hidden pb-2 space-y-4">

      {/* Header Section */}
      <div className="shrink-0 flex items-center justify-between bg-white/50 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm">
         <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold tracking-tight text-foreground">Live Standings</h1>
            <p className="text-muted-foreground text-xs md:text-sm">Real-time championship tracking and statistics.</p>
         </div>

         <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleRefresh} title="Refresh Data">
                <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={() => router.push('/admin/scoring')} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Edit3 className="w-4 h-4" /> Mark Score
            </Button>
         </div>
      </div>

      {/* Champions Section (Top) */}
      <div className="shrink-0">
         <ChampionsBoard refreshTrigger={refreshTrigger} />
      </div>

      {/* Main Content Area (Split View) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Left Side: Team Standings */}
          <div className="h-full min-h-0 overflow-hidden rounded-xl">
             <LiveLeaderboard refreshTrigger={refreshTrigger} />
          </div>

          {/* Right Side: Individual Standings */}
          <div className="h-full min-h-0 overflow-hidden rounded-xl">
             <IndividualLeaderboard refreshTrigger={refreshTrigger} />
          </div>

      </div>
    </div>
  )
}