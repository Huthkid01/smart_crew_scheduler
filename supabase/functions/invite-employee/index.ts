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

    const { email, employee_id, org_id } = await req.json()

    if (!email || !employee_id || !org_id) {
        throw new Error("Missing required fields: email, employee_id, or org_id");
    }

    console.log(`Inviting employee: ${email}`);

    // 2. Invite user via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
            employee_id: employee_id,
            org_id: org_id,
            role: 'employee'
        },
        // Redirect the user to the reset password page after they click the email link
        redirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/reset-password`
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
