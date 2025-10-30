"use client"

import { useEffect, useState } from "react"
import { useLocation, Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Trophy, TrendingUp, Target, BookOpen, ArrowRight, Download, Share, Loader2, Home } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { getSupabaseClient } from "@/lib/supabase"

type SkillResult = {
  skill: string
  score: number
  category?: string
}

type Recommendation = {
  skill: string
  suggestion: string
  resources: string[]
}

type ResultData = {
  overallScore: number
  skills: SkillResult[]
  recommendations: Recommendation[]
  feedback?: string
}

export default function ResultsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [resultData, setResultData] = useState<ResultData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true)
        console.log("[v0] ResultsPage: Starting fetch...")

        const urlParams = new URLSearchParams(location.search)
        const resultIdFromUrl = urlParams.get("result_id")
        const resultIdFromState = (location.state as any)?.result_id
        const resultIdFromStorage = localStorage.getItem("last_result_id")

        const resultId = resultIdFromUrl || resultIdFromState || resultIdFromStorage

        console.log("[v0] Final result_id:", resultId)

        if (!resultId || resultId === "null" || resultId === "undefined") {
          setError("No results found")
          setLoading(false)
          return
        }

        const supabase = getSupabaseClient()

        const { data, error } = await supabase.from("quiz_result").select("*").eq("id", resultId).single()

        if (error) {
          console.error("[v0] Error fetching result:", error)
          setError("Failed to load results")
          setLoading(false)
          return
        }

        console.log("[v0] Fetched result from Supabase:", data)

        if (data) {
          processResultData(data)
        } else {
          setError("Result not found")
        }
      } catch (err: any) {
        console.error("[v0] ResultsPage: Error:", err)
        setError(err?.message || "Failed to load results")
      } finally {
        setLoading(false)
      }
    }

    const processResultData = (data: any) => {
      let answers = data.answers
      console.log("[v0] Raw answers:", answers, "Type:", typeof answers)

      if (typeof answers === "string") {
        try {
          answers = JSON.parse(answers)
          console.log("[v0] Parsed answers from string:", answers)
        } catch (e) {
          console.error("[v0] Failed to parse answers:", e)
          answers = []
        }
      }

      const skillMap: Record<string, { total: number; count: number; category: string }> = {}

      if (Array.isArray(answers)) {
        console.log("[v0] Processing", answers.length, "answers")
        answers.forEach((a: any, idx: number) => {
          const skill = a.skill || "General"
          const category = a.category || "technical"
          const score = a.isCorrect ? 100 : 0

          console.log(`[v0] Answer ${idx}: skill=${skill}, score=${score}, isCorrect=${a.isCorrect}`)

          if (!skillMap[skill]) {
            skillMap[skill] = { total: 0, count: 0, category }
          }
          skillMap[skill].total += score
          skillMap[skill].count += 1
        })
      }

      console.log("[v0] Skill map:", skillMap)

      const aggregatedSkills = Object.entries(skillMap).map(([skill, data]) => ({
        skill,
        score: Math.round(data.total / data.count),
        category: data.category,
      }))

      console.log("[v0] Aggregated skills:", aggregatedSkills)

      const resultData = {
        overallScore: Math.round(data.score || 0),
        skills: aggregatedSkills,
        recommendations: data.recommendations || [],
        feedback: data.feedback?.content || data.feedback,
      }

      console.log("[v0] Final result data:", resultData)
      setResultData(resultData)
    }

    fetchResults()
  }, [location])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400"
    if (score >= 70) return "text-blue-600 dark:text-blue-400"
    return "text-red-600 dark:text-red-400"
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-600"
    if (score >= 70) return "bg-blue-600"
    return "bg-red-600"
  }

  const downloadReport = () => {
    if (!resultData) return
    const blob = new Blob([JSON.stringify(resultData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "vericv-results.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const shareResults = () => {
    if (navigator.share) {
      navigator.share({
        title: "VeriCV Results",
        text: `I scored ${resultData?.overallScore}% on my VeriCV assessment!`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert(language === "ar" ? "تم نسخ الرابط" : "Link copied to clipboard")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <Card className="shadow-large">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">{t.common.loading}</h2>
              <p className="text-muted-foreground">
                {language === "ar" ? "جاري تحميل النتائج..." : "Loading your results..."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error || !resultData) {
    return (
      <div className="min-h-screen bg-gradient-hero py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <Card className="shadow-large">
            <CardContent className="p-12 text-center">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">
                {language === "ar" ? "لم يتم العثور على نتائج" : "No Results Found"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {language === "ar"
                  ? "يرجى إكمال التقييم أولاً لعرض النتائج"
                  : "Please complete an assessment first to view results"}
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild variant="outline" size="lg">
                  <Link to="/">
                    <Home className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                    {language === "ar" ? "الرئيسية" : "Home"}
                  </Link>
                </Button>
                <Button asChild variant="hero" size="lg">
                  <Link to="/upload">
                    <ArrowRight className={`w-4 h-4 ${language === "ar" ? "mr-2" : "ml-2"}`} />
                    {language === "ar" ? "ابدأ التقييم" : "Start Assessment"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const strengths = resultData.skills.filter((s) => s.score >= 80)
  const improvements = resultData.skills.filter((s) => s.score < 70)

  return (
    <div className={`min-h-screen bg-gradient-hero py-8 dir=${language === "ar" ? "rtl" : "ltr"}`}>
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Trophy className="w-16 h-16 gradient-primary text-white p-3 rounded-full mx-auto mb-4 shadow-glow" />
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{t.results.title}</h1>
          <p className="text-lg text-muted-foreground">{t.results.subtitle}</p>
        </div>

        {/* Overall Score */}
        <Card className="shadow-large mb-8 hover:shadow-xl transition-shadow">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col md:flex-row items-center justify-center md:space-x-8 md:space-x-reverse space-y-4 md:space-y-0">
              <div>
                <div className="text-5xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                  {resultData.overallScore}%
                </div>
                <p className="text-muted-foreground">{t.results.overallScore}</p>
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-xl font-semibold mb-2">{t.results.performance}</h3>
                <p className="text-muted-foreground max-w-md">{t.results.performanceText}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Skill Breakdown */}
          <Card className="shadow-medium hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>{t.results.skillBreakdown}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resultData.skills.map((result) => (
                  <div key={result.skill} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{result.skill}</span>
                        <Badge variant={result.category === "soft" ? "secondary" : "default"} className="text-xs">
                          {result.category === "soft" ? t.results.soft : t.results.technical}
                        </Badge>
                      </div>
                      <span className={`font-bold ${getScoreColor(result.score)}`}>{result.score}%</span>
                    </div>
                    <Progress value={result.score} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Strengths & Improvements */}
          <div className="space-y-6">
            {/* Strengths */}
            <Card className="shadow-medium hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <TrendingUp className="w-5 h-5" />
                  <span>{t.results.strengths}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {strengths.length > 0 ? (
                    strengths.map((strength) => (
                      <div key={strength.skill} className="flex items-center justify-between">
                        <span>{strength.skill}</span>
                        <Badge
                          variant="secondary"
                          className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                        >
                          {strength.score}%
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "سنبرز نقاط القوة هنا" : "We'll highlight strengths here"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Areas for Improvement */}
            <Card className="shadow-medium hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <Target className="w-5 h-5" />
                  <span>{t.results.focusAreas}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {improvements.length > 0 ? (
                    improvements.map((improvement) => (
                      <div key={improvement.skill} className="flex items-center justify-between">
                        <span>{improvement.skill}</span>
                        <Badge variant="outline" className="border-blue-600 text-blue-600">
                          {improvement.score}%
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "لم يتم اكتشاف فجوات حرجة" : "No critical gaps detected"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recommendations */}
        {resultData.recommendations && resultData.recommendations.length > 0 && (
          <Card className="shadow-medium hover:shadow-lg transition-shadow mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5" />
                <span>{t.results.recommendations}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {resultData.recommendations.map((rec) => (
                  <div key={rec.skill} className="border rounded-lg p-4 hover:border-primary transition-colors">
                    <h4 className="font-semibold mb-2">{rec.skill}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{rec.suggestion}</p>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{t.results.recommendedResources}</p>
                      <div className="flex flex-wrap gap-2">
                        {rec.resources.map((resource) => (
                          <Badge key={resource} variant="outline" className="text-xs">
                            {resource}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="hero" size="lg">
            <Link to="/dashboard">
              <Home className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
              {language === "ar" ? "لوحة التحكم" : "Go to Dashboard"}
            </Link>
          </Button>
          <Button variant="hero" size="lg" onClick={downloadReport} className="gap-2">
            <Download className="w-4 h-4" />
            {t.results.downloadReport}
          </Button>
          <Button variant="outline" size="lg" onClick={shareResults} className="gap-2 bg-transparent">
            <Share className="w-4 h-4" />
            {t.results.shareResults}
          </Button>
        </div>
      </div>
    </div>
  )
}
