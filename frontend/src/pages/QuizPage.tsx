"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Clock, ArrowLeft, ArrowRight, UploadIcon } from "lucide-react"
import { aiGenerateFromCVId, aiGenerateFromFileSmart } from "@/api/endpoints"
import { useNavigate } from "react-router-dom"
import { getSupabaseClient } from "@/lib/supabase"

type Question = {
  id?: number | string
  question: string
  options?: string[]
  correctAnswer?: number
  skill?: string
  topic?: string
  category?: "technical" | "soft" | string
}

type QuizState = "generating" | "ready" | "submitting" | "completed" | "error"

export default function QuizPage() {
  const [status, setStatus] = useState<QuizState>("generating")
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number | string>>({})
  const [timeLeft, setTimeLeft] = useState(10 * 60) // 10 minutes
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const nav = useNavigate()

  const cvId = useMemo(() => localStorage.getItem("last_cv_id"), [])

  function normalize(raw: any): Question[] {
    if (!raw) return []
    const arr = Array.isArray(raw) ? raw : raw.questions || []
    return arr.map((q: any, i: number) => ({
      id: q.id ?? i + 1,
      question: q.question ?? q.prompt ?? q.text ?? String(q),
      options: Array.isArray(q.options) ? q.options : undefined,
      correctAnswer: typeof q.correctAnswer === "number" ? q.correctAnswer : undefined,
      skill: q.skill ?? q.topic ?? undefined,
      category: q.category ?? undefined,
    }))
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setStatus("generating")
      setError(null)
      try {
        if (cvId) {
          const data = await aiGenerateFromCVId(cvId)
          const qs = normalize(data)
          if (!qs.length) throw new Error("No questions were generated. Please try again.")
          if (mounted) {
            setQuestions(qs)
            setStatus("ready")
            if (data.quiz_id) {
              localStorage.setItem("current_quiz_id", data.quiz_id)
            }
          }
        } else {
          setStatus("ready")
        }
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || "Failed to generate questions.")
        setStatus("error")
      }
    })()
    return () => {
      mounted = false
    }
  }, [cvId])

  useEffect(() => {
    if (status !== "ready") return
    if (timeLeft <= 0) return
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [status, timeLeft])

  const progress = questions.length ? ((current + 1) / questions.length) * 100 : 0

  const handleAnswerSelect = (val: number | string) => {
    setAnswers((prev) => ({ ...prev, [current]: val }))
  }

  const handleNext = () => {
    if (current < questions.length - 1) setCurrent((i) => i + 1)
  }

  const handlePrev = () => {
    if (current > 0) setCurrent((i) => i - 1)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${String(r).padStart(2, "0")}`
  }

  const submit = async () => {
    setStatus("submitting")
    try {
      const supabase = getSupabaseClient()

      // Create quiz record
      const { data: quizData, error: quizError } = await supabase
        .from("quiz_quiz")
        .insert({
          cv_id: cvId ? Number.parseInt(cvId) : null,
          title: "Skill Assessment Quiz",
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (quizError) {
        console.error("[v0] Error creating quiz:", quizError)
        throw new Error("Failed to create quiz")
      }

      console.log("[v0] Created quiz:", quizData)

      // Create question records
      const questionRecords = questions.map((q, idx) => ({
        quiz_id: quizData.id,
        text: q.question,
        options: q.options || [],
        correct_answer: typeof q.correctAnswer === "number" ? q.correctAnswer : 0,
      }))

      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_question")
        .insert(questionRecords)
        .select()

      if (questionsError) {
        console.error("[v0] Error creating questions:", questionsError)
        throw new Error("Failed to create questions")
      }

      console.log("[v0] Created questions:", questionsData)

      // Calculate score and create result
      const answersData = questions.map((q, idx) => ({
        question: q.question,
        userAnswer: answers[idx],
        correctAnswer: q.correctAnswer,
        isCorrect: answers[idx] === q.correctAnswer,
        skill: q.skill || "General",
        category: q.category || "technical",
      }))

      const correctCount = answersData.filter((a) => a.isCorrect).length
      const score = (correctCount / questions.length) * 100

      const { data: resultData, error: resultError } = await supabase
        .from("quiz_result")
        .insert({
          quiz_id: quizData.id,
          score: score,
          answers: answersData,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (resultError) {
        console.error("[v0] Error creating result:", resultError)
        throw new Error("Failed to save result")
      }

      console.log("[v0] Created result:", resultData)

      // Navigate to results page
      localStorage.setItem("last_result_id", String(resultData.id))
      localStorage.setItem("current_quiz_id", String(quizData.id))

      nav(`/results?result_id=${resultData.id}`, {
        state: {
          result_id: resultData.id,
          quiz_id: quizData.id,
          score: score,
        },
      })

      setStatus("completed")
    } catch (e: any) {
      console.error("[v0] Submit error:", e)
      setError(e?.message || "Failed to submit answers.")
      setStatus("error")
    }
  }

  const handleLocalPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      setError("Please choose a PDF file.")
      setPdfFile(null)
      return
    }
    setError(null)
    setPdfFile(f)
  }

  const generateFromFile = async () => {
    if (!pdfFile) return
    setStatus("generating")
    setError(null)
    setQuestions([])
    try {
      const data = await aiGenerateFromFileSmart(pdfFile)
      const qs = normalize(data)
      if (!qs.length) throw new Error("No questions were generated from the PDF.")
      setQuestions(qs)
      setCurrent(0)
      setAnswers({})
      setStatus("ready")
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Generation failed.")
      setStatus("error")
    }
  }

  /* ---------- UI ---------- */

  if (status === "generating") {
    return (
      <div className="min-h-screen bg-gradient-hero py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="shadow-medium">
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 gradient-primary rounded-full mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold mb-2">Generating Questions...</h2>
              <p className="text-muted-foreground">Please wait while we create your personalized quiz</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (status === "completed") {
    return (
      <div className="min-h-screen bg-gradient-hero py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="shadow-large text-center">
            <CardContent className="p-12">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-6" />
              <h1 className="text-3xl font-bold mb-4">Quiz Completed!</h1>
              <p className="text-lg text-muted-foreground mb-8">Great job! Your answers have been submitted.</p>
              <Button variant="hero" size="lg" onClick={() => nav("/results")}>
                View Results
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Skill Assessment Quiz</h1>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {questions.length ? (
              <>
                Question {current + 1} of {questions.length}
              </>
            ) : (
              <>Upload a PDF to begin</>
            )}
          </p>
        </div>

        {/* Manual upload when no cvId/questions */}
        {!cvId && !questions.length && (
          <Card className="shadow-large mb-8">
            <CardHeader>
              <CardTitle>Upload a PDF CV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input type="file" accept="application/pdf,.pdf" onChange={handleLocalPick} />
                {pdfFile && (
                  <span className="text-sm">
                    Selected: <strong>{pdfFile.name}</strong>
                  </span>
                )}
              </div>
              <Button variant="hero" size="lg" className="gap-2" onClick={generateFromFile} disabled={!pdfFile}>
                <UploadIcon className="w-4 h-4" />
                Generate from PDF
              </Button>
              {error && <div className="text-red-600 text-sm">{error}</div>}
            </CardContent>
          </Card>
        )}

        {/* Question Card */}
        {questions.length > 0 && (
          <Card className="shadow-large mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{questions[current].question}</CardTitle>
                {questions[current].skill && (
                  <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {questions[current].skill}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* MCQ options */}
              {Array.isArray(questions[current].options) && questions[current].options!.length > 0 ? (
                <div className="space-y-3">
                  {questions[current].options!.map((opt, idx) => {
                    const selected = answers[current] === idx
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(idx)}
                        className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 ${
                              selected ? "border-primary bg-primary" : "border-muted-foreground"
                            }`}
                          />
                          <span>{opt}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                // Short answer fallback
                <div className="space-y-3">
                  <textarea
                    className="w-full min-h-[120px] rounded-lg border border-border p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Type your answer here..."
                    value={typeof answers[current] === "string" ? (answers[current] as string) : ""}
                    onChange={(e) => handleAnswerSelect(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Nav */}
        {questions.length > 0 && (
          <div className="flex justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={current === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {current === questions.length - 1 ? (
              <Button
                variant="hero"
                onClick={submit}
                disabled={answers[current] === undefined || status === "submitting"}
              >
                {status === "submitting" ? "Submitting…" : "Submit Quiz"}
              </Button>
            ) : (
              <Button variant="hero" onClick={handleNext} disabled={answers[current] === undefined}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}

        {status === "error" && error && <div className="text-red-600 text-sm mt-4">{error}</div>}
      </div>
    </div>
  )
}
