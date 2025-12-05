"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface Team {
  id: string
  name: string
  slug: string
  color_hex: string
}

interface TeamEditDialogProps {
  team: Team | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function TeamEditDialog({ team, open, onOpenChange, onSuccess }: TeamEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    color_hex: ""
  })

  // Load initial data when team changes
  if (team && formData.name === "" && open) {
    setFormData({
      name: team.name,
      slug: team.slug,
      color_hex: team.color_hex
    })
  }

  const supabase = createClient()

  const handleSave = async () => {
    if (!team) return
    try {
      setLoading(true)

      // FIX: Cast to 'any' to bypass strict TypeScript checking on update object
      const { error } = await (supabase.from('teams') as any)
        .update({
          name: formData.name,
          slug: formData.slug,
          color_hex: formData.color_hex
        })
        .eq('id', team.id)

      if (error) throw error

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert("Failed to update team")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Make changes to the team profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="slug" className="text-right">Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({...formData, slug: e.target.value})}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">Color</Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="color"
                type="color"
                className="w-12 h-10 p-1"
                value={formData.color_hex}
                onChange={(e) => setFormData({...formData, color_hex: e.target.value})}
              />
              <Input
                value={formData.color_hex}
                onChange={(e) => setFormData({...formData, color_hex: e.target.value})}
                placeholder="#000000"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}