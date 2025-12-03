import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

// This client is used in Client Components
export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}