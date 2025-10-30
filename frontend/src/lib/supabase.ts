import { createClient } from "@supabase/supabase-js"

let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("[v0] Supabase credentials missing")
    throw new Error("Supabase URL and Anon Key must be set")
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey)

  return supabaseClient
}

export const supabaseHelpers = {
  // CV Operations
  async saveCV(cvData: {
    filename: string
    extracted_name: string
    extracted_phone: string
    extracted_city: string
    ip_detected_city: string
    info_confirmed: boolean
    backend_cv_id: number
    uploaded_at: string
  }) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("cv_cv").insert([cvData]).select().single()

    if (error) {
      console.error("[v0] Failed to save CV to Supabase:", error)
      throw error
    }

    console.log("[v0] CV saved to Supabase:", data)
    return data
  },

  async updateCV(cvId: number, updates: Partial<any>) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("cv_cv").update(updates).eq("id", cvId).select().single()

    if (error) {
      console.error("[v0] Failed to update CV:", error)
      throw error
    }

    return data
  },

  async getCV(cvId: number) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("cv_cv").select("*").eq("id", cvId).single()

    if (error) {
      console.error("[v0] Failed to get CV:", error)
      throw error
    }

    return data
  },

  // Quiz Operations
  async saveQuiz(quizData: { title: string; cv_id?: number; created_at: string }) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("quiz_quiz").insert([quizData]).select().single()

    if (error) {
      console.error("[v0] Failed to save quiz to Supabase:", error)
      throw error
    }

    console.log("[v0] Quiz saved to Supabase:", data)
    return data
  },

  async saveQuestions(questions: any[]) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("quiz_question").insert(questions).select()

    if (error) {
      console.error("[v0] Failed to save questions:", error)
      throw error
    }

    console.log("[v0] Questions saved to Supabase:", data)
    return data
  },

  async getQuiz(quizId: number) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("quiz_quiz").select("*, quiz_question(*)").eq("id", quizId).single()

    if (error) {
      console.error("[v0] Failed to get quiz:", error)
      throw error
    }

    return data
  },

  // Result Operations
  async saveResult(resultData: {
    quiz_id: number
    score: number
    correct: number
    total: number
    answers: any
    feedback?: string
    completed_at: string
  }) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("quiz_result").insert([resultData]).select().single()

    if (error) {
      console.error("[v0] Failed to save result to Supabase:", error)
      throw error
    }

    console.log("[v0] Result saved to Supabase:", data)
    return data
  },

  async getResult(resultId: number) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("quiz_result")
      .select("*, quiz_quiz(*, quiz_question(*))")
      .eq("id", resultId)
      .single()

    if (error) {
      console.error("[v0] Failed to get result:", error)
      throw error
    }

    return data
  },

  async getAllResults() {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("quiz_result")
      .select("*, quiz_quiz(*, quiz_question(*))")
      .order("completed_at", { ascending: false })

    if (error) {
      console.error("[v0] Failed to get results:", error)
      throw error
    }

    return data || []
  },
}
