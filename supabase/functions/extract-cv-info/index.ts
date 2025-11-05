// ============================================================================
// Edge Function: extract-cv-info
// ============================================================================
// Extracts information from uploaded CV using Groq AI
// Replaces: Django backend/ai/ai_logic.py::extract_cv_information()
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface ExtractedInfo {
  name: string
  phone: string
  city: string
  job_titles: string[]
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      })
    }

    // Get authorization token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { cv_id, cv_text } = await req.json()

    if (!cv_text || cv_text.trim().length === 0) {
      throw new Error('CV text is required')
    }

    console.log(`[extract-cv-info] Processing CV for user ${user.id}`)
    console.log(`[extract-cv-info] CV text length: ${cv_text.length} characters`)

    // Call Groq AI to extract information
    const extractedInfo = await extractInformationFromCV(cv_text)

    // Update CV record if cv_id provided
    if (cv_id) {
      const { error: updateError } = await supabase
        .from('cvs')
        .update({
          extracted_name: extractedInfo.name,
          extracted_phone: extractedInfo.phone,
          extracted_city: extractedInfo.city,
          extracted_job_titles: extractedInfo.job_titles,
          processing_status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', cv_id)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[extract-cv-info] Failed to update CV:', updateError)
        throw updateError
      }

      console.log(`[extract-cv-info] Updated CV #${cv_id}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedInfo,
        cv_id,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('[extract-cv-info] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})

/**
 * Extract CV information using Groq AI
 */
async function extractInformationFromCV(cvText: string): Promise<ExtractedInfo> {
  const prompt = `
You are an expert CV parser. Extract the following information from this CV:

CV Content:
---
${cvText.substring(0, 4000)}
---

Extract and return ONLY a JSON object with these fields:
1. "name": Full name of the person
2. "phone": Phone number (with country code if available)
3. "city": City of residence
4. "job_titles": Array of top 3 most relevant job titles this person would be suitable for (based on their experience and skills)

Return ONLY pure JSON in this exact format:
{
  "name": "John Doe",
  "phone": "+1234567890",
  "city": "New York",
  "job_titles": ["Software Engineer", "Backend Developer", "Full Stack Developer"]
}

Do NOT include any markdown, explanations, or extra text. Just the JSON object.
`

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
      top_p: 0.9,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[extract-cv-info] Groq API error:', errorText)
    throw new Error(`Groq API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content

  console.log('[extract-cv-info] Raw Groq response:', content.substring(0, 200))

  // Extract JSON from response (in case there's markdown wrapping)
  const jsonMatch = content.match(/\{.*\}/s)
  if (!jsonMatch) {
    console.error('[extract-cv-info] No JSON found in response')
    throw new Error('Failed to parse AI response')
  }

  const extractedData = JSON.parse(jsonMatch[0])

  return {
    name: extractedData.name || '',
    phone: extractedData.phone || '',
    city: extractedData.city || '',
    job_titles: (extractedData.job_titles || []).slice(0, 3),
  }
}
