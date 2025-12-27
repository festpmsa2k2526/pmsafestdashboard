"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { EventScorer } from "@/components/scoring/event-scorer"
import { GradeSettingsDialog } from "@/components/scoring/grade-settings-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Settings, BarChart3 } from "lucide-react"

const SECTIONS = [
  { id: 'SENIOR_ON', label: 'Senior On-Stage', section: 'Senior', cat: 'ON STAGE' },
  { id: 'SENIOR_OFF', label: 'Senior Off-Stage', section: 'Senior', cat: 'OFF STAGE' },
  { id: 'JUNIOR_ON', label: 'Junior On-Stage', section: 'Junior', cat: 'ON STAGE' },
  { id: 'JUNIOR_OFF', label: 'Junior Off-Stage', section: 'Junior', cat: 'OFF STAGE' },
  { id: 'SUB_ON', label: 'Sub-Jr On-Stage', section: 'Sub-Junior', cat: 'ON STAGE' },
  { id: 'SUB_OFF', label: 'Sub-Jr Off-Stage', section: 'Sub-Junior', cat: 'OFF STAGE' },
  { id: 'GENERAL_ON', label: 'General On-Stage', section: 'General', cat: 'ON STAGE' },
  { id: 'GENERAL_OFF', label: 'General Off-Stage', section: 'General', cat: 'OFF STAGE' },
  { id: 'FOUNDATION_ON', label: 'Foundation On-Stage', section: 'Foundation', cat: 'ON STAGE' },
  { id: 'FOUNDATION_OFF', label: 'Foundation Off-Stage', section: 'Foundation', cat: 'OFF STAGE' },
]

export default function ScoringPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(SECTIONS[0].id)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleScoreUpdate = () => {
    // Optional: Refresh logic if needed
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 overflow-hidden pb-2 space-y-3">

      {/* Header Section */}
      <div className="shrink-0 flex items-center justify-between bg-white/60 backdrop-blur-md p-3 rounded-xl border border-border/50 shadow-sm">
         <div>
            <h1 className="text-xl md:text-2xl font-heading font-bold tracking-tight text-foreground">Score Registration</h1>
            <p className="text-muted-foreground text-xs hidden md:block">Record winners and update house points in real-time.</p>
         </div>

         <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)} className="gap-2 h-8 text-xs">
                <Settings className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Rules</span>
            </Button>
            <Button size="sm" onClick={() => router.push('/admin/leaderboard')} className="gap-2 h-8 text-xs bg-slate-900 text-white hover:bg-slate-800">
                <BarChart3 className="w-3.5 h-3.5" /> Leaderboard
            </Button>
         </div>
      </div>

      {/* Main Scoring Area */}
      <div className="flex-1 flex flex-col min-h-0 glass-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
           <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">

             {/* Mega Highlight Tabs */}
             <div className="shrink-0 border-b border-border/50 bg-white/50 px-2 pt-2">
                <div className="overflow-x-auto pb-2 scrollbar-none">
                    <TabsList className="h-auto p-1 bg-muted/20 justify-start gap-2 w-max rounded-lg">
                        {SECTIONS.map(sec => (
                            <TabsTrigger
                                key={sec.id}
                                value={sec.id}
                                className="
                                    px-4 py-2 text-xs md:text-sm font-semibold rounded-md transition-all duration-200
                                    data-[state=active]:bg-primary
                                    data-[state=active]:text-primary-foreground
                                    data-[state=active]:shadow-md
                                    data-[state=active]:scale-105
                                    text-muted-foreground hover:text-foreground hover:bg-muted/50
                                "
                            >
                                {sec.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto bg-slate-50/50 relative">
                {SECTIONS.map(sec => (
                    <TabsContent key={sec.id} value={sec.id} className="mt-0 h-full p-2 md:p-4 data-[state=inactive]:hidden">
                        <EventScorer
                            section={sec.section}
                            category={sec.cat}
                            onScoreSaved={handleScoreUpdate}
                        />
                    </TabsContent>
                ))}
             </div>
           </Tabs>
      </div>

      <GradeSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onSuccess={handleScoreUpdate}
      />
    </div>
  )
}