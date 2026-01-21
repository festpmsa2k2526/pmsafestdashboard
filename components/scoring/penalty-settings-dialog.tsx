"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, Save, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface Team {
  id: string
  name: string
  slug: string
  color_hex: string
  penalty_points: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function PenaltySettingsDialog({ open, onOpenChange, onSuccess }: Props) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [penalties, setPenalties] = useState<Record<string, number>>({})

  const supabase = createClient()

  useEffect(() => {
    if (open) {
      fetchTeams()
    }
  }, [open])

  const fetchTeams = async () => {
    setLoading(true)
    const { data } = await supabase.from('teams').select('*').order('name')
    if (data) {
      setTeams(data)
      const initialPenalties: Record<string, number> = {}
      data.forEach((t: any) => {
        initialPenalties[t.id] = t.penalty_points || 0
      })
      setPenalties(initialPenalties)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Map over existing teams to include all required fields (name, slug, etc.)
      // This prevents "not-null constraint" errors during upsert
      const updates = teams.map((team) => ({
        id: team.id,
        name: team.name,
        slug: team.slug, // Required field
        color_hex: team.color_hex, // Required field
        penalty_points: penalties[team.id] ?? 0,
      }))

      // Cast to any to avoid strict type errors with new column
      const { error } = await (supabase.from('teams') as any).upsert(updates)

      if (error) throw error

      toast.success("Penalties updated successfully")
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to update penalties: " + (err.message || "Unknown error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" /> Manage Team Penalties
          </DialogTitle>
          <DialogDescription className="pt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
            <strong>Note:</strong> Minus marks should be assigned based on reports from the
            "Manage Teams" page (e.g., disciplinary issues, late reporting).
            These points will be subtracted from the total score.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            teams.map((team) => (
              <div key={team.id} className="flex items-center justify-between gap-4 p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-8 rounded-r"
                    style={{ backgroundColor: team.color_hex }}
                  />
                  <Label htmlFor={`penalty-${team.id}`} className="font-medium text-slate-700 cursor-pointer">
                    {team.name}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-500">-</span>
                  <Input
                    id={`penalty-${team.id}`}
                    type="number"
                    min="0"
                    value={penalties[team.id] || 0}
                    onChange={(e) =>
                      setPenalties({
                        ...penalties,
                        [team.id]: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-20 text-right font-mono"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} className="bg-red-600 hover:bg-red-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Deductions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}