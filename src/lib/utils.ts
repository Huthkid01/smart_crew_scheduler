import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currencyCode: string, locale?: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const rounded = Math.round(amount * 100) / 100;
    return `${currencyCode} ${rounded.toFixed(2)}`;
  }
}

export function devLog(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.log(...args)
  }
}

export function devError(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.error(...args)
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message
    if (typeof m === "string") return m
  }
  return null
}

export function userSafeErrorMessage(error: unknown, fallback: string) {
  const msg = getErrorMessage(error)
  if (!msg) return fallback

  const lower = msg.toLowerCase()
  const blockList = ["groq", "vite_", "apikey", "api key", "stack", "jwt", "postgres", "relation", "row level"]
  if (blockList.some((w) => lower.includes(w))) return fallback

  if (lower.includes("invalid login credentials")) return "Invalid email or password."
  if (lower.includes("email not confirmed")) return "Please confirm your email before signing in."
  if (lower.includes("user already registered")) return "An account with this email already exists. Please sign in."
  if (lower.includes("request timed out")) return "Request timed out. Please check your connection."
  if (lower.includes("too many requests") || lower.includes("rate limit")) return "Too many requests. Please try again soon."

  const allowList = [
    "password should be",
    "permission",
    "not authorized",
    "unauthorized",
    "forbidden",
    "network",
  ]

  if (allowList.some((w) => lower.includes(w))) return msg
  return fallback
}
