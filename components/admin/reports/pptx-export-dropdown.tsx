"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Presentation, Loader2, Trophy, GraduationCap, School, Shield, Sparkles } from "lucide-react"
import { fetchAllStudentWinnings } from "@/lib/fetch-student-winnings"
import { generateStudentWinningsPPTX } from "@/lib/student-pptx-service"

interface Props {
  variant?: "default" | "outline" | "secondary"
  size?: "default" | "sm" | "lg"
  className?: string
  studentId?: string
}

export function PptxExportDropdown({
  variant = "default",
  size = "default",
  className = "",
  studentId
}: Props) {
  const [exporting, setExporting] = useState(false)
  const [statusText, setStatusText] = useState("")
  const supabase = createClient()

  const handleExport = async (type: "all" | "champions" | "aliya" | "foundation" | "ishbiliya" | "gulbarga" | "fustat" | "single") => {
    try {
      setExporting(true)
      setStatusText("Fetching data...")

      const { students, champions } = await fetchAllStudentWinnings(supabase)

      let targetStudents = [...students]
      let fileName = "PMSA_Fest_Student_Winnings.pptx"
      let deckTitle = "PMSA Arts Fest 2026-2027 - Student Winnings"
      let includeChampionsSlide = true

      if (type === "single" && studentId) {
        targetStudents = students.filter(s => s.id === studentId)
        const name = targetStudents[0]?.name || "Student"
        fileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_Winnings.pptx`
        deckTitle = `${name} - Winnings Presentation`
        includeChampionsSlide = false
      } else if (type === "champions") {
        const champIds = new Set([
          champions.aliyaKala?.id,
          champions.aliyaSargga?.id,
          champions.fdnKala?.id,
          champions.fdnSargga?.id
        ].filter(Boolean))
        targetStudents = students.filter(s => champIds.has(s.id))
        fileName = "PMSA_Fest_Champions_Deck.pptx"
        deckTitle = "PMSA Arts Fest 2026-2027 - Festival Champions"
      } else if (type === "aliya") {
        targetStudents = students.filter(s => s.section.toLowerCase() === "aliya")
        fileName = "PMSA_Fest_Aliya_Winners.pptx"
        deckTitle = "PMSA Arts Fest 2026-2027 - Aliya Section Winners"
      } else if (type === "foundation") {
        targetStudents = students.filter(s => s.section.toLowerCase() === "foundation")
        fileName = "PMSA_Fest_Foundation_Winners.pptx"
        deckTitle = "PMSA Arts Fest 2026-2027 - Foundation Section Winners"
      } else if (type === "ishbiliya") {
        targetStudents = students.filter(s => s.team.name.toLowerCase().includes("ishbiliya"))
        fileName = "PMSA_Fest_Ishbiliya_Winners.pptx"
        deckTitle = "PMSA Arts Fest 2026-2027 - Team Ishbiliya Winners"
      } else if (type === "gulbarga") {
        targetStudents = students.filter(s => s.team.name.toLowerCase().includes("gulbarga"))
        fileName = "PMSA_Fest_Gulbarga_Winners.pptx"
        deckTitle = "PMSA Arts Fest 2026-2027 - Team Gulbarga Winners"
      } else if (type === "fustat") {
        targetStudents = students.filter(s => s.team.name.toLowerCase().includes("fustat"))
        fileName = "PMSA_Fest_Fustat_Winners.pptx"
        deckTitle = "PMSA Arts Fest 2026-2027 - Team Fustat Winners"
      }

      setStatusText(`Generating ${targetStudents.length} slides...`)

      await generateStudentWinningsPPTX({
        title: deckTitle,
        fileName,
        students: targetStudents,
        champions,
        includeCover: true,
        includeChampionsSlide
      })
    } catch (err) {
      console.error("Failed to generate PPTX:", err)
    } finally {
      setExporting(false)
      setStatusText("")
    }
  }

  if (studentId) {
    return (
      <Button
        onClick={() => handleExport("single")}
        disabled={exporting}
        size={size}
        variant={variant}
        className={className}
      >
        {exporting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating PPT...
          </>
        ) : (
          <>
            <Presentation className="w-4 h-4 mr-2 text-orange-500" />
            PPT Slide
          </>
        )}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={exporting}
          variant={variant}
          size={size}
          className={`shadow-xs font-semibold ${className}`}
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-orange-500" />
              {statusText || "Building PPTX..."}
            </>
          ) : (
            <>
              <Presentation className="w-4 h-4 mr-2 text-orange-600" />
              Export PowerPoint (PPTX)
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white shadow-xl border border-slate-200">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-slate-500 font-bold">
          Student Winnings PPTX Decks
        </DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => handleExport("all")} className="cursor-pointer py-2 font-medium">
          <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
          <span>All Winning Students (Full Deck)</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("champions")} className="cursor-pointer py-2 font-medium">
          <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
          <span>Festival Champions Deck</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-slate-500 font-bold">
          By Section
        </DropdownMenuLabel>

        <DropdownMenuItem onClick={() => handleExport("aliya")} className="cursor-pointer py-2">
          <GraduationCap className="w-4 h-4 mr-2 text-indigo-600" />
          <span>Aliya Winners Deck</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("foundation")} className="cursor-pointer py-2">
          <School className="w-4 h-4 mr-2 text-blue-600" />
          <span>Foundation Winners Deck</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-slate-500 font-bold">
          By House Team
        </DropdownMenuLabel>

        <DropdownMenuItem onClick={() => handleExport("ishbiliya")} className="cursor-pointer py-2">
          <Shield className="w-4 h-4 mr-2 text-emerald-600" />
          <span>Ishbiliya Winners Deck</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("gulbarga")} className="cursor-pointer py-2">
          <Shield className="w-4 h-4 mr-2 text-red-600" />
          <span>Gulbarga Winners Deck</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport("fustat")} className="cursor-pointer py-2">
          <Shield className="w-4 h-4 mr-2 text-blue-600" />
          <span>Fustat Winners Deck</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
