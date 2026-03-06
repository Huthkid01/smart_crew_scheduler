import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { user_id, email } = await req.json();

    let targetId = user_id;

    if (!targetId && email) {
        // Try to find user by email if ID is not provided
        // Note: This fetches the first 50 users. For larger apps, pagination is needed.
        const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers({
            perPage: 1000 
        });
        
        if (listError) throw listError;
        
        const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (user) {
            targetId = user.id;
        } else {
            throw new Error(`User with email ${email} not found`);
        }
    }

    if (!targetId) {
      throw new Error("User ID or Email is required");
    }

    // Delete the user from Supabase Auth
    const { error } = await supabaseClient.auth.admin.deleteUser(targetId);

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: "User deleted successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
