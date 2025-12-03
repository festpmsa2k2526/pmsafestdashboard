import { redirect } from "next/navigation"
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {},
        remove(name: string, options: CookieOptions) {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) { redirect("/login") }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) { redirect("/login") }

  return (
    <div className="flex h-screen overflow-hidden bg-background w-full">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-72 md:flex-col fixed inset-y-0 z-50">
        <Sidebar role={profile.role} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-72 transition-all duration-300 w-full min-w-0">

        {/* Sticky Glass Header */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border/40 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60 px-4 sm:px-6 shadow-sm">

          <div className="md:hidden flex items-center gap-2">
            <MobileSidebar role={profile.role} />
            <span className="font-heading font-bold text-lg tracking-tight whitespace-nowrap">Arts Fest</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-medium leading-none">{profile.full_name || 'User'}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{profile.role}</span>
             </div>
            <ThemeSwitcher />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative w-full">
          {/* Subtle background gradient blob for aesthetics */}
          <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 -z-10 blur-3xl rounded-b-full pointer-events-none" />

          <div className="mx-auto max-w-6xl animate-fade-in-up w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}