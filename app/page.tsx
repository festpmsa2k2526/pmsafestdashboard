"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Trophy, ArrowRight, Sparkles } from "lucide-react"

export default function LandingPage() {
  return (
    // h-screen ensures it takes full viewport height without scrolling
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden relative selection:bg-primary/20">

      {/* Background Ambience */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/30 blur-[120px] pointer-events-none" />

      {/* Navbar - Fixed height (4rem/64px) */}
      <header className="px-6 h-16 flex items-center justify-between border-b border-border/40 bg-background/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight text-foreground">
          {/* Logo with v4 Gradient Syntax (bg-linear-to-br) */}
          <div className="w-8 h-8 bg-linear-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <Trophy className="w-4 h-4" />
          </div>
          <span>ArtsFest <span className="text-primary">2025</span></span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeSwitcher />
          <Link href="/login">
            <Button variant="outline" className="hidden sm:flex border-primary/20 hover:bg-primary/5">Admin Access</Button>
          </Link>
        </div>
      </header>

      {/* Main Content - Takes remaining height */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10">

        <div className="space-y-6 max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4 animate-fade-in-up">
            <Sparkles className="w-3 h-3 mr-2" />
            The Ultimate Cultural Experience
          </div>

          {/* Hero Text */}
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground animate-fade-in-up [animation-delay:100ms]">
            Manage. Compete.<br />
            {/* v4 Gradient Syntax (bg-linear-to-r) */}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-purple-500 to-pink-500">
              Conquer the Stage.
            </span>
          </h1>

          <p className="mx-auto max-w-[600px] text-muted-foreground text-lg md:text-xl font-light animate-fade-in-up [animation-delay:200ms]">
            Welcome to the official portal for Arts Fest 2025.
            Register participants, track live scores, and lead your house to victory.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8 animate-fade-in-up [animation-delay:300ms]">
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
                Captain Login <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>

            <Button variant="ghost" size="lg" className="h-14 px-8 text-lg rounded-full text-muted-foreground hover:text-foreground">
              View Schedule
            </Button>
          </div>
        </div>
      </main>

      {/* Footer - Minimal */}
      <footer className="py-4 text-center text-xs text-muted-foreground/60">
        <p>© 2025 Arts Fest Committee. Built for excellence.</p>
      </footer>
    </div>
  )
}