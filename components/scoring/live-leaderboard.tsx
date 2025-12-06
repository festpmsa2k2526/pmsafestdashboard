"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, RefreshCw } from "lucide-react"

export function LiveLeaderboard({ refreshTrigger }: { refreshTrigger: number }) {
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function calculateScores() {
      setLoading(true)

      // 1. Fetch all participations with points > 0
      const { data: parts } = await supabase
        .from('participations')
        .select(`
          points_earned,
          teams ( id, name, color_hex ),
          events ( category, applicable_section ),
          students ( section )
        `)
        .gt('points_earned', 0)

      // 2. Fetch all teams to ensure zero-point teams show up
      const { data: teams } = await supabase.from('teams').select('*')

      if (!parts || !teams) return

      // 3. Aggregate
      const leaderboard = teams.map((team: any) => {
        const teamParts = parts.filter((p: any) => p.teams?.id === team.id)

        // Calculate Total
        const total = teamParts.reduce((sum: number, p: any) => sum + (p.points_earned || 0), 0)

        // Helper to check sections safely
        const checkSection = (p: any, section: string) => {
            const appSection = p.events?.applicable_section
            return Array.isArray(appSection) && appSection.includes(section)
        }

        const isGeneral = (p: any) => checkSection(p, 'General')
        const isSenior = (p: any) => checkSection(p, 'Senior')
        const isJunior = (p: any) => checkSection(p, 'Junior')
        const isSubJunior = (p: any) => checkSection(p, 'Sub-Junior')

        const general = teamParts
            .filter((p: any) => isGeneral(p))
            .reduce((s:number, p:any) => s + (p.points_earned || 0), 0)

        const senior = teamParts
            .filter((p: any) => isSenior(p) && !isGeneral(p))
            .reduce((s:number, p:any) => s + (p.points_earned || 0), 0)

        const junior = teamParts
            .filter((p: any) => isJunior(p) && !isGeneral(p))
            .reduce((s:number, p:any) => s + (p.points_earned || 0), 0)

        const subJunior = teamParts
            .filter((p: any) => isSubJunior(p) && !isGeneral(p))
            .reduce((s:number, p:any) => s + (p.points_earned || 0), 0)

        return {
          id: team.id,
          name: team.name,
          color: team.color_hex,
          total,
          senior,
          junior,
          subJunior,
          general
        }
      })

      // Sort by Total Descending
      leaderboard.sort((a: any, b: any) => b.total - a.total)
      setScores(leaderboard)
      setLoading(false)
    }

    calculateScores()
  }, [refreshTrigger])

  if (loading) return (
    <div className="flex justify-center p-8 bg-card rounded-xl border border-border/50">
        <Loader2 className="animate-spin text-primary" />
    </div>
  )

  return (
    <Card className="glass-card shadow-md border-border/50 overflow-hidden">
      <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
        <CardTitle className="text-lg font-heading flex items-center gap-2 text-foreground">
          <RefreshCw className="w-4 h-4 text-primary" /> Live Standings
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-border/50">
                <TableHead className="w-[35%] text-foreground font-semibold">Team</TableHead>
                <TableHead className="text-center font-bold text-primary">Total</TableHead>
                <TableHead className="text-center text-xs text-muted-foreground md:table-cell">Sen</TableHead>
                <TableHead className="text-center text-xs text-muted-foreground md:table-cell">Jun</TableHead>
                <TableHead className="text-center text-xs text-muted-foreground md:table-cell">Sub</TableHead>
                <TableHead className="text-center text-xs text-muted-foreground md:table-cell">Gen</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {scores.map((team, idx) => (
                <TableRow key={team.id} className="hover:bg-muted/20 border-border/50 transition-colors">
                    <TableCell className="font-medium flex items-center gap-2">
                    <div className="font-mono text-xs text-muted-foreground w-4">{idx + 1}</div>
                    <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: team.color }}></div>
                    <span className="truncate text-sm text-foreground">{team.name}</span>
                    </TableCell>
                    <TableCell className="text-center font-bold text-lg text-primary">
                    {team.total}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm md:table-cell">{team.senior ?? 0}</TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm md:table-cell">{team.junior ?? 0}</TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm md:table-cell">{team.subJunior ?? 0}</TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm md:table-cell">
                        {team.general ?? 0}
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  )
}