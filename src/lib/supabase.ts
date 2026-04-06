// supabase client setup — two flavors:
// 1. browser client (for client components, uses anon key)
// 2. server client (for API routes, uses service role key — way more power, be careful)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// this one goes in client components — safe to expose
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey)

// this one is server-only, has full DB access — don't ever send this to the client
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
