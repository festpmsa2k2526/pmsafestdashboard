"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Trophy, ArrowRight, Gavel, AlertCircle } from "lucide-react"
import { TeamDetailsModal } from "./team-details-modal"
import { PenaltySettingsDialog } from "./penalty-settings-dialog"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function LiveLeaderboard({ refreshTrigger }: { refreshTrigger: number }) {
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [isPenaltyOpen, setIsPenaltyOpen] = useState(false)

  const supabase = createClient()

  const calculateScores = async () => {
    setLoading(true)

    const { data: parts } = await supabase
      .from('participations')
      .select(`
          points_earned,
          teams ( id, name, color_hex ),
          events ( category, applicable_section ),
          students ( section )
        `)
      .gt('points_earned', 0)

    // Fetch teams WITH penalty_points
    const { data: teams } = await supabase.from('teams').select('*')

    if (!parts || !teams) return

    const leaderboard = teams.map((team: any) => {
      const teamParts = parts.filter((p: any) => p.teams?.id === team.id)
      const earnedTotal = teamParts.reduce((sum: number, p: any) => sum + (p.points_earned || 0), 0)
      const penalty = team.penalty_points || 0
      const total = Math.max(0, earnedTotal - penalty) // Ensure score doesn't go below 0 visually if needed, though raw math allows negatives

      const checkSection = (p: any, section: string) => {
        const appSection = p.events?.applicable_section
        return Array.isArray(appSection) && appSection.includes(section)
      }
      const isGen = (p: any) => checkSection(p, 'General')
      const isFnd = (p: any) => checkSection(p, 'Foundation')
      const isSen = (p: any) => checkSection(p, 'Senior')
      const isJun = (p: any) => checkSection(p, 'Junior')
      const isSub = (p: any) => checkSection(p, 'Sub-Junior')

      const general = teamParts.filter(isGen).reduce((s: number, p: any) => s + (p.points_earned || 0), 0)
      const foundation = teamParts.filter(isFnd).reduce((s: number, p: any) => s + (p.points_earned || 0), 0)
      const senior = teamParts.filter((p: any) => isSen(p) && !isGen(p)).reduce((s: number, p: any) => s + (p.points_earned || 0), 0)
      const junior = teamParts.filter((p: any) => isJun(p) && !isGen(p)).reduce((s: number, p: any) => s + (p.points_earned || 0), 0)
      const subJunior = teamParts.filter((p: any) => isSub(p) && !isGen(p) && !isFnd(p)).reduce((s: number, p: any) => s + (p.points_earned || 0), 0)

      return {
        id: team.id,
        name: team.name,
        color: team.color_hex,
        total,
        rawTotal: earnedTotal,
        penalty,
        senior,
        junior,
        subJunior,
        general,
        foundation
      }
    })

    leaderboard.sort((a: any, b: any) => b.total - a.total)
    setScores(leaderboard)
    setLoading(false)
  }

  useEffect(() => {
    calculateScores()
  }, [refreshTrigger])

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>

  return (
    <>
      <div className="flex flex-col h-full bg-white/50 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-sm">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/80 border-b border-border/50 shrink-0">
          <h3 className="font-heading font-bold flex items-center gap-2 text-sm text-slate-800">
            <Trophy className="w-4 h-4 text-primary" /> Team Standings
          </h3>
          <div className="flex items-center gap-2">
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsPenaltyOpen(true)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                        >
                            <Gavel className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Manage Penalties (Minus Marks)</p>
                    </TooltipContent>
                </Tooltip>
             </TooltipProvider>
             <span className="text-[10px] font-mono text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">{scores.length} Teams</span>
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 min-h-0 relative">
          <ScrollArea className="h-full w-full">
            <div className="w-full min-w-max">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                  <TableRow className="border-border/50 hover:bg-transparent h-8">
                    <TableHead className="w-[50px] pl-4 text-[10px] font-bold uppercase tracking-wider h-8">Rank</TableHead>
                    <TableHead className="min-w-[140px] sticky left-0 z-10 bg-slate-50 text-[10px] font-bold uppercase tracking-wider h-8 border-r border-border/50">Team Name</TableHead>
                    <TableHead className="text-center w-20 bg-primary/5 text-primary font-black text-[10px] uppercase tracking-wider h-8 border-x border-primary/10">Total</TableHead>
                    <TableHead className="text-center w-[60px] text-[10px] text-muted-foreground h-8">Senior</TableHead>
                    <TableHead className="text-center w-[60px] text-[10px] text-muted-foreground h-8">Junior</TableHead>
                    <TableHead className="text-center w-[60px] text-[10px] text-muted-foreground h-8">Sub-Jr</TableHead>
                    <TableHead className="text-center w-[60px] text-[10px] text-muted-foreground h-8">General</TableHead>
                    <TableHead className="text-center w-[60px] text-[10px] text-muted-foreground h-8 pr-4">Found.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((team, idx) => (
                    <TableRow
                      key={team.id}
                      className="hover:bg-blue-50/50 border-border/50 cursor-pointer group h-10 transition-colors"
                      onClick={() => setSelectedTeamId(team.id)}
                    >
                      <TableCell className="pl-4 font-mono text-xs text-muted-foreground py-1">
                        {idx === 0 ? <span className="text-lg">🥇</span> :
                          idx === 1 ? <span className="text-lg">🥈</span> :
                            idx === 2 ? <span className="text-lg">🥉</span> :
                              `#${idx + 1}`}
                      </TableCell>
                      <TableCell className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/50 border-r border-border/50 py-1">
                        <div className="flex flex-col justify-center h-full">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-6 rounded-r-md" style={{ backgroundColor: team.color }}></div>
                                <span className="font-semibold text-sm text-slate-700 truncate">{team.name}</span>
                            </div>
                            {team.penalty > 0 && (
                                <div className="pl-4 flex items-center gap-1 text-[9px] text-red-500 font-medium">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    <span>-{team.penalty} penalty</span>
                                </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center bg-primary/5 font-black text-lg text-primary border-x border-primary/10 py-1 shadow-inner relative">
                        {team.total}
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-500 py-1">{team.senior}</TableCell>
                      <TableCell className="text-center text-xs text-slate-500 py-1">{team.junior}</TableCell>
                      <TableCell className="text-center text-xs text-slate-500 py-1">{team.subJunior}</TableCell>
                      <TableCell className="text-center text-xs text-slate-500 py-1">{team.general}</TableCell>
                      <TableCell className="text-center text-xs text-slate-500 py-1 pr-4">{team.foundation}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      <TeamDetailsModal
        teamId={selectedTeamId}
        open={!!selectedTeamId}
        onOpenChange={(open) => !open && setSelectedTeamId(null)}
      />

      <PenaltySettingsDialog
        open={isPenaltyOpen}
        onOpenChange={setIsPenaltyOpen}
        onSuccess={calculateScores}
      />
    </>
  )
}