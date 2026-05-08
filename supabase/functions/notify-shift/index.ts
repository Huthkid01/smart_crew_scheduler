import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type ShiftAction = "created" | "updated" | "cancelled"

type NotifyShift = {
  employee_id: string
  shift_date: string
  start_time: string
  end_time: string
  position?: string
  location?: string
  notes?: string
  change_summary?: string
  cancel_reason?: string
  schedule_url?: string
}

function getBearerToken(authHeader: string) {
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

const TEMPLATE_NEW_SHIFT = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New shift assigned</title>
  </head>
  <body style="margin:0;background:#0b0b0b;color:#ffffff;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;">
    <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
      <div style="background:#0f0f0f;border:1px solid rgba(255,255,255,0.10);border-radius:16px;overflow:hidden;">
        <div style="padding:22px 22px 8px;">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(34,197,94,0.14);color:#22c55e;font-weight:700;font-size:12px;">
            New shift
          </div>
          <h1 style="margin:14px 0 8px;font-size:22px;line-height:1.25;">
            You’ve been scheduled for a shift
          </h1>
          <p style="margin:0 0 12px;color:rgba(255,255,255,0.72);font-size:15px;line-height:1.6;">
            Hi {{employee_name}}, a new shift has been assigned to you. Details are below.
          </p>
        </div>

        <div style="padding:0 22px 18px;">
          <div style="border:1px solid rgba(255,255,255,0.10);border-radius:12px;padding:14px;background:rgba(255,255,255,0.03);">
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <div style="min-width:200px;">
                <div style="color:rgba(255,255,255,0.55);font-size:12px;">Date</div>
                <div style="font-size:14px;font-weight:700;">{{shift_date}}</div>
              </div>
              <div style="min-width:200px;">
                <div style="color:rgba(255,255,255,0.55);font-size:12px;">Time</div>
                <div style="font-size:14px;font-weight:700;">{{start_time}} – {{end_time}}</div>
              </div>
              <div style="min-width:200px;">
                <div style="color:rgba(255,255,255,0.55);font-size:12px;">Role</div>
                <div style="font-size:14px;font-weight:700;">{{position}}</div>
              </div>
              <div style="min-width:200px;">
                <div style="color:rgba(255,255,255,0.55);font-size:12px;">Location</div>
                <div style="font-size:14px;font-weight:700;">{{location}}</div>
              </div>
            </div>

            <div style="margin-top:12px;">
              <div style="color:rgba(255,255,255,0.55);font-size:12px;">Notes</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);line-height:1.5;">
                {{notes}}
              </div>
            </div>
          </div>
        </div>

        <div style="padding:0 22px 22px;">
          <a
            href="{{schedule_url}}"
            style="display:inline-block;background:#22c55e;color:#0b0b0b;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:12px;font-size:15px;"
            target="_blank"
            rel="noreferrer"
          >
            View schedule
          </a>
          <div style="height:14px;"></div>
          <div style="color:rgba(255,255,255,0.55);font-size:12px;line-height:1.5;">
            If the button doesn’t work, copy and paste this link into your browser:
            <div style="word-break:break-all;margin-top:6px;color:rgba(255,255,255,0.75);">
              {{schedule_url}}
            </div>
          </div>
        </div>
      </div>

      <div style="padding:14px 6px 0;color:rgba(255,255,255,0.45);font-size:12px;line-height:1.5;text-align:center;">
        {{app_name}} • This is an automated message.
      </div>
    </div>
  </body>
</html>`

const TEMPLATE_SHIFT_UPDATED = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shift updated</title>
  </head>
  <body style="margin:0;background:#0b0b0b;color:#ffffff;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;">
    <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
      <div style="background:#0f0f0f;border:1px solid rgba(255,255,255,0.10);border-radius:16px;overflow:hidden;">
        <div style="padding:22px 22px 8px;">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(59,130,246,0.16);color:#93c5fd;font-weight:700;font-size:12px;">
            Schedule update
          </div>
          <h1 style="margin:14px 0 8px;font-size:22px;line-height:1.25;">
            Your shift has been updated
          </h1>
          <p style="margin:0 0 12px;color:rgba(255,255,255,0.72);font-size:15px;line-height:1.6;">
            Hi {{employee_name}}, an admin updated your shift. Please review the latest details.
          </p>
        </div>

        <div style="padding:0 22px 18px;">
          <div style="border:1px solid rgba(255,255,255,0.10);border-radius:12px;padding:14px;background:rgba(255,255,255,0.03);">
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <div style="min-width:200px;">
                <div style="color:rgba(255,255,255,0.55);font-size:12px;">Date</div>
                <div style="font-size:14px;font-weight:700;">{{shift_date}}</div>
              </div>
              <div style="min-width:200px;">
                <div style="color:rgba(255,255,255,0.55);font-size:12px;">Time</div>
                <div style="font-size:14px;font-weight:700;">{{start_time}} – {{end_time}}</div>
              </div>
            </div>

            <div style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;">
              <div style="color:rgba(255,255,255,0.55);font-size:12px;">What changed</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);line-height:1.5;">
                {{change_summary}}
              </div>
            </div>
          </div>
        </div>

        <div style="padding:0 22px 22px;">
          <a
            href="{{schedule_url}}"
            style="display:inline-block;background:#22c55e;color:#0b0b0b;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:12px;font-size:15px;"
            target="_blank"
            rel="noreferrer"
          >
            View updated schedule
          </a>
          <div style="height:14px;"></div>
          <div style="color:rgba(255,255,255,0.55);font-size:12px;line-height:1.5;">
            Link: <span style="word-break:break-all;color:rgba(255,255,255,0.75);">{{schedule_url}}</span>
          </div>
        </div>
      </div>

      <div style="padding:14px 6px 0;color:rgba(255,255,255,0.45);font-size:12px;line-height:1.5;text-align:center;">
        {{app_name}} • This is an automated message.
      </div>
    </div>
  </body>
</html>`

const TEMPLATE_SHIFT_CANCELLED = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Shift cancelled</title>
  </head>
  <body style="margin:0;background:#0b0b0b;color:#ffffff;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;">
    <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
      <div style="background:#0f0f0f;border:1px solid rgba(255,255,255,0.10);border-radius:16px;overflow:hidden;">
        <div style="padding:22px 22px 8px;">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(239,68,68,0.16);color:#fca5a5;font-weight:700;font-size:12px;">
            Cancelled
          </div>
          <h1 style="margin:14px 0 8px;font-size:22px;line-height:1.25;">
            Your shift has been cancelled
          </h1>
          <p style="margin:0 0 12px;color:rgba(255,255,255,0.72);font-size:15px;line-height:1.6;">
            Hi {{employee_name}}, the following shift was removed from your schedule.
          </p>
        </div>

        <div style="padding:0 22px 18px;">
          <div style="border:1px solid rgba(255,255,255,0.10);border-radius:12px;padding:14px;background:rgba(255,255,255,0.03);">
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <div style="min-width:200px;">
                <div style="color:rgba(255,255,255,0.55);font-size:12px;">Date</div>
                <div style="font-size:14px;font-weight:700;">{{shift_date}}</div>
              </div>
              <div style="min-width:200px;">
                <div style="color:rgba(255,255,255,0.55);font-size:12px;">Time</div>
                <div style="font-size:14px;font-weight:700;">{{start_time}} – {{end_time}}</div>
              </div>
              <div style="min-width:200px;">
                <div style="color:rgba(255,255,255,0.55);font-size:12px;">Role</div>
                <div style="font-size:14px;font-weight:700;">{{position}}</div>
              </div>
            </div>

            <div style="margin-top:12px;">
              <div style="color:rgba(255,255,255,0.55);font-size:12px;">Message</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);line-height:1.5;">
                {{cancel_reason}}
              </div>
            </div>
          </div>
        </div>

        <div style="padding:0 22px 22px;">
          <a
            href="{{schedule_url}}"
            style="display:inline-block;background:#22c55e;color:#0b0b0b;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:12px;font-size:15px;"
            target="_blank"
            rel="noreferrer"
          >
            View schedule
          </a>
        </div>
      </div>

      <div style="padding:14px 6px 0;color:rgba(255,255,255,0.45);font-size:12px;line-height:1.5;text-align:center;">
        {{app_name}} • This is an automated message.
      </div>
    </div>
  </body>
</html>`

function renderTemplate(raw: string, variables: Record<string, string>) {
  return raw.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match: string, key: string) => {
    const value = variables[String(key)]
    return typeof value === "string" ? value : match
  })
}

async function sendEmailWithBrevo(args: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get("BREVO_API_KEY")
  if (!apiKey) {
    throw new Error("Missing BREVO_API_KEY")
  }

  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || Deno.env.get("BREVO_FROM_EMAIL")
  const senderName = Deno.env.get("BREVO_SENDER_NAME") || Deno.env.get("BREVO_FROM_NAME") || "SmartCrew Scheduler"
  if (!senderEmail) {
    throw new Error("Missing BREVO_SENDER_EMAIL")
  }

  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: args.to }],
      subject: args.subject,
      htmlContent: args.html,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => "")
    throw new Error(`Brevo error: ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ""}`)
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const token = getBearerToken(authHeader)
    if (!token) {
      return new Response(JSON.stringify({ error: "Invalid Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("org_id, role")
      .eq("id", userData.user.id)
      .maybeSingle()

    if (profileError || !profileRow?.org_id) {
      return new Response(JSON.stringify({ error: "Missing profile" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      })
    }

    const role = String((profileRow as { role?: unknown }).role ?? "")
    if (role !== "admin" && role !== "manager") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      })
    }

    const body = (await req.json().catch(() => null)) as
      | { action?: ShiftAction; org_id?: string; shifts?: NotifyShift[]; app_name?: string; schedule_url?: string }
      | null

    const action = body?.action
    const shifts = body?.shifts
    if (!action || !Array.isArray(shifts) || shifts.length === 0) {
      throw new Error("Missing required fields: action, shifts")
    }
    if (action !== "created" && action !== "updated" && action !== "cancelled") {
      throw new Error("Invalid action")
    }

    const siteBase = (Deno.env.get("SITE_URL") || req.headers.get("origin") || "http://localhost:5173").replace(/\/$/, "")
    const scheduleUrl = body?.schedule_url || `${siteBase}/dashboard/schedule`
    const appName = body?.app_name || "SmartCrew Scheduler"

    const orgId = (typeof body?.org_id === "string" && body.org_id) || String(profileRow.org_id)
    const { data: orgRow, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("subscription_tier")
      .eq("id", orgId)
      .maybeSingle()

    if (orgError || !orgRow) throw orgError ?? new Error("Organization not found")

    const subscriptionTier = String((orgRow as { subscription_tier?: unknown }).subscription_tier ?? "free").toLowerCase()
    if (subscriptionTier !== "pro") {
      const results = shifts.map((s) => ({ employee_id: s.employee_id, status: "skipped" as const }))
      return new Response(JSON.stringify({ ok: true, plan: subscriptionTier, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    const employeeIds = Array.from(
      new Set(shifts.map((s) => (typeof s.employee_id === "string" ? s.employee_id : "")).filter(Boolean)),
    )

    const { data: employeeRows, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("id, name, email, position, org_id")
      .eq("org_id", orgId)
      // @ts-ignore
      .in("id", employeeIds)

    if (employeeError) throw employeeError

    const employeeById = new Map(
      (employeeRows || []).map((r: { id: string; name: string; email: string; position: string | null }) => [
        r.id,
        r,
      ]),
    )

    const results: Array<{ employee_id: string; email?: string; status: "sent" | "skipped" | "error"; error?: string }> =
      []

    for (const shift of shifts) {
      const employee = employeeById.get(shift.employee_id)
      if (!employee?.email) {
        results.push({ employee_id: shift.employee_id, status: "skipped" })
        continue
      }

      const variables = {
        app_name: appName,
        employee_name: employee.name || employee.email.split("@")[0],
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        position: shift.position || employee.position || "—",
        location: shift.location || "—",
        notes: shift.notes || "—",
        change_summary: shift.change_summary || "Schedule details were updated.",
        cancel_reason: shift.cancel_reason || "This shift was removed by an admin.",
        schedule_url: shift.schedule_url || scheduleUrl,
      }

      const template =
        action === "created" ? TEMPLATE_NEW_SHIFT : action === "updated" ? TEMPLATE_SHIFT_UPDATED : TEMPLATE_SHIFT_CANCELLED

      const subject =
        action === "created"
          ? "New shift assigned"
          : action === "updated"
            ? "Shift updated"
            : "Shift cancelled"

      const html = renderTemplate(template, variables)

      try {
        await sendEmailWithBrevo({ to: employee.email, subject: `${appName} • ${subject}`, html })
        results.push({ employee_id: shift.employee_id, email: employee.email, status: "sent" })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ employee_id: shift.employee_id, email: employee.email, status: "error", error: msg })
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
