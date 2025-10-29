"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, CheckCircle, UploadIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/context/LanguageContext"
import { startVoiceInterview, submitVoiceInterview } from "@/api/endpoints"

type InterviewState = "preparing" | "ready" | "recording" | "processing" | "completed" | "error"

export default function VoiceInterviewPage() {
  const { t } = useLanguage()
  const [state, setState] = useState<InterviewState>("preparing")
  const [questions, setQuestions] = useState<string[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [interviewId, setInterviewId] = useState<string | null>(null)
  const [evaluation, setEvaluation] = useState<any>(null)
  const [transcription, setTranscription] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const { toast } = useToast()
  const nav = useNavigate()

  const cvId = localStorage.getItem("last_cv_id")

  // Initialize interview
  useEffect(() => {
    if (!cvId) {
      setState("error")
      setError(t.voiceInterview.uploadCvFirst)
      return
    }
    ;(async () => {
      try {
        setState("preparing")
        const data = await startVoiceInterview(cvId)
        setQuestions(data.questions || [])
        setInterviewId(data.interview_id || null)
        setState("ready")
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || "Failed to start interview")
        setState("error")
      }
    })()
  }, [cvId, t])

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        await processAudio(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setState("recording")
    } catch (e: any) {
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setState("processing")
    }
  }

  // Process audio
  const processAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "interview.webm")
      if (interviewId) {
        formData.append("interview_id", interviewId)
      }

      const result = await submitVoiceInterview(formData)

      setTranscription(result.transcription || "")

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((prev) => prev + 1)
        setState("ready")
      } else {
        setEvaluation(result.evaluation)
        setState("completed")
      }

      toast({
        title: "Response Recorded",
        description: "Your answer has been processed successfully.",
      })
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Failed to process audio")
      setState("error")
      toast({
        title: "Processing Error",
        description: "Failed to process your response. Please try again.",
        variant: "destructive",
      })
    }
  }

  const progress = questions.length ? ((currentQuestion + 1) / questions.length) * 100 : 0

  // Preparing state
  if (state === "preparing") {
    return (
      <div className="min-h-screen bg-gradient-hero py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="shadow-medium">
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 gradient-primary rounded-full mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold mb-2">{t.voiceInterview.preparing}</h2>
              <p className="text-muted-foreground">{t.voiceInterview.preparingSubtitle}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
  if (state === "error") {
    return (
      <div className="min-h-screen bg-gradient-hero py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="shadow-medium">
            <CardContent className="p-12 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              {!cvId && (
                <Button variant="hero" size="lg" onClick={() => nav("/upload")}>
                  <UploadIcon className="w-4 h-4 mr-2" />
                  {t.voiceInterview.goToUpload}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Completed state
  if (state === "completed" && evaluation) {
    return (
      <div className="min-h-screen bg-gradient-hero py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="shadow-large text-center mb-8">
            <CardContent className="p-12">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-6" />
              <h1 className="text-3xl font-bold mb-4">{t.voiceInterview.completed}</h1>
              <p className="text-lg text-muted-foreground mb-8">{t.voiceInterview.completedSubtitle}</p>
            </CardContent>
          </Card>

          <Card className="shadow-medium mb-8">
            <CardHeader>
              <CardTitle>{t.voiceInterview.evaluation}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-primary mb-2">{evaluation.soft_skills_score || 0}%</div>
                  <p className="text-sm text-muted-foreground">{t.voiceInterview.softSkills}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-primary mb-2">{evaluation.communication_score || 0}%</div>
                  <p className="text-sm text-muted-foreground">{t.voiceInterview.communication}</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-primary mb-2">{evaluation.confidence_score || 0}%</div>
                  <p className="text-sm text-muted-foreground">{t.voiceInterview.confidence}</p>
                </div>
              </div>

              {evaluation.feedback && (
                <div>
                  <h3 className="font-semibold mb-2">{t.voiceInterview.feedback}</h3>
                  <p className="text-muted-foreground">{evaluation.feedback}</p>
                </div>
              )}

              {evaluation.suggestions && (
                <div>
                  <h3 className="font-semibold mb-2">{t.voiceInterview.suggestions}</h3>
                  <p className="text-muted-foreground">{evaluation.suggestions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Button variant="hero" size="lg" onClick={() => nav("/results")}>
              {t.voiceInterview.viewFullReport}
            </Button>
            <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
              {t.voiceInterview.startNewInterview}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Interview in progress
  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">{t.voiceInterview.title}</h1>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {t.voiceInterview.question} {currentQuestion + 1} {t.voiceInterview.of} {questions.length}
          </p>
        </div>

        <Card className="shadow-large mb-8">
          <CardHeader>
            <CardTitle className="text-lg">{questions[currentQuestion]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div
                className={`w-32 h-32 rounded-full flex items-center justify-center ${
                  isRecording ? "bg-red-500 animate-pulse" : "bg-primary"
                }`}
              >
                {isRecording ? <MicOff className="w-16 h-16 text-white" /> : <Mic className="w-16 h-16 text-white" />}
              </div>

              {state === "recording" && (
                <Badge variant="destructive" className="text-lg px-4 py-2">
                  {t.voiceInterview.recording}
                </Badge>
              )}

              {state === "processing" && (
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {t.voiceInterview.processing}
                </Badge>
              )}

              {transcription && (
                <div className="w-full p-4 bg-muted rounded-lg">
                  <p className="text-sm font-semibold mb-2">{t.voiceInterview.transcription}</p>
                  <p className="text-sm text-muted-foreground">{transcription}</p>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4">
              {!isRecording && state === "ready" && (
                <Button variant="hero" size="lg" onClick={startRecording} className="gap-2">
                  <Mic className="w-5 h-5" />
                  {t.voiceInterview.startRecording}
                </Button>
              )}

              {isRecording && (
                <Button variant="destructive" size="lg" onClick={stopRecording} className="gap-2">
                  <MicOff className="w-5 h-5" />
                  {t.voiceInterview.stopRecording}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
      </div>
    </div>
  )
}
