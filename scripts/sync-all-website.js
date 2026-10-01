const fs = require('fs');
const path = require('path');

const websiteRoot = 'D:/masa/dev/fest-2026-website';

// =========================================================================
// 1. UPDATE app/results/page.tsx
// =========================================================================
const resultsPageCode = `'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  motion, 
  useMotionValue, 
  useAnimationFrame 
} from 'framer-motion';
import { 
  Trophy, ChevronLeft, Table, Zap, RefreshCw, Loader2, Grid, List, Search, X, Filter, Medal, Award
} from 'lucide-react';

const CATEGORIES = ["All", "Aliya", "Foundation", "General", "On Stage", "Off Stage"];

type Winner = {
  pos: number;
  posLabel: string;
  name: string;
  chest_no?: string | null;
  teamId: string;
  teamName: string;
  teamColor: string;
  grade: string | null;
  points: number;
};

type EventCard = {
  id: string;
  eventName: string;
  event_code: string;
  category: string;
  section: string;
  grade_type: string;
  winners: Winner[];
};

// ==========================================
// RESULT CARD COMPONENT
// ==========================================
const ResultCard = ({ event, className = "" }: { event: EventCard, className?: string }) => {
  return (
    <div className={\`bg-white rounded-2xl border-2 border-amber-100 shadow-md overflow-hidden flex flex-col h-full hover:shadow-xl hover:border-[#caa02f] transition-all duration-300 \${className}\`}>
        <div className="bg-gradient-to-r from-[#b88e22] via-[#caa02f] to-[#dfb73e] p-4 text-white">
            <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black bg-black/20 px-2 py-0.5 rounded text-amber-100 uppercase tracking-widest">
                    {event.section}
                  </span>
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white uppercase">
                    {event.category}
                  </span>
                </div>
                <div className="text-[10px] bg-white/25 px-2 py-0.5 rounded text-white font-mono font-bold shrink-0">
                  {event.event_code || 'EVENT'}
                </div>
            </div>
            <h3 className="font-black text-lg leading-tight mt-2 text-white drop-shadow-xs">{event.eventName}</h3>
        </div>

        <div className="p-4 flex-1 space-y-3 bg-white">
            {event.winners.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                Awaiting results adjudication...
              </div>
            ) : (
              event.winners.map((winner, idx) => {
                const teamHex = winner.teamColor || "#caa02f";
                const isFirst = winner.pos === 1;
                const isSecond = winner.pos === 2;
                const isThird = winner.pos === 3;

                return (
                    <div key={idx} className="flex items-center justify-between border-b last:border-0 border-slate-100 pb-2.5 last:pb-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={\`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-xs \${
                              isFirst ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300' :
                              isSecond ? 'bg-slate-200 text-slate-800 ring-2 ring-slate-300' :
                              isThird ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-200' :
                              'bg-slate-100 text-slate-600'
                            }\`}>
                              {winner.pos}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-900 truncate">
                                  {winner.name}
                                </div>
                                <div className="text-xs font-semibold flex items-center gap-1.5 mt-0.5">
                                  {winner.chest_no && (
                                    <span className="font-mono text-[10px] bg-slate-100 px-1 rounded text-slate-600">
                                      #{winner.chest_no}
                                    </span>
                                  )}
                                  <span className="truncate" style={{ color: teamHex }}>
                                    {winner.teamName}
                                  </span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                            <div className="text-base font-black text-slate-900">
                              +{winner.points} <span className="text-[10px] font-normal text-slate-400">pts</span>
                            </div>
                            {winner.grade ? (
                              <div className={\`text-[10px] font-black px-1.5 py-0.5 rounded inline-block uppercase \${
                                winner.grade === 'A+' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                winner.grade === 'A' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                winner.grade === 'B' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }\`}>
                                Grade {winner.grade}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">Rank Only</div>
                            )}
                        </div>
                    </div>
                );
              })
            )}
        </div>
    </div>
  );
};

// ==========================================
// DRAGGABLE MARQUEE COMPONENT
// ==========================================
const DraggableMarquee = ({ events }: { events: EventCard[] }) => {
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      setContentWidth(containerRef.current.scrollWidth / 2);
    }
  }, [events]);

  useAnimationFrame((t, delta) => {
    if (isDragging || contentWidth === 0) return;
    const speed = -0.07; 
    const moveBy = speed * delta; 
    let newX = x.get() + moveBy;

    if (newX <= -contentWidth) {
      newX = 0;
    }

    x.set(newX);
  });

  return (
    <div className="overflow-hidden w-full py-4 cursor-grab active:cursor-grabbing select-none relative">
      <motion.div
        ref={containerRef}
        className="flex gap-6 w-max"
        style={{ x }}
        drag="x"
        dragConstraints={{ right: 0, left: -contentWidth }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
      >
        {[...events, ...events].map((event, index) => (
          <div key={\`\${event.id}-\${index}\`} className="w-[320px] md:w-[360px] shrink-0">
            <ResultCard event={event} />
          </div>
        ))}
      </motion.div>
    </div>
  );
};

// ==========================================
// MAIN RESULTS PAGE
// ==========================================
export default function ResultsPage() {
  const [eventResults, setEventResults] = useState<EventCard[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAll, setShowAll] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/data?t=' + Date.now(), { cache: 'no-store' });
      const json = await res.json();

      if (json.success) {
        setTeams(json.teams || []);
        setEventResults(json.events || []);
        setBreakdown(json.breakdown || []);
        setLastUpdated(new Date(json.lastUpdated || Date.now()));
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30 seconds auto-refresh
    return () => clearInterval(interval);
  }, []);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return eventResults.filter(e => {
      // 1. Category / Section Filter
      let matchesCategory = true;
      if (selectedCategory !== 'All') {
        const secLower = (e.section || '').toLowerCase();
        const catLower = (e.category || '').toLowerCase();
        const selLower = selectedCategory.toLowerCase();

        if (selLower === 'on stage') matchesCategory = catLower.includes('on');
        else if (selLower === 'off stage') matchesCategory = catLower.includes('off');
        else matchesCategory = secLower.includes(selLower);
      }

      // 2. Search Query
      let matchesSearch = true;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const inEvent = e.eventName.toLowerCase().includes(q) || (e.event_code || '').toLowerCase().includes(q);
        const inWinners = e.winners.some(w => 
          w.name.toLowerCase().includes(q) || 
          (w.chest_no && w.chest_no.toLowerCase().includes(q)) ||
          w.teamName.toLowerCase().includes(q)
        );
        matchesSearch = inEvent || inWinners;
      }

      return matchesCategory && matchesSearch;
    });
  }, [eventResults, selectedCategory, searchQuery]);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-50 via-slate-50 to-white text-slate-800 font-sans selection:bg-[#caa02f] selection:text-white">
      {/* HEADER */}
      <header className="relative bg-[#caa02f] text-white py-12 px-6 border-b border-[#b88e22] shadow-lg">
         <div className="container mx-auto">
             <div className="flex items-center justify-between gap-4 mb-6">
                 <a href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-black uppercase tracking-wider bg-black/10 px-4 py-2 rounded-full border border-white/20">
                   <ChevronLeft className="w-4 h-4" /> Back to Fest Home
                 </a>
                 <div className="flex items-center gap-2 bg-black/15 px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-mono">
                   <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                   <span>LIVE SYSTEM</span>
                 </div>
             </div>

             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black tracking-widest text-amber-100 uppercase mb-3 border border-white/30">
                      AAWA 26-27 • 29 Sep, 30 Sep & 01 Oct 2026
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black mb-2 flex items-center gap-3 text-white drop-shadow-sm">
                      <Trophy className="w-10 h-10 md:w-12 md:h-12 text-white" /> AAWA '26 Results
                    </h1>
                    <p className="text-white/90 max-w-lg text-lg font-medium">Official Scoreboard & Live Results Feed • When Values Speak</p>
                </div>
                <div className="text-right text-xs text-white bg-white/15 px-4 py-2 rounded-xl border border-white/30 shadow-md">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                    <button onClick={fetchData} title="Refresh" className="ml-2 p-1 hover:text-amber-200 transition-colors">
                      <RefreshCw className={\`w-3.5 h-3.5 inline \${loading ? 'animate-spin' : ''}\`} />
                    </button>
                </div>
             </div>
         </div>
      </header>

      {/* BODY */}
      <div className="container mx-auto px-6 py-12 space-y-16">
          {/* CATEGORY BREAKDOWN TABLE */}
          <section>
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-slate-900">
                <Table className="w-6 h-6 text-[#caa02f]" /> House Standings & Category Breakdown
              </h2>
              <div className="bg-white rounded-2xl shadow-lg border-2 border-white overflow-hidden">
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-amber-50/70 text-slate-700 font-black uppercase tracking-wider border-b border-amber-200/60">
                              <tr>
                                  <th className="px-6 py-4">House / Team</th>
                                  <th className="px-6 py-4 text-center">Aliya</th>
                                  <th className="px-6 py-4 text-center">Foundation</th>
                                  <th className="px-6 py-4 text-center">General</th>
                                  <th className="px-6 py-4 text-center text-blue-700">On Stage</th>
                                  <th className="px-6 py-4 text-center text-emerald-700">Off Stage</th>
                                  <th className="px-6 py-4 text-right text-[#caa02f] font-black">Total Score</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {breakdown.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                                    Loading team breakdown...
                                  </td>
                                </tr>
                              ) : (
                                breakdown.map((row, idx) => (
                                  <tr key={row.id} className="hover:bg-amber-50/40 transition-colors">
                                      <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                                        <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: row.color || "#caa02f" }}></span>
                                        <div className="flex flex-col">
                                          <span>{row.name}</span>
                                          <span className="text-[10px] text-slate-400 font-mono">RANK #{idx+1}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-center text-slate-700 font-mono font-bold">{row.stats.aliya || 0}</td>
                                      <td className="px-6 py-4 text-center text-slate-700 font-mono font-bold">{row.stats.foundation || 0}</td>
                                      <td className="px-6 py-4 text-center text-slate-700 font-mono font-bold">{row.stats.general || 0}</td>
                                      <td className="px-6 py-4 text-center text-blue-700 font-mono font-bold bg-blue-50/30">{row.stats.onStage || 0}</td>
                                      <td className="px-6 py-4 text-center text-emerald-700 font-mono font-bold bg-emerald-50/30">{row.stats.offStage || 0}</td>
                                      <td className="px-6 py-4 text-right font-black text-xl text-[#caa02f]">{row.stats.total}</td>
                                  </tr>
                                ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </section>

          {/* LIVE RESULTS FEED */}
          <section className="pb-20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                 <h2 className="text-2xl font-black flex items-center gap-2 text-slate-900">
                   <Zap className="w-6 h-6 text-[#caa02f]" /> Published Results Feed ({filteredEvents.length})
                 </h2>
                 <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#caa02f]" />
                       <input 
                         type="text" 
                         placeholder="Search events, chest no, or winners..." 
                         value={searchQuery} 
                         onChange={(e) => setSearchQuery(e.target.value)} 
                         className="pl-10 pr-4 py-2 bg-white border border-amber-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#caa02f] w-64 md:w-80 transition-all shadow-sm"
                       />
                       {searchQuery && (
                         <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
                           <X className="w-3 h-3" />
                         </button>
                       )}
                    </div>
                    <button 
                      onClick={() => setShowAll(!showAll)} 
                      className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:bg-amber-50 px-4 py-2 rounded-xl transition-colors border border-amber-200 bg-white shadow-sm"
                    >
                      {showAll ? <List className="w-4 h-4 text-[#caa02f]" /> : <Grid className="w-4 h-4 text-[#caa02f]" />} 
                      <span className="hidden sm:inline">{showAll ? "Grid View" : "Scroll View"}</span>
                    </button>
                 </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => setSelectedCategory(cat)} 
                      className={\`px-4 py-2 rounded-full text-xs font-black transition-all border \${selectedCategory === cat ? 'bg-[#caa02f] text-white border-[#caa02f] shadow-md' : 'bg-white text-slate-700 border-amber-200 hover:border-[#caa02f]'}\`}
                    >
                      {cat}
                    </button>
                  ))}
              </div>
              
              <div className="w-full relative min-h-[300px]">
                   {filteredEvents.length > 0 ? (
                     <>
                       {showAll || searchQuery !== '' || selectedCategory !== 'All' ? (
                         <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredEvents.map((event, i) => <ResultCard key={\`\${event.id}-\${i}\`} event={event} className="w-full" />)}
                         </motion.div>
                       ) : (
                         <DraggableMarquee events={filteredEvents} />
                       )}
                     </>
                   ) : (
                     <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-amber-200 rounded-2xl bg-white/80 shadow-sm">
                        <Filter className="w-10 h-10 mb-3 opacity-30 text-[#caa02f]" />
                        <p className="font-bold text-slate-700">No results found.</p>
                        <p className="text-xs mt-1 text-slate-500">Results will appear here as soon as they are published by the jury.</p>
                        {(searchQuery || selectedCategory !== 'All') && (
                          <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="mt-4 text-xs font-bold text-[#caa02f] hover:underline">Clear Filters</button>
                        )}
                     </div>
                   )}
              </div>
          </section>
      </div>
    </main>
  );
}
`;

fs.writeFileSync(path.join(websiteRoot, 'app/results/page.tsx'), resultsPageCode, 'utf8');
console.log('Successfully updated D:/masa/dev/fest-2026-website/app/results/page.tsx');

// =========================================================================
// 2. UPDATE app/tv/page.tsx (LIVE TV SCREEN)
// =========================================================================
const tvPageCode = `'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Loader2, Sparkles, Award } from 'lucide-react';

const SLIDE_INTERVAL = 8000;
const BATCH_SIZE = 2;

const LIVE_UPDATES = [
  "Official Live Scoreboard • PMSA ARTS FEST 2026-27",
  "Scores update in real-time as jury publishes marks",
  "Aliya • Foundation • General Sections Live",
  "When Values Speak • AAWA '26",
];

// 1. Live Clock Component
const LiveClock = () => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 bg-[#17130a]/80 border border-[#caa02f]/40 px-5 py-2.5 rounded-2xl shadow-lg backdrop-blur-md">
      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
      <div className="font-mono font-black text-2xl text-amber-200 tracking-wider">
        {time || '--:--:--'}
      </div>
    </div>
  );
};

// 2. Score Table for Right Side on TV
const ScoreTable = ({ data, loading }: { data: any[]; loading: boolean }) => {
  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-[#caa02f]/30">
        <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#caa02f]" /> Standings
        </h2>
        <span className="text-[10px] uppercase font-bold text-amber-200/70 bg-[#caa02f]/10 border border-[#caa02f]/30 px-2.5 py-1 rounded-full">
          Live Points
        </span>
      </div>

      <div className="flex-1 my-3 overflow-y-auto space-y-2.5 pr-1">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-amber-200/50 space-y-2">
            <Loader2 className="w-7 h-7 animate-spin text-[#caa02f]" />
            <p className="text-xs font-mono">Syncing scores...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-amber-200/40 text-xs italic">
            Waiting for score data...
          </div>
        ) : (
          data.map((team, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className={\`p-3 rounded-xl border flex items-center justify-between relative overflow-hidden transition-all \${
                  isFirst
                    ? 'bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border-amber-400/60 shadow-[0_0_20px_rgba(202,160,47,0.2)]'
                    : isSecond
                    ? 'bg-slate-500/15 border-slate-400/40'
                    : isThird
                    ? 'bg-amber-900/20 border-amber-700/40'
                    : 'bg-[#1a150b]/80 border-[#caa02f]/20'
                }\`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={\`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm font-mono \${
                      isFirst
                        ? 'bg-[#caa02f] text-black font-extrabold shadow-md'
                        : isSecond
                        ? 'bg-slate-300 text-black'
                        : isThird
                        ? 'bg-amber-700 text-white'
                        : 'bg-white/10 text-white/70'
                    }\`}
                  >
                    #{idx + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="font-black text-white text-base truncate flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: team.color || '#caa02f' }}
                      ></span>
                      <span className="truncate">{team.name}</span>
                    </div>
                    <div className="text-[10px] text-amber-200/60 font-mono flex items-center gap-2 mt-0.5">
                      <span>AL: {team.stats?.aliya || 0}</span>
                      <span>•</span>
                      <span>FD: {team.stats?.foundation || 0}</span>
                      <span>•</span>
                      <span>GEN: {team.stats?.general || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <div className="font-black font-mono text-2xl text-amber-300">
                    {team.stats?.total || 0}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-amber-200/50 font-bold">
                    Points
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

// 3. Result Ticker on TV Bottom
const ResultTicker = ({ events }: { events: any[] }) => {
  return (
    <div className="overflow-hidden whitespace-nowrap w-full py-2 relative flex items-center">
      <motion.div
        className="flex gap-6 w-max items-center"
        animate={{ x: [0, -2500] }}
        transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
      >
        {[...events, ...events, ...events].map((ev, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-3 bg-[#17130a] border border-[#caa02f]/40 px-4 py-2 rounded-xl shadow-lg shrink-0"
          >
            <div className="text-xs font-black uppercase text-amber-400 bg-[#caa02f]/20 px-2 py-0.5 rounded border border-[#caa02f]/40">
              {ev.section || 'Event'}: {ev.eventName}
            </div>

            <div className="flex items-center gap-3 text-xs">
              {ev.winners.slice(0, 3).map((w: any, wIdx: number) => (
                <div key={wIdx} className="flex items-center gap-1.5">
                  <span
                    className={\`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black \${
                      w.pos === 1 ? 'bg-amber-400 text-black' : w.pos === 2 ? 'bg-slate-300 text-black' : 'bg-orange-700 text-white'
                    }\`}
                  >
                    {w.pos}
                  </span>
                  <span className="font-bold text-white max-w-[140px] truncate">{w.name}</span>
                  {w.grade && (
                    <span className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {w.grade}
                    </span>
                  )}
                  <span className="text-amber-200/60 font-mono text-[10px]">+{w.points}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

// 4. MAIN TV ARENA PAGE
export default function TvScreenPage() {
  const [breakdown, setBreakdown] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchIndex, setBatchIndex] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/data?t=' + Date.now(), { cache: 'no-store' });
      const json = await res.json();

      if (json.success) {
        setBreakdown(json.breakdown || []);
        setEvents(json.events || []);
      }
    } catch (error) {
      console.error("TV Page error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  // Fetch images from storage or placeholders
  useEffect(() => {
    async function loadImages() {
      try {
        const res = await fetch('/api/data');
        // Add sample visuals if storage empty
      } catch (e) {}
    }
    loadImages();
  }, []);

  return (
    <div className="bg-[#0b0904] h-screen w-screen overflow-hidden text-white font-sans flex flex-col justify-between relative select-none">
      {/* 1. TOP HEADER */}
      <header className="h-[12vh] flex items-center justify-between px-8 border-b border-[#caa02f]/20 bg-[#120f06]/90 backdrop-blur-md z-50">
        <div className="flex items-center gap-6">
          <img
            src="/Logo_White.png"
            alt="Logo"
            className="h-16 w-auto object-contain drop-shadow-[0_0_20px_rgba(202,160,47,0.4)]"
            onError={(e: any) => { e.target.style.display = 'none'; }}
          />
          <div className="h-10 w-px bg-[#caa02f]/30"></div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              AAWA LIVE ARENA <span className="text-xs px-2.5 py-0.5 rounded bg-[#caa02f] text-[#0b0904] font-black uppercase">Live</span>
            </h1>
            <p className="text-[#caa02f] font-bold tracking-widest text-xs uppercase">
              AAWA PMSA Arts Fest 26-27 • When Values Speak
            </p>
          </div>
        </div>
        <LiveClock />
      </header>

      {/* 2. MAIN CENTER AREA */}
      <main className="flex-1 flex gap-6 px-8 py-4 relative z-10 box-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#caa02f15_0%,transparent_70%)] opacity-30 pointer-events-none"></div>

        {/* LEFT COL: PROMINENT BRANDING / VISUAL STAGE */}
        <div className="flex-1 h-full rounded-2xl bg-gradient-to-br from-[#181308] via-[#0f0c05] to-[#1a150a] border border-[#caa02f]/30 p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#caa02f]/20 border border-[#caa02f]/40 text-amber-300 text-xs font-black uppercase tracking-widest mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Stage Arena Live Feed
            </div>
            <h2 className="text-5xl font-black text-white tracking-tight leading-none mb-3">
              When Values<br /><span className="text-[#caa02f]">Speak.</span>
            </h2>
            <p className="text-amber-100/70 text-base max-w-md font-medium">
              Official live scores and event winner announcements for Aliya, Foundation & General categories.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-4 pt-6 border-t border-[#caa02f]/20">
            <div className="bg-black/40 border border-white/10 p-4 rounded-xl text-center">
              <div className="text-xs text-amber-200/60 font-bold uppercase">Total Events</div>
              <div className="text-3xl font-black text-white font-mono mt-1">94</div>
            </div>
            <div className="bg-black/40 border border-white/10 p-4 rounded-xl text-center">
              <div className="text-xs text-amber-200/60 font-bold uppercase">Houses</div>
              <div className="text-3xl font-black text-amber-400 font-mono mt-1">3</div>
            </div>
            <div className="bg-black/40 border border-white/10 p-4 rounded-xl text-center">
              <div className="text-xs text-amber-200/60 font-bold uppercase">Results Out</div>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-1">{events.length}</div>
            </div>
          </div>
        </div>

        {/* RIGHT COL: SCOREBOARD */}
        <div className="w-[42%] max-w-[540px] shrink-0 h-full flex flex-col">
          <div className="bg-[#141007] rounded-2xl shadow-2xl overflow-hidden h-full border border-[#caa02f]/40 relative p-4 flex flex-col justify-between">
            <ScoreTable data={breakdown} loading={loading} />
            <div className='text-[10px] text-amber-200/50 w-full text-center pt-2 border-t border-white/5'>
              Official score tabulation system • PMSA Arts Fest 26-27
            </div>
          </div>
        </div>
      </main>

      {/* 3. FOOTER AREA */}
      <div className="flex flex-col bg-[#0b0904] shadow-2xl z-40 relative">
        <div className="border-t border-[#caa02f]/20 bg-[#0d0a04] px-4 py-1.5">
          {events.length > 0 ? (
            <ResultTicker events={events} />
          ) : (
            <div className="py-2.5 text-center text-amber-200/40 font-bold text-xs uppercase tracking-widest animate-pulse">
              Official Jury Scoring In Progress • Results Will Scroll Here Live
            </div>
          )}
        </div>

        {/* NOTIFICATION TICKER */}
        <div className="h-[4vh] bg-[#caa02f] flex items-center overflow-hidden relative">
          <div className="bg-[#0b0904] h-full px-6 flex items-center gap-2 z-20 skew-x-[-12deg] -ml-4 shadow-lg border-r-2 border-[#caa02f]">
            <Zap className="w-4 h-4 text-[#caa02f] animate-pulse skew-x-[12deg]" />
            <span className="text-[#caa02f] font-black uppercase tracking-widest text-xs skew-x-[12deg]">
              Live Feed
            </span>
          </div>

          <motion.div
            className="flex whitespace-nowrap gap-8 items-center pl-10"
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
          >
            {[...LIVE_UPDATES, ...LIVE_UPDATES, ...LIVE_UPDATES].map((txt, i) => (
              <span key={i} className="text-[#0b0904] font-black text-xs uppercase flex items-center gap-4">
                {txt}
                <span className="w-1.5 h-1.5 bg-[#0b0904] rounded-full"></span>
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(websiteRoot, 'app/tv/page.tsx'), tvPageCode, 'utf8');
console.log('Successfully updated D:/masa/dev/fest-2026-website/app/tv/page.tsx');

// =========================================================================
// 3. UPDATE app/page.tsx (HOMEPAGE & LIVE DASHBOARD)
// =========================================================================
let pageCode = fs.readFileSync(path.join(websiteRoot, 'app/page.tsx'), 'utf8');

// Replace the category breakdown bars inside LiveDashboard
const oldBarsRegex = /<div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/motion\.div>/;

const newBars = `<div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {/* Aliya Section */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600 font-bold w-16">Aliya</span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: \`\${team.points > 0 ? ((team.sections?.aliya || 0) / team.points) * 100 : 0}%\` }}
                        transition={{ duration: 1 }}
                        className="h-full bg-blue-600"
                      />
                    </div>
                    <span className="text-slate-900 font-mono font-bold">{team.sections?.aliya || 0}</span>
                  </div>

                  {/* Foundation Section */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600 font-bold w-16">Foundation</span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: \`\${team.points > 0 ? ((team.sections?.foundation || 0) / team.points) * 100 : 0}%\` }}
                        transition={{ duration: 1, delay: 0.1 }}
                        className="h-full bg-emerald-600"
                      />
                    </div>
                    <span className="text-slate-900 font-mono font-bold">{team.sections?.foundation || 0}</span>
                  </div>

                  {/* General Section */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600 font-bold w-16">General</span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: \`\${team.points > 0 ? ((team.sections?.general || 0) / team.points) * 100 : 0}%\` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="h-full bg-[#caa02f]"
                      />
                    </div>
                    <span className="text-slate-900 font-mono font-bold">{team.sections?.general || 0}</span>
                  </div>
                </div>
              </div>
            </motion.div>`;

if (oldBarsRegex.test(pageCode)) {
  pageCode = pageCode.replace(oldBarsRegex, newBars);
  console.log('Replaced LiveDashboard category bars in app/page.tsx');
}

// Update fetchHomeData in app/page.tsx
const oldFetchRegex = /const fetchHomeData = async \(\) => \{[\s\S]*?finally\s*\{[\s\S]*?setLoading\(false\);[\s\S]*?\}[\s\S]*?\};/;

const newFetch = `const fetchHomeData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Images from Storage if available
        try {
          const { data: files } = await supabase.storage.from('fest-highlights').list();
          if (files) {
            const urls = files
              .filter(f => f.name !== '.emptyFolderPlaceholder')
              .map(f => supabase.storage.from('fest-highlights').getPublicUrl(f.name).data.publicUrl);
            setHighlightImages(urls);
          }
        } catch (e) {}

        // 2. Fetch Live Scores from /api/data
        const res = await fetch('/api/data?t=' + Date.now(), { cache: 'no-store' });
        const json = await res.json();

        if (json.success && json.teams) {
           const calculatedTeams = json.teams.map((team: any) => ({
              id: team.id,
              name: team.name,
              points: team.points || 0,
              color: team.color_hex ? \`from-[\${team.color_hex}] to-slate-900\` : "from-[#caa02f] to-amber-700",
              colorHex: team.color_hex,
              sections: team.sections || { aliya: 0, foundation: 0, general: 0 },
              categories: team.categories || { onStage: 0, offStage: 0 }
           }));
           setTeamData(calculatedTeams);
        }

      } catch (error) {
        console.error("Error fetching home data:", error);
      } finally {
        setLoading(false);
      }
    };`;

if (oldFetchRegex.test(pageCode)) {
  pageCode = pageCode.replace(oldFetchRegex, newFetch);
  console.log('Replaced fetchHomeData in app/page.tsx');
}

fs.writeFileSync(path.join(websiteRoot, 'app/page.tsx'), pageCode, 'utf8');
console.log('Successfully updated D:/masa/dev/fest-2026-website/app/page.tsx');
