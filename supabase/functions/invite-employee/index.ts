import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type GenerateInviteLinkResult = {
  user: { id: string } | null
  properties?: { action_link?: string }
}

const INVITE_EMPLOYEE_TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{app_name}} Invitation</title>
  </head>
  <body style="margin:0;background:#0b0b0b;color:#ffffff;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;">
    <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
      <div style="background:#0f0f0f;border:1px solid rgba(255,255,255,0.10);border-radius:16px;overflow:hidden;">
        <div style="padding:22px 22px 8px;">
          <div style="display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(34,197,94,0.14);color:#22c55e;font-weight:700;font-size:12px;letter-spacing:0.2px;">
            You’re invited
          </div>
          <h1 style="margin:14px 0 8px;font-size:24px;line-height:1.25;">
            Join {{app_name}}
          </h1>
          <p style="margin:0 0 12px;color:rgba(255,255,255,0.72);font-size:15px;line-height:1.6;">
            Hi {{employee_name}}, you’ve been invited to access your employee dashboard. Click the button below to accept the invitation and set your password.
          </p>
        </div>
        <div style="padding:0 22px 22px;">
          <a
            href="{{invite_url}}"
            style="display:inline-block;background:#22c55e;color:#0b0b0b;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:12px;font-size:15px;"
            target="_blank"
            rel="noreferrer"
          >
            Accept Invitation
          </a>
          <div style="height:14px;"></div>
          <div style="color:rgba(255,255,255,0.55);font-size:12px;line-height:1.5;">
            If the button doesn’t work, copy and paste this link into your browser:
            <div style="word-break:break-all;margin-top:6px;color:rgba(255,255,255,0.75);">
              {{invite_url}}
            </div>
          </div>
        </div>
      </div>
      <div style="padding:14px 6px 0;color:rgba(255,255,255,0.45);font-size:12px;line-height:1.5;text-align:center;">
        If you didn’t expect this invite, you can safely ignore this email.
      </div>
    </div>
  </body>
</html>`

function renderTemplate(raw: string, variables: Record<string, string>) {
  return raw.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match: string, key: string) => {
    const value = variables[String(key)]
    return typeof value === 'string' ? value : match
  })
}

async function sendEmailWithResend(args: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY')
  }

  const from = Deno.env.get('RESEND_FROM') || 'SmartCrew <onboarding@resend.dev>'

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Resend error: ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ''}`)
  }
}

async function sendEmailWithBrevo(args: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  if (!apiKey) {
    throw new Error('Missing BREVO_API_KEY')
  }

  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || Deno.env.get('BREVO_FROM_EMAIL')
  const senderName = Deno.env.get('BREVO_SENDER_NAME') || Deno.env.get('BREVO_FROM_NAME') || 'SmartCrew Scheduler'
  if (!senderEmail) {
    throw new Error('Missing BREVO_SENDER_EMAIL')
  }

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: args.to }],
      subject: args.subject,
      htmlContent: args.html,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Brevo error: ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ''}`)
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Create a Supabase client with the Service Role Key
    // This allows us to use auth.admin methods which are restricted
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let body: { email?: string; employee_id?: string; org_id?: string; full_name?: string }
    try {
      body = await req.json()
    } catch {
      throw new Error('Invalid or empty JSON body')
    }

    const { email, employee_id, org_id, full_name } = body

    if (!email || !employee_id || !org_id) {
        throw new Error("Missing required fields: email, employee_id, or org_id");
    }

    const displayName = typeof full_name === 'string' && full_name.trim() ? full_name.trim() : email.split('@')[0]

    console.log(`Inviting employee: ${email}`);

    // Base URL for invite email links (must match Supabase Auth → Redirect URLs).
    // 1) SITE_URL — set in Supabase Dashboard → Project Settings → Edge Functions → Secrets (production).
    // 2) Origin — browser sends this when the admin calls the function from your deployed app (e.g. Vercel).
    // 3) http://localhost:5173 — Vite default; only used for local dev when 1 and 2 are missing.
    const siteBase = (Deno.env.get('SITE_URL') || req.headers.get('origin') || 'http://localhost:5173').replace(/\/$/, '')

    const shouldUseBrevo = Boolean(Deno.env.get('BREVO_API_KEY'))
    const redirectTo = `${siteBase}/reset-password`
    const userData = {
      employee_id: employee_id,
      org_id: org_id,
      role: 'employee',
      full_name: displayName,
      name: displayName,
    }

    let authData: { user: { id: string } | null } = { user: null }
    let inviteLink: string | null = null

    if (shouldUseBrevo) {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          data: userData,
          redirectTo,
        },
      } as unknown as { type: 'invite'; email: string; options: { data: typeof userData; redirectTo: string } })

      if (error) {
        console.error("Supabase Auth Error:", error);
        throw error;
      }

      const result = data as unknown as GenerateInviteLinkResult | null | undefined
      authData = { user: result?.user ?? null }
      inviteLink = result?.properties?.action_link ?? null
    } else {
      // 2. Invite user via Supabase Auth (uses Supabase email templates)
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: userData,
        redirectTo,
      })

      if (error) {
        console.error("Supabase Auth Error:", error);
        throw error;
      }

      authData = { user: data.user ?? null }
    }

    // 3. Update employee record with the new user_id
    if (authData.user) {
      const { error: updateError } = await supabaseAdmin
        .from('employees')
        .update({
          user_id: authData.user.id,
          invite_status: 'pending',
        })
        .eq('id', employee_id)

      if (updateError) {
        console.error("Database Update Error:", updateError);
      }
    }

    if (shouldUseBrevo) {
      if (!inviteLink) {
        throw new Error('Invite link was not generated')
      }

      const html = renderTemplate(INVITE_EMPLOYEE_TEMPLATE, {
        app_name: "SmartCrew Scheduler",
        invite_url: inviteLink,
        employee_name: displayName,
      })

      await sendEmailWithBrevo({
        to: email,
        subject: "You’re invited to SmartCrew Scheduler",
        html,
      })
    }

    return new Response(
      JSON.stringify({ message: "Invitation sent successfully", user: authData.user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("Function Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
