"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface ClassStats {
  className: string
  section: string
  totalPoints: number
}

export function SectionAnalysis({ data }: { data: ClassStats[] }) {
  const [filter, setFilter] = useState("Senior")

  const filteredData = data
    .filter(d => d.section === filter)
    .sort((a, b) => b.totalPoints - a.totalPoints)

  // Dynamic colors for bars
  const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f43f5e']

  return (
    <Card className="col-span-1 shadow-md border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold text-slate-800">Class-wise Analysis</CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Senior">Senior</SelectItem>
            <SelectItem value="Junior">Junior</SelectItem>
            <SelectItem value="Sub-Junior">Sub-Junior</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="className"
                  type="category"
                  width={60}
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="totalPoints" name="Points" radius={[0, 4, 4, 0]} barSize={24}>
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              No data for this section
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}