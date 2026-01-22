"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal } from "lucide-react"

interface StudentStats {
  name: string
  chestNo: string
  section: string
  teamName: string
  teamColor: string
  totalPoints: number
  first: number
  second: number
  third: number
}

export function TopStudents({ data }: { data: StudentStats[] }) {
  // Sort and take top 5
  const top5 = [...data].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5)

  return (
    <Card className="col-span-1 md:col-span-3 lg:col-span-1 shadow-md border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" /> Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {top5.map((student, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors group">
            <div className="flex items-center gap-3">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm
                ${idx === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-200' :
                  idx === 1 ? 'bg-slate-200 text-slate-700 ring-2 ring-slate-300' :
                  idx === 2 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-200' :
                  'bg-white text-slate-500 border border-slate-200'}
              `}>
                {idx + 1}
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                  {student.name}
                  <span className="text-[10px] font-normal text-slate-400 font-mono">#{student.chestNo}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] mt-0.5">
                  <Badge variant="outline" className="px-1 py-0 h-4 text-[9px] bg-white border-slate-200 text-slate-500">
                    {student.section}
                  </Badge>
                  <span style={{ color: student.teamColor }} className="font-bold">
                    {student.teamName}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className="text-lg font-black text-slate-800 leading-none">{student.totalPoints}</span>
              <div className="flex gap-1">
                {student.first > 0 && <span className="flex items-center text-[9px] bg-yellow-50 text-yellow-700 px-1 rounded border border-yellow-100" title="Firsts">🥇{student.first}</span>}
                {student.second > 0 && <span className="flex items-center text-[9px] bg-slate-100 text-slate-600 px-1 rounded border border-slate-200" title="Seconds">🥈{student.second}</span>}
                {student.third > 0 && <span className="flex items-center text-[9px] bg-orange-50 text-orange-700 px-1 rounded border border-orange-100" title="Thirds">🥉{student.third}</span>}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}