// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { org_id, start_date, end_date, optimization_goal } = await req.json()

    if (!org_id || !start_date || !end_date) {
      throw new Error('Missing required fields')
    }

    // 1. Fetch employees and their availability
    const { data: employees, error: empError } = await supabaseClient
      .from('employees')
      .select(`
        *,
        employee_skills (
          skill_id,
          proficiency_level,
          skills (name)
        ),
        availability (*)
      `)
      .eq('org_id', org_id)
      .eq('is_active', true)

    if (empError) throw empError

    // 2. Fetch existing shifts (to avoid double booking or for context)
    const { data: _shifts, error: shiftError } = await supabaseClient
        .from('shifts')
        .select('*')
        .eq('org_id', org_id)
        .gte('date', start_date)
        .lte('date', end_date)
    
    if (shiftError) throw shiftError

    // 3. Construct prompt for the LLM (Groq in production; mock fallback if no key)
    const prompt = `
      You are an expert scheduler. Generate an optimal work schedule for the following employees from ${start_date} to ${end_date}.
      
      Optimization Goal: ${optimization_goal}
      
      Employees:
      ${JSON.stringify(employees, null, 2)}
      
      Constraints:
      - Respect employee availability.
      - Ensure required skills are covered (assume generic requirement if not specified).
      - Do not schedule employees for more than 40 hours a week unless necessary.
      - Shifts should be between 4-8 hours.
      
      Return the schedule as a JSON array of objects with the following structure:
      [
        {
          "employee_id": 123,
          "date": "YYYY-MM-DD",
          "start_time": "HH:MM",
          "end_time": "HH:MM",
          "role": "Position Name"
        }
      ]
      Do not include any explanation, just the JSON.
    `

    // 4. Call Groq (set GROQ_API_KEY in Supabase Edge Function secrets)
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

    let generatedSchedule: any[] = []

    function parseScheduleFromText(text: string): any[] {
      const trimmed = text.trim()
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed
        if (parsed?.shifts && Array.isArray(parsed.shifts)) return parsed.shifts
        if (parsed?.schedule && Array.isArray(parsed.schedule)) return parsed.schedule
      } catch {
        /* fall through */
      }
      const jsonMatch = trimmed.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0])
        } catch {
          console.error('Failed to parse JSON array from Groq response:', trimmed)
        }
      }
      return []
    }

    if (GROQ_API_KEY) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.5,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await response.json()
      if (data.error) {
        throw new Error(`Groq API Error: ${data.error.message}`)
      }

      const textResponse = data.choices?.[0]?.message?.content || ''
      generatedSchedule = parseScheduleFromText(textResponse)
      if (generatedSchedule.length === 0) {
        console.error('Groq returned no parseable schedule:', textResponse)
      }
    } else {
      console.log('No GROQ_API_KEY secret. Returning mock schedule.')
      generatedSchedule = [
        {
          employee_id: employees[0]?.id,
          date: start_date,
          start_time: '09:00',
          end_time: '17:00',
          role: employees[0]?.position,
        },
      ]
    }

    return new Response(
      JSON.stringify(generatedSchedule),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
