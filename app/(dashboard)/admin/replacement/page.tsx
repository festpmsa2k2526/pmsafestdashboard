"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { ReplacementMatrix } from "@/components/admin/ReplacementMatrix"
import { Loader2, Users } from "lucide-react"

interface Team {
  id: string
  name: string
  color_hex: string
}

export default function AdminReplacementPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function fetchTeams() {
      try {
        setLoading(true)
        setDataError(null)

        const { data, error } = await supabase
          .from('teams')
          .select('id, name, color_hex')
          .order('name')

        if (error) {
          console.error("Supabase Query Error:", error)
          setDataError(error.message)
          return
        }

        if (data) {
          const typedData = data as Team[]
          setTeams(typedData)

          if (typedData.length > 0) {
            setSelectedTeam(typedData[0].id)
          } else {
            console.warn("Query succeeded but returned 0 teams.")
          }
        }
      } catch (err) {
        console.error("Unexpected Error:", err)
        setDataError("An unexpected error occurred.")
      } finally {
        setLoading(false)
      }
    }
    fetchTeams()
  }, [])

  const currentTeam = teams.find(t => t.id === selectedTeam)
  const currentTeamName = currentTeam?.name || "Team"

  if (loading) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
        <p className="text-sm text-slate-500 font-medium">Loading teams...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] w-full overflow-hidden">
      {selectedTeam ? (
        <ReplacementMatrix
          teamId={selectedTeam}
          teamName={currentTeamName}
          teams={teams}
          selectedTeam={selectedTeam}
          onSelectTeam={setSelectedTeam}
          dataError={dataError}
        />
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 py-16 bg-white rounded-xl border border-slate-200">
          <Users className="w-12 h-12 opacity-15" />
          <p className="font-medium text-sm">
            {teams.length === 0 ? "No teams available." : "Select a team to begin."}
          </p>
        </div>
      )}
    </div>
  )
}