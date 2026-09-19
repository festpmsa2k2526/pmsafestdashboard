"use client"

import { useState, useEffect } from "react"
import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { PanelLeftClose, PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardShellProps {
  role: "admin" | "captain"
  profileName: string
  children: React.ReactNode
}

export function DashboardShell({ role, profileName, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("dashboard_sidebar_collapsed")
    if (saved !== null) {
      setCollapsed(saved === "true")
    }
  }, [])

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem("dashboard_sidebar_collapsed", String(next))
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background w-full">
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden md:flex flex-col fixed inset-y-0 z-50 transition-all duration-300 ease-in-out",
        collapsed ? "w-18" : "w-64"
      )}>
        <Sidebar role={role} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "flex flex-col flex-1 transition-all duration-300 ease-in-out w-full min-w-0",
        collapsed ? "md:pl-18" : "md:pl-64"
      )}>
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 items-center gap-x-3 border-b border-border/40 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60 px-4 sm:px-6 shadow-xs">
          {/* Mobile Sidebar Trigger */}
          <div className="md:hidden flex items-center gap-2">
            <MobileSidebar role={role} />
            <span className="font-heading font-bold text-lg tracking-tight whitespace-nowrap">Arts Fest</span>
          </div>

          {/* Desktop Sidebar Collapse Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="hidden md:flex h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={collapsed ? "Expand sidebar navigation" : "Collapse sidebar navigation"}
          >
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            <span className="sr-only">Toggle Sidebar</span>
          </Button>

          <div className="flex-1" />

          {/* User Profile & Theme Switcher */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-medium leading-none">{profileName || 'User'}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{role}</span>
            </div>
            <ThemeSwitcher />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 relative w-full">
          <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 -z-10 blur-3xl rounded-b-full pointer-events-none" />
          <div className="mx-auto max-w-full 2xl:max-w-[1800px] animate-fade-in-up w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
