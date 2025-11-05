// ============================================================================
// Edge Function: submit-quiz
// ============================================================================
// Submits quiz answers, calculates score, and generates AI feedback
// Replaces: Django backend/ai/views.py::submit_answers_view()
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface Answer {
  question: string
  answer: number
  isCorrect?: boolean
  correctAnswer?: number
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
    const { quiz_id, answers } = await req.json()

    if (!quiz_id || !answers || !Array.isArray(answers)) {
      throw new Error('quiz_id and answers are required')
    }

    console.log(`[submit-quiz] Processing submission for quiz #${quiz_id}`)
    console.log(`[submit-quiz] User: ${user.id}, Answers: ${answers.length}`)

    // Get quiz questions
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quiz_id)
      .order('question_number')

    if (questionsError || !questions || questions.length === 0) {
      console.error('[submit-quiz] Failed to get questions:', questionsError)
      throw new Error('Quiz questions not found')
    }

    console.log(`[submit-quiz] Found ${questions.length} questions`)

    // Validate and score answers
    const scoredAnswers: Answer[] = []
    let correctCount = 0

    answers.forEach((userAnswer, index) => {
      if (index < questions.length) {
        const question = questions[index]
        const userAnswerIndex = typeof userAnswer.answer === 'string'
          ? parseInt(userAnswer.answer)
          : userAnswer.answer

        const isCorrect = userAnswerIndex === question.correct_answer

        scoredAnswers.push({
          question: userAnswer.question || question.text,
          answer: userAnswerIndex,
          isCorrect: isCorrect,
          correctAnswer: question.correct_answer,
        })

        if (isCorrect) {
          correctCount++
        }
      }
    })

    const totalQuestions = answers.length
    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0

    console.log(`[submit-quiz] Score: ${score.toFixed(2)}% (${correctCount}/${totalQuestions})`)

    // Generate AI feedback for wrong answers
    const wrongAnswers = scoredAnswers.filter(a => !a.isCorrect)
    const feedback = wrongAnswers.length > 0
      ? await generateFeedback(wrongAnswers, score)
      : 'Excellent work! You answered all questions correctly. 🎉'

    console.log(`[submit-quiz] Generated feedback: ${feedback.substring(0, 100)}...`)

    // Save quiz result
    const { data: result, error: resultError } = await supabase
      .from('quiz_results')
      .insert({
        quiz_id: quiz_id,
        user_id: user.id,
        score: Math.round(score * 100) / 100, // Round to 2 decimals
        correct_answers: correctCount,
        total_questions: totalQuestions,
        answers: scoredAnswers,
        ai_feedback: feedback,
        ai_recommendations: feedback, // Same as feedback for now
        completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (resultError) {
      console.error('[submit-quiz] Failed to save result:', resultError)
      throw resultError
    }

    console.log(`[submit-quiz] Saved result #${result.id}`)

    // Update quiz status to completed
    await supabase
      .from('quizzes')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', quiz_id)

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        result_id: result.id,
        quiz_id: quiz_id,
        score: Math.round(score * 100) / 100,
        correct: correctCount,
        total: totalQuestions,
        feedback: feedback,
        answers: scoredAnswers,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('[submit-quiz] Error:', error)
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
 * Generate AI feedback using Groq
 */
async function generateFeedback(wrongAnswers: Answer[], score: number): Promise<string> {
  const summary = wrongAnswers.map(w => {
    return `- Question: ${w.question}\n  Your answer: Option ${w.answer}\n  Correct: Option ${w.correctAnswer}`
  }).join('\n\n')

  const prompt = `
You are a career coach and HR expert.

The candidate scored ${score.toFixed(1)}% on a professional interview test.
Here are the incorrect questions:

${summary}

Write feedback that:
- Identifies improvement areas.
- Gives clear, practical advice.
- Encourages and motivates the candidate.
- Is concise (2-3 paragraphs maximum).

Provide helpful, constructive feedback.
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
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.9,
    }),
  })

  if (!response.ok) {
    console.error('[submit-quiz] Groq API error for feedback')
    return 'Great effort! Review the questions you missed and try to understand the correct answers to improve your skills.'
  }

  const data = await response.json()
  return data.choices[0].message.content.trim()
}
