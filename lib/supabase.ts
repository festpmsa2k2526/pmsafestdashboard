import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

// This client is used in Client Components
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined in .env.local'
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}