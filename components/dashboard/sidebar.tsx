"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  Music,
  Trophy,
  IdCardLanyard,
  Replace,
  LogOut,
  Files,
  ScrollText,
  Menu,
  History,
  IndianRupee,
  Palette,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

interface SidebarProps {
  role: "admin" | "captain"
  collapsed?: boolean
  onToggleCollapse?: () => void
}

function NavContent({
  role,
  collapsed = false,
  setOpen,
  onToggleCollapse
}: {
  role: string
  collapsed?: boolean
  setOpen?: (open: boolean) => void
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const links = role === "admin" ? [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/teams", label: "Manage Teams", icon: Trophy },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/events", label: "Events", icon: Music },
    { href: "/admin/scoring", label: "Scoring", icon: Trophy },
    { href: "/admin/replacement", label: "Replacement", icon: Replace },
    { href: "/admin/reports", label: "Reports", icon: ScrollText },
    { href: "/admin/payment", label: "Financial", icon: IndianRupee },
    { href: "/admin/assets", label: "Assets Manage", icon: Files },
    { href: "/admin/overview", label: "Overview", icon: History },
  ] : [
    { href: "/captain/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/captain/events", label: "Register Events", icon: Music },
    { href: "/captain/participations", label: "Admit Card", icon: IdCardLanyard },
    { href: "/captain/status", label: "Reports", icon: ScrollText },
  ]

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 select-none">
      {/* Brand Header */}
      <div className={cn(
        "h-14 sm:h-16 flex items-center border-b border-border/50 shrink-0 transition-all duration-300",
        collapsed ? "justify-center px-2" : "px-5 justify-between"
      )}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-200 transition-colors group cursor-pointer"
              >
                <Palette className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-900 text-white font-semibold">
              Arts Fest (Click to expand)
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-2 font-heading font-bold text-lg tracking-tight text-foreground truncate">
            <Palette className="w-5 h-5 text-primary shrink-0" />
            <span className="truncate">Arts Fest</span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className={cn(
        "flex-1 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-none",
        collapsed ? "px-2" : "px-3"
      )}>
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href || pathname?.startsWith(link.href + "/")

          const linkElement = (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen?.(false)}
              className="block"
            >
              <div className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-slate-200 text-primary font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-slate-200/70 hover:text-foreground"
              )}>
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-full" />
                )}

                <Icon className={cn(
                  "w-5 h-5 shrink-0 transition-transform group-hover:scale-105",
                  isActive ? "text-primary" : "text-slate-600 group-hover:text-slate-900"
                )} />

                {!collapsed && (
                  <span className="truncate text-[13.5px]">{link.label}</span>
                )}
              </div>
            </Link>
          )

          if (collapsed) {
            return (
              <Tooltip key={link.href}>
                <TooltipTrigger asChild>
                  {linkElement}
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-slate-900 text-white font-medium text-xs">
                  {link.label}
                </TooltipContent>
              </Tooltip>
            )
          }

          return linkElement
        })}
      </nav>

      {/* Bottom Footer Section */}
      <div className={cn(
        "border-t border-border/50 mt-auto bg-slate-100/70 shrink-0",
        collapsed ? "p-2 space-y-1" : "p-3 space-y-1.5"
      )}>
        {/* Sign Out */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full h-10 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                <span className="sr-only">Sign Out</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-900 text-white text-xs">
              Sign Out
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-red-600 hover:bg-red-50/60 transition-colors text-xs h-9 px-2.5"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span className="font-medium">Sign Out</span>
          </Button>
        )}

        {/* Expand / Collapse Button at bottom of sidebar on desktop */}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            onClick={onToggleCollapse}
            className={cn(
              "w-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 transition-colors text-xs h-8",
              collapsed ? "h-8 p-0 flex justify-center" : "justify-between px-2.5"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {!collapsed && <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Collapse</span>}
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}

// 1. Desktop Sidebar
export function Sidebar({ role, collapsed = false, onToggleCollapse }: SidebarProps) {
  return (
    <aside className={cn(
      "border-r border-border/60 bg-[#f8fafc] hidden md:flex flex-col h-full shadow-xl shadow-black/5 z-30 transition-all duration-300 ease-in-out",
      collapsed ? "w-18" : "w-64"
    )}>
      <NavContent role={role} collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </aside>
  )
}

// 2. Mobile Sidebar
export function MobileSidebar({ role }: SidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-muted-foreground hover:text-primary">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72 border-r-border/60 bg-[#f8fafc] text-foreground">
        <div className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
          <SheetDescription>Main navigation for the application</SheetDescription>
        </div>
        <NavContent role={role} setOpen={setOpen} />
      </SheetContent>
    </Sheet>
  )
}