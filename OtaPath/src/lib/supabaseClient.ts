/**
 * supabaseClient.ts — browser-side Supabase client (anon key).
 * Only used for patient auth (sign in / session). All data access
 * still goes through the app's own API routes, which authorize
 * server-side — the anon key never touches clinical tables.
 */

"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null; // auth disabled until env is configured
  cached = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cached;
}
