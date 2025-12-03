"use client"

import { useState } from "react"
import { EventScorer } from "@/components/scoring/event-scorer"
import { LiveLeaderboard } from "@/components/scoring/live-leaderboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Info } from "lucide-react"

// UPDATED SECTIONS to separate General On/Off
const SECTIONS = [
  { id: 'SENIOR_ON', label: 'Senior On-Stage', section: 'Senior', cat: 'ON STAGE' },
  { id: 'SENIOR_OFF', label: 'Senior Off-Stage', section: 'Senior', cat: 'OFF STAGE' },
  { id: 'JUNIOR_ON', label: 'Junior On-Stage', section: 'Junior', cat: 'ON STAGE' },
  { id: 'JUNIOR_OFF', label: 'Junior Off-Stage', section: 'Junior', cat: 'OFF STAGE' },
  { id: 'SUB_ON', label: 'Sub-Jr On-Stage', section: 'Sub-Junior', cat: 'ON STAGE' },
  { id: 'SUB_OFF', label: 'Sub-Jr Off-Stage', section: 'Sub-Junior', cat: 'OFF STAGE' },
  { id: 'GENERAL_ON', label: 'General On-Stage', section: 'General', cat: 'ON STAGE' },
  { id: 'GENERAL_OFF', label: 'General Off-Stage', section: 'General', cat: 'OFF STAGE' },
]

export default function ScoringPage() {
  const [activeTab, setActiveTab] = useState(SECTIONS[0].id)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleScoreUpdate = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500 overflow-hidden pb-2 space-y-4">

      <div className="shrink-0 flex items-center justify-between">
         <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Score Registration</h1>
            <p className="text-muted-foreground text-sm">Record winners and update house points in real-time.</p>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

        {/* LEFT PANEL: SCORER */}
        <div className="flex-1 flex flex-col min-h-0 glass-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
           <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
             <div className="shrink-0 border-b border-border/50 bg-muted/30 px-2 pt-2">
                <div className="overflow-x-auto pb-0 scrollbar-none">
                    <TabsList className="h-auto p-0 bg-transparent justify-start gap-6 w-max">
                        {SECTIONS.map(sec => (
                            <TabsTrigger
                                key={sec.id}
                                value={sec.id}
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent px-2 py-3 whitespace-nowrap text-muted-foreground transition-all hover:text-foreground"
                            >
                                {sec.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-card/50">
                {SECTIONS.map(sec => (
                    <TabsContent key={sec.id} value={sec.id} className="mt-0 h-full data-[state=inactive]:hidden">
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

        {/* RIGHT PANEL: LEADERBOARD */}
        <div className="w-full lg:w-[400px] shrink-0 flex flex-col min-h-0 gap-4 overflow-y-auto lg:overflow-hidden pb-1">
             <div className="shrink-0">
                 <LiveLeaderboard refreshTrigger={refreshTrigger} />
             </div>

             {/* Scoring Guide Card */}
             <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 shadow-sm">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-400">
                        <Info className="w-4 h-4" />
                        <p className="font-bold uppercase tracking-wider text-xs">Point System</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-background/80 p-2 rounded border border-border/50 shadow-sm">
                            <div className="font-bold text-foreground">Grade A</div>
                            <div className="text-xs text-muted-foreground mt-1">15, 10, 5</div>
                        </div>
                        <div className="bg-background/80 p-2 rounded border border-border/50 shadow-sm">
                            <div className="font-bold text-foreground">Grade B</div>
                            <div className="text-xs text-muted-foreground mt-1">10, 5, 3</div>
                        </div>
                        <div className="bg-background/80 p-2 rounded border border-border/50 shadow-sm">
                            <div className="font-bold text-foreground">Grade C</div>
                            <div className="text-xs text-muted-foreground mt-1">20, 15, 10</div>
                        </div>
                    </div>
                </CardContent>
             </Card>
        </div>

      </div>
    </div>
  )
}