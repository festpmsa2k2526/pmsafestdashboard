"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"
import { 
  Tv, 
  Play, 
  Square, 
  Volume2, 
  VolumeX, 
  Clock, 
  Timer, 
  Sparkles, 
  CheckCircle2, 
  Radio, 
  AlertCircle,
  ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// Web Audio synthesizer for countdown beeps and fanfare
export function playSynthesizedSound(type: "beep" | "reveal") {
  if (typeof window === "undefined") return
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    if (type === "beep") {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 beep
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
    } else if (type === "reveal") {
      // Triumph Arpeggio: C5 -> E5 -> G5 -> C6
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "triangle"
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12)
        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.setValueAtTime(0.35, ctx.currentTime + idx * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.6)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + idx * 0.12)
        osc.stop(ctx.currentTime + idx * 0.12 + 0.65)
      })
    }
  } catch (err) {
    console.warn("Audio synthesis error:", err)
  }
}

export interface TvBroadcastState {
  status: "IDLE" | "SHOW_STANDINGS" | "HIDE"
  trigger_id: string
  countdown_seconds: number
  duration_seconds: number
  countdown_sound: boolean
  reveal_sound: boolean
  banner_text: string
  triggered_at: string
  expires_at: string
}

export function TvBroadcastController() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentState, setCurrentState] = useState<TvBroadcastState | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Form states
  const [countdownSeconds, setCountdownSeconds] = useState<number>(3)
  const [durationSeconds, setDurationSeconds] = useState<number>(10)
  const [countdownSound, setCountdownSound] = useState<boolean>(true)
  const [revealSound, setRevealSound] = useState<boolean>(true)
  const [bannerText, setBannerText] = useState<string>("OFFICIAL HOUSE STANDINGS")

  const supabase = createClient()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch current TV broadcast status
  const fetchState = async () => {
    try {
      const res = await supabase
        .from("site_assets")
        .select("value")
        .eq("key", "tv_broadcast_control")
        .maybeSingle()

      const data = res.data as any
      if (data?.value) {
        const parsed: TvBroadcastState = typeof data.value === "string" ? JSON.parse(data.value) : data.value
        setCurrentState(parsed)
      }
    } catch (err) {
      console.error("Error fetching TV broadcast state:", err)
    }
  }

  useEffect(() => {
    fetchState()

    // Realtime subscription
    const channel = supabase
      .channel("tv_control_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_assets",
          filter: "key=eq.tv_broadcast_control"
        },
        (payload) => {
          if (payload.new && (payload.new as any).value) {
            try {
              const val = (payload.new as any).value
              const parsed: TvBroadcastState = typeof val === "string" ? JSON.parse(val) : val
              setCurrentState(parsed)
            } catch (e) {}
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Timer loop for time remaining
  useEffect(() => {
    if (!currentState || currentState.status !== "SHOW_STANDINGS") {
      setTimeRemaining(null)
      return
    }

    const checkTime = () => {
      const expires = new Date(currentState.expires_at).getTime()
      const now = Date.now()
      const diffSec = Math.max(0, Math.ceil((expires - now) / 1000))
      
      if (diffSec <= 0) {
        setTimeRemaining(0)
      } else {
        setTimeRemaining(diffSec)
      }
    }

    checkTime()
    const interval = setInterval(checkTime, 1000)
    return () => clearInterval(interval)
  }, [currentState])

  const handleBroadcast = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const totalDurationSec = (countdownSeconds || 0) + (durationSeconds || 10)
      const expiresAt = new Date(now.getTime() + totalDurationSec * 1000)

      const newState: TvBroadcastState = {
        status: "SHOW_STANDINGS",
        trigger_id: Date.now().toString(),
        countdown_seconds: countdownSeconds,
        duration_seconds: durationSeconds,
        countdown_sound: countdownSound,
        reveal_sound: revealSound,
        banner_text: bannerText.trim() || "OFFICIAL HOUSE STANDINGS",
        triggered_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      }

      // Preview sound locally for admin feedback
      if (countdownSound) {
        playSynthesizedSound("beep")
      }

      const { error } = await (supabase
        .from("site_assets") as any)
        .upsert(
          {
            key: "tv_broadcast_control",
            label: "TV Screen Broadcast Control",
            type: "link",
            value: JSON.stringify(newState),
            description: "Controls real-time broadcast of house standings, countdowns, and sound on the TV screen."
          },
          { onConflict: "key" }
        )

      if (error) throw error
      setCurrentState(newState)
    } catch (err: any) {
      alert("Failed to broadcast: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStopBroadcast = async () => {
    setLoading(true)
    try {
      const stoppedState: TvBroadcastState = {
        status: "IDLE",
        trigger_id: Date.now().toString(),
        countdown_seconds: 0,
        duration_seconds: 0,
        countdown_sound: false,
        reveal_sound: false,
        banner_text: "",
        triggered_at: new Date().toISOString(),
        expires_at: new Date().toISOString()
      }

      const { error } = await (supabase
        .from("site_assets") as any)
        .upsert(
          {
            key: "tv_broadcast_control",
            label: "TV Screen Broadcast Control",
            type: "link",
            value: JSON.stringify(stoppedState),
            description: "Controls real-time broadcast of house standings, countdowns, and sound on the TV screen."
          },
          { onConflict: "key" }
        )

      if (error) throw error
      setCurrentState(stoppedState)
      setTimeRemaining(null)
    } catch (err: any) {
      alert("Failed to stop: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const isLive = currentState?.status === "SHOW_STANDINGS" && (timeRemaining === null || timeRemaining > 0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isLive ? "default" : "outline"} 
          className={`gap-2 font-medium transition-all shadow-sm ${
            isLive 
              ? "bg-amber-600 hover:bg-amber-700 text-white animate-pulse border-amber-500" 
              : "border-primary/30 hover:border-primary hover:bg-primary/5 text-foreground"
          }`}
        >
          <Tv className="w-4 h-4 text-amber-500" />
          <span>TV Broadcast</span>
          {isLive && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-white text-amber-800 font-bold">
              {timeRemaining !== null ? `${timeRemaining}s` : "LIVE"}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] bg-card border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Tv className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">TV Screen Broadcast</DialogTitle>
                <DialogDescription className="text-xs">
                  Trigger live house standings on stage & arena screens
                </DialogDescription>
              </div>
            </div>

            {isLive ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1">
                <Radio className="w-3 h-3 animate-ping" />
                BROADCASTING ({timeRemaining}s)
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[11px]">
                IDLE
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Banner Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Broadcast Banner / Title</Label>
            <Input 
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="e.g. OFFICIAL HOUSE STANDINGS"
              className="text-xs h-9 bg-background/50"
            />
          </div>

          {/* Countdown & Duration Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Countdown Selector */}
            <div className="space-y-1.5 p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Timer className="w-3.5 h-3.5 text-amber-500" />
                <span>Countdown Timer</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Dramatic pre-reveal timer</p>
              <div className="flex items-center gap-1.5 pt-1">
                {[0, 3, 5, 10].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setCountdownSeconds(sec)}
                    className={`flex-1 py-1 rounded text-xs font-semibold transition-colors border ${
                      countdownSeconds === sec
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-background hover:bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {sec === 0 ? "None" : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>

            {/* Display Duration Selector */}
            <div className="space-y-1.5 p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Display Duration</span>
              </div>
              <p className="text-[11px] text-muted-foreground">How long to show standings</p>
              <div className="flex items-center gap-1.5 pt-1">
                {[5, 10, 15, 30, 60].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDurationSeconds(sec)}
                    className={`flex-1 py-1 rounded text-xs font-semibold transition-colors border ${
                      durationSeconds === sec
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-background hover:bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sound Controls */}
          <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Audio Sound Effects</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium cursor-pointer">Countdown Beep Sounds</Label>
                <p className="text-[11px] text-muted-foreground">3.. 2.. 1.. audio sync beeps</p>
              </div>
              <Switch 
                checked={countdownSound} 
                onCheckedChange={setCountdownSound} 
              />
            </div>

            <div className="h-px bg-border/40 my-1" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium cursor-pointer">Reveal Fanfare & Chime</Label>
                <p className="text-[11px] text-muted-foreground">Triumph chord when standings appear</p>
              </div>
              <Switch 
                checked={revealSound} 
                onCheckedChange={setRevealSound} 
              />
            </div>
          </div>

          {/* TV Link hint */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>Target Screen: <strong className="text-foreground">D:\masa\dev\fest-2026-website\app\tv</strong></span>
            <a 
              href="http://localhost:3000/tv" 
              target="_blank" 
              rel="noreferrer"
              className="text-amber-600 hover:text-amber-500 flex items-center gap-1 font-medium underline"
            >
              Open TV <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-1">
          {isLive ? (
            <div className="w-full flex items-center gap-2">
              <Button 
                type="button" 
                variant="destructive" 
                className="flex-1 gap-1.5 font-bold"
                onClick={handleStopBroadcast}
                disabled={loading}
              >
                <Square className="w-4 h-4 fill-current" /> Stop Broadcast Now
              </Button>
              <Button 
                type="button" 
                variant="outline"
                className="gap-1.5 font-semibold"
                onClick={handleBroadcast}
                disabled={loading}
              >
                <Sparkles className="w-4 h-4 text-amber-500" /> Re-Trigger
              </Button>
            </div>
          ) : (
            <Button 
              type="button" 
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 shadow-md shadow-amber-600/20"
              onClick={handleBroadcast}
              disabled={loading}
            >
              <Play className="w-4 h-4 fill-current" /> Broadcast House Standings to TV
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
