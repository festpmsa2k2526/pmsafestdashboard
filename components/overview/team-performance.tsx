"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface TeamStats {
  name: string
  color: string
  totalPoints: number
  first: number
  second: number
  third: number
}

export function TeamPerformance({ data }: { data: TeamStats[] }) {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1 shadow-md border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-slate-800">Team Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="points" className="space-y-4">
          <TabsList className="bg-slate-100 grid w-full grid-cols-2">
            <TabsTrigger value="points" className="text-xs">Total Points</TabsTrigger>
            <TabsTrigger value="positions" className="text-xs">Positions Count</TabsTrigger>
          </TabsList>

          <TabsContent value="points" className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                {/* Single Bar for Total Points */}
                <Bar dataKey="totalPoints" name="Total Points" radius={[4, 4, 0, 0]} barSize={40}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="positions" className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                {/* Stacked Bars for Positions */}
                <Bar dataKey="first" name="First (🥇)" fill="#eab308" stackId="a" radius={[0, 0, 0, 0]} barSize={40} />
                <Bar dataKey="second" name="Second (🥈)" fill="#94a3b8" stackId="a" radius={[0, 0, 0, 0]} barSize={40} />
                <Bar dataKey="third" name="Third (🥉)" fill="#f97316" stackId="a" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}