import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.5.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    // 2. Invite user via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
            employee_id: employee_id,
            org_id: org_id,
            role: 'employee',
            full_name: displayName,
            name: displayName,
        },
        redirectTo: `${siteBase}/reset-password`
    })

    if (authError) {
        console.error("Supabase Auth Error:", authError);
        throw authError;
    }

    // 3. Update employee record with the new user_id
    if (authData.user) {
        const { error: updateError } = await supabaseAdmin
            .from('employees')
            .update({ 
                user_id: authData.user.id,
                invite_status: 'pending'
            })
            .eq('id', employee_id)

        if (updateError) {
            console.error("Database Update Error:", updateError);
            throw updateError;
        }
    }

    return new Response(
      JSON.stringify({ message: "Invitation sent successfully", user: authData.user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
