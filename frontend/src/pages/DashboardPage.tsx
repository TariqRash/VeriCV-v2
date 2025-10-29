"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, FileText, Brain, Calendar, TrendingUp, Eye, Plus, BarChart3, Loader2 } from "lucide-react"
import { Link } from "react-router-dom"
import { useLanguage } from "@/context/LanguageContext"
import api from "@/api/http"

type Assessment = {
  id: number
  date: string
  title: string
  score: number
  skills: string[]
  status: string
  feedback?: string
}

const DashboardPage = () => {
  const { t, language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [stats, setStats] = useState({
    totalAssessments: 0,
    averageScore: 0,
    lastAssessment: "",
    strongestSkill: "",
  })

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        const { data: results } = await api.get("quiz/results/")

        if (results && results.length > 0) {
          const formattedAssessments = results.map((result: any) => {
            let skills: string[] = []

            // Try to extract skills from answers
            if (result.answers && Array.isArray(result.answers)) {
              skills = result.answers.map((ans: any) => ans.skill).filter((s: string) => s)
            }

            // Fallback to quiz questions if available
            if (skills.length === 0 && result.quiz?.questions) {
              skills = result.quiz.questions.map((q: any) => q.skill || q.topic).filter((s: string) => s)
            }

            return {
              id: result.id,
              date: result.completed_at || result.created_at,
              title: result.quiz?.title || result.quiz_title || "Assessment",
              score: Math.round(result.score || 0),
              skills: [...new Set(skills)], // Remove duplicates
              status: "completed",
              feedback: result.feedback?.content,
            }
          })

          setAssessments(formattedAssessments)

          const total = formattedAssessments.length
          const avgScore = Math.round(
            formattedAssessments.reduce((sum: number, a: Assessment) => sum + a.score, 0) / total,
          )

          // Find strongest skill based on frequency and scores
          const skillScores: Record<string, { total: number; count: number }> = {}
          formattedAssessments.forEach((a: Assessment) => {
            a.skills.forEach((skill: string) => {
              if (!skillScores[skill]) skillScores[skill] = { total: 0, count: 0 }
              skillScores[skill].total += a.score
              skillScores[skill].count += 1
            })
          })

          let topSkill = ""
          let topAvg = 0
          Object.entries(skillScores).forEach(([skill, data]) => {
            const avg = data.total / data.count
            if (avg > topAvg) {
              topAvg = avg
              topSkill = skill
            }
          })

          const lastDate = new Date(formattedAssessments[0].date)
          const daysAgo = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          const lastActivity =
            daysAgo === 0
              ? language === "ar"
                ? "اليوم"
                : "Today"
              : daysAgo === 1
                ? language === "ar"
                  ? "أمس"
                  : "Yesterday"
                : language === "ar"
                  ? `منذ ${daysAgo} أيام`
                  : `${daysAgo} days ago`

          setStats({
            totalAssessments: total,
            averageScore: avgScore,
            lastAssessment: lastActivity,
            strongestSkill: topSkill || (language === "ar" ? "غير متوفر" : "N/A"),
          })
        } else {
          setAssessments([])
          setStats({
            totalAssessments: 0,
            averageScore: 0,
            lastAssessment: language === "ar" ? "لا يوجد" : "None",
            strongestSkill: language === "ar" ? "غير متوفر" : "N/A",
          })
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
        setAssessments([])
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [language])

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default"
    if (score >= 70) return "secondary"
    return "destructive"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero py-8 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{language === "ar" ? "مرحباً بعودتك!" : "Welcome back!"}</h1>
            <p className="text-muted-foreground">
              {language === "ar"
                ? "تتبع تقدمك واستمر في تحسين مهاراتك"
                : "Track your progress and continue improving your skills"}
            </p>
          </div>
          <div className="flex space-x-2 space-x-reverse mt-4 md:mt-0">
            <Button asChild variant="outline">
              <Link to="/upload">
                <Plus className="w-4 h-4 mr-2" />
                {language === "ar" ? "تقييم جديد" : "New Assessment"}
              </Link>
            </Button>
            <Button asChild variant="hero">
              <Link to="/quiz">
                <Brain className="w-4 h-4 mr-2" />
                {language === "ar" ? "اختبار سريع" : "Quick Quiz"}
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-medium hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalAssessments}</p>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "التقييمات" : "Assessments"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.averageScore}%</p>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "متوسط الدرجة" : "Average Score"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.strongestSkill}</p>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "أفضل مهارة" : "Top Skill"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.lastAssessment}</p>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "آخر نشاط" : "Last Activity"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Assessments */}
        <Card className="shadow-large">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <User className="w-5 h-5" />
              <span>{language === "ar" ? "سجل التقييمات" : "Your Assessment History"}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assessments.length > 0 ? (
              <div className="space-y-4">
                {assessments.map((assessment) => (
                  <div key={assessment.id} className="border rounded-lg p-4 hover:shadow-medium transition-smooth">
                    <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 space-x-reverse mb-2">
                          <h3 className="font-semibold">{assessment.title}</h3>
                          <Badge variant={getScoreBadgeVariant(assessment.score)} className="text-xs">
                            {assessment.score}%
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 space-x-reverse text-sm text-muted-foreground mb-3">
                          <span className="flex items-center space-x-1 space-x-reverse">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(assessment.date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                            </span>
                          </span>
                          <span>
                            {language === "ar"
                              ? `${assessment.skills.length} مهارات تم تحليلها`
                              : `${assessment.skills.length} skills analyzed`}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {assessment.skills.slice(0, 4).map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {assessment.skills.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{assessment.skills.length - 4} {language === "ar" ? "المزيد" : "more"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 space-x-reverse">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/results`} state={{ result_id: assessment.id }}>
                            <Eye className="w-4 h-4 mr-2" />
                            {language === "ar" ? "عرض التقرير" : "View Report"}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {language === "ar"
                  ? "لا توجد تقييمات بعد. ابدأ بتحميل سيرتك الذاتية!"
                  : "No assessments yet. Start by uploading your resume!"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <h2 className="text-xl font-semibold mb-4">
            {language === "ar" ? "هل أنت مستعد للتقييم التالي؟" : "Ready for your next assessment?"}
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="hero" size="lg">
              <Link to="/upload">
                <FileText className="w-5 h-5 mr-2" />
                {language === "ar" ? "رفع سيرة ذاتية جديدة" : "Upload New Resume"}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/quiz">
                <Brain className="w-5 h-5 mr-2" />
                {language === "ar" ? "اختبار سريع" : "Quick Quiz"}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
