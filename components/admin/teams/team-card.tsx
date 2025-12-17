"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Trophy, Shield, Edit2, Eye } from "lucide-react"

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

interface TeamCardProps {
  team: TeamWithCounts
  onEdit: (team: TeamWithCounts) => void
  onView: (team: TeamWithCounts) => void
}

export function TeamCard({ team, onEdit, onView }: TeamCardProps) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 bg-card/50 backdrop-blur-sm group flex flex-col h-full relative">
      {/* NOTE: Removed internal access_override badges here to prevent duplication.
        The parent page now handles the lock/unlock UI overlay.
      */}

      {/* Colored Top Border */}
      <div className="h-2 w-full relative" style={{ backgroundColor: team.color_hex }}>
        <div className="absolute inset-0 opacity-50 blur-sm" style={{ backgroundColor: team.color_hex }}></div>
      </div>

      <CardHeader className="pb-2 flex-1 pt-6">
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
        <div className="flex items-center gap-3 mt-2 p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="p-2 rounded-full bg-background shadow-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-heading leading-none">{team.student_count}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Members</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t border-border/50 bg-muted/10 p-3 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-2 text-xs h-8 bg-background hover:bg-muted" onClick={() => onEdit(team)}>
            <Edit2 className="w-3 h-3" /> Edit
        </Button>
        <Button size="sm" className="flex-1 gap-2 text-xs h-8" onClick={() => onView(team)}>
            <Eye className="w-3 h-3" /> Report
        </Button>
      </CardFooter>
    </Card>
  )
}