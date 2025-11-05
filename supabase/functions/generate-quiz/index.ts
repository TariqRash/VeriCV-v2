// ============================================================================
// Edge Function: generate-quiz
// ============================================================================
// Generates 15 MCQ questions from CV using Groq AI
// Replaces: Django backend/ai/views.py::generate_questions_view()
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface Question {
  question: string
  options: string[]
  correctAnswer: number
  skill?: string
  difficulty?: string
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
    const { cv_id, cv_text, language } = await req.json()

    if (!cv_text || cv_text.trim().length === 0) {
      throw new Error('CV text is required')
    }

    const detectedLanguage = language || 'en'
    console.log(`[generate-quiz] Generating quiz for user ${user.id}`)
    console.log(`[generate-quiz] Language: ${detectedLanguage}`)

    // Generate questions using Groq AI
    const questions = await generateQuestionsFromCV(cv_text, detectedLanguage)

    if (!questions || questions.length === 0) {
      throw new Error('Failed to generate questions')
    }

    console.log(`[generate-quiz] Generated ${questions.length} questions`)

    // Create quiz record
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        user_id: user.id,
        cv_id: cv_id || null,
        title: `Quiz ${new Date().toLocaleDateString()}`,
        language: detectedLanguage,
        total_questions: questions.length,
        status: 'active',
      })
      .select()
      .single()

    if (quizError) {
      console.error('[generate-quiz] Failed to create quiz:', quizError)
      throw quizError
    }

    console.log(`[generate-quiz] Created quiz #${quiz.id}`)

    // Insert questions using service role (to bypass RLS)
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const questionsToInsert = questions.map((q, index) => ({
      quiz_id: quiz.id,
      question_number: index + 1,
      text: q.question,
      options: q.options,
      correct_answer: q.correctAnswer,
      difficulty: q.difficulty || 'medium',
      skill_category: q.skill || 'general',
    }))

    const { error: questionsError } = await supabaseService
      .from('questions')
      .insert(questionsToInsert)

    if (questionsError) {
      console.error('[generate-quiz] Failed to insert questions:', questionsError)
      throw questionsError
    }

    console.log(`[generate-quiz] Inserted ${questions.length} questions`)

    // Return quiz data (without correct answers for security)
    const questionsForClient = questions.map((q, index) => ({
      id: index + 1,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      skill: q.skill,
    }))

    return new Response(
      JSON.stringify({
        success: true,
        quiz_id: quiz.id,
        cv_id: cv_id || null,
        language: detectedLanguage,
        questions: questionsForClient,
        total_questions: questions.length,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('[generate-quiz] Error:', error)
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
 * Generate quiz questions using Groq AI
 */
async function generateQuestionsFromCV(cvText: string, language: string): Promise<Question[]> {
  // Language-specific instructions
  const langInstruction = language === 'ar'
    ? 'يجب أن تكون جميع الأسئلة والخيارات باللغة العربية. استخدم اللغة العربية الفصحى المهنية.'
    : 'All questions and options must be in English.'

  const exampleFormat = language === 'ar'
    ? `[
  {
    "question": "ما هو...؟",
    "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
    "answer": "الإجابة الصحيحة"
  }
]`
    : `[
  {
    "question": "Example question...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Correct answer"
  }
]`

  const prompt = `
You are a professional HR and technical interviewer.

Analyze the following resume content carefully:
---
${cvText.substring(0, 4000)}
---
Identify all technical, behavioral, and soft skills mentioned.
Then generate 15 multiple-choice interview questions (MCQs) that evaluate
the candidate's ability to apply these skills in real job settings.

Rules:
- Include 5 easy, 5 intermediate, 5 advanced questions.
- Each question must have 4 options, 1 correct answer.
- Avoid referencing the resume directly.
- Keep it professional and realistic.
${langInstruction}

Return ONLY pure JSON in this format:
${exampleFormat}

Do NOT include markdown, code blocks, or extra text.
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
      temperature: 0.8,
      max_tokens: 3500,
      top_p: 0.9,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[generate-quiz] Groq API error:', errorText)
    throw new Error(`Groq API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0].message.content

  console.log('[generate-quiz] Raw Groq response:', content.substring(0, 500))

  // Extract JSON array from response
  const jsonMatch = content.match(/\[.*\]/s)
  if (!jsonMatch) {
    console.error('[generate-quiz] No JSON array found in response')
    throw new Error('Failed to parse AI response')
  }

  const questionsRaw = JSON.parse(jsonMatch[0])

  // Normalize questions to expected format
  return questionsRaw.map((q: any, index: number) => {
    const difficulty = index < 5 ? 'easy' : index < 10 ? 'medium' : 'hard'

    // Find correct answer index
    const correctIndex = q.options?.findIndex((opt: string) => opt === q.answer) ?? 0

    return {
      question: q.question || q.text || '',
      options: q.options || [],
      correctAnswer: correctIndex >= 0 ? correctIndex : 0,
      difficulty: difficulty,
      skill: 'general',
    }
  })
}
