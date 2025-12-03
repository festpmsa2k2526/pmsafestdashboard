"use client"

import * as React from "react"
import { Palette, Check, Sun, Moon, Zap, Flame, Mountain } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeSwitcher() {
  const [theme, setTheme] = React.useState<string>("light")

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light"
    setTheme(savedTheme)
    applyTheme(savedTheme)
  }, [])

  const applyTheme = (newTheme: string) => {
    // Reset base classes
    document.body.className = "min-h-screen bg-background font-sans antialiased"

    // Apply theme specific class
    if (newTheme === "dark") {
      document.body.classList.add("dark")
    } else if (newTheme !== "light") {
      document.body.classList.add(`theme-${newTheme}`)
    }
  }

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    applyTheme(newTheme)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      {/* Explicit colors to prevent transparency issues */}
      <DropdownMenuContent
        align="end"
        className="w-56 bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50 border border-slate-200 dark:border-slate-800 shadow-xl z-50"
      >
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />

        <DropdownMenuItem onClick={() => changeTheme("light")} className="gap-3 cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-900">
          <div className="h-4 w-4 rounded-full border border-slate-300 bg-white flex items-center justify-center shadow-sm">
             {theme === 'light' && <Check className="h-3 w-3 text-black" />}
          </div>
          <span className="flex-1">Light</span>
          <Sun className="h-3 w-3 text-slate-400" />
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => changeTheme("dark")} className="gap-3 cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-900">
          <div className="h-4 w-4 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center shadow-sm">
             {theme === 'dark' && <Check className="h-3 w-3 text-white" />}
          </div>
          <span className="flex-1">Dark</span>
          <Moon className="h-3 w-3 text-slate-400" />
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
        <DropdownMenuLabel>Themes</DropdownMenuLabel>

        <DropdownMenuItem onClick={() => changeTheme("blue")} className="gap-3 cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-900">
          <div className="h-4 w-4 rounded-full bg-blue-600 border border-blue-700 flex items-center justify-center shadow-sm">
             {theme === 'blue' && <Check className="h-3 w-3 text-white" />}
          </div>
          <span>Cool Blue</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => changeTheme("green")} className="gap-3 cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-900">
          <div className="h-4 w-4 rounded-full bg-emerald-600 border border-emerald-700 flex items-center justify-center shadow-sm">
             {theme === 'green' && <Check className="h-3 w-3 text-white" />}
          </div>
          <span>Nature Green</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => changeTheme("red")} className="gap-3 cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-900">
          <div className="h-4 w-4 rounded-full bg-red-600 border border-red-700 flex items-center justify-center shadow-sm">
             {theme === 'red' && <Check className="h-3 w-3 text-white" />}
          </div>
          <span>Crimson Red</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => changeTheme("orange")} className="gap-3 cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-900">
          <div className="h-4 w-4 rounded-full bg-orange-500 border border-orange-600 flex items-center justify-center shadow-sm">
             {theme === 'orange' && <Check className="h-3 w-3 text-white" />}
          </div>
          <span>Sunset Orange</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />

        <DropdownMenuItem onClick={() => changeTheme("doom")} className="gap-3 cursor-pointer focus:bg-slate-100 dark:focus:bg-slate-900">
          <div className="h-4 w-4 rounded-full bg-neutral-600 border border-neutral-700 flex items-center justify-center shadow-sm">
             {theme === 'doom' && <Check className="h-3 w-3 text-white" />}
          </div>
          <span className="flex-1">Doom Classic</span>
          <Zap className="h-3 w-3 text-slate-400" />
        </DropdownMenuItem>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}