import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

function isLockAbortError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const nameValue = "name" in error ? (error as { name?: unknown }).name : undefined;
  const messageValue = "message" in error ? (error as { message?: unknown }).message : undefined;
  const name = typeof nameValue === "string" ? nameValue : "";
  const message = typeof messageValue === "string" ? messageValue : "";
  return name === "AbortError" || message.toLowerCase().includes("lock broken");
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function getSessionSafe(retries = 2) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await supabase.auth.getSession();
      if (result.error && isLockAbortError(result.error)) {
        lastError = result.error;
        await wait(50 * (attempt + 1));
        continue;
      }
      return result;
    } catch (error) {
      if (isLockAbortError(error) && attempt < retries) {
        lastError = error;
        await wait(50 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error("Failed to get session");
}
