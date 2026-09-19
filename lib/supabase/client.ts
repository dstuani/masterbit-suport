"use client";

import { createBrowserClient } from "@supabase/ssr";

import { exigirSupabase } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/** Cliente Supabase para Client Components. A sessão vem dos cookies geridos pelo proxy. */
export function criarClienteBrowser() {
  const { url, anonKey } = exigirSupabase();
  return createBrowserClient<Database>(url, anonKey);
}
