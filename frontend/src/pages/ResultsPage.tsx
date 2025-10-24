import { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  TrendingUp,
  Target,
  BookOpen,
  ArrowRight,
  Download,
  Share,
} from "lucide-react";

/**
 * ResultsPage expects to receive (via router state) something like:
 * {
 *   overallScore: number,
 *   skills: Array<{ skill: string; score: number; category?: 'technical'|'soft' }>,
 *   recommendations?: Array<{ skill: string; suggestion: string; resources: string[] }>
 * }
 *
 * If not provided, it builds a best-effort summary from `answers`/`questions` (also in state)
 * or shows a friendly empty view.
 */
export default function ResultsPage() {
  const location = useLocation() as any;
  const state = location?.state || {};

  // ----- Helpers to colorize -----
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 70) return "text-primary";
    return "text-destructive";
  };
  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-success";
    if (score >= 70) return "bg-primary";
    return "bg-destructive";
  };

  // ----- Fallback summarizer if only Q&A provided -----
  // If your backend returns detailed scoring, prefer passing it via router state.
  const summarized = useMemo(() => {
    // If full payload provided, just use it
    if (typeof state?.overallScore === "number" && Array.isArray(state?.skills)) {
      return {
        overallScore: state.overallScore,
        skills: state.skills as Array<{ skill: string; score: number; category?: string }>,
        recommendations: state.recommendations || [],
      };
    }

    // Otherwise, try to guess a score from questions with `correctAnswer` and numeric answers
    const qs: any[] = Array.isArray(state?.questions) ? state.questions : [];
    const ans: Record<number, number | string> = state?.answers || {};

    let correct = 0;
    let total = 0;
    const skillScores: Record<string, { sum: number; count: number; category: string }> = {};

    qs.forEach((q, i) => {
      const hasOptions = Array.isArray(q.options) && q.options.length > 0;
      const skill = q.skill || q.topic || "General";
      const category = q.category || (skill === "Communication" ? "soft" : "technical");

      // If there is a correctAnswer index and the answer is numeric, grade it
      if (hasOptions && typeof q.correctAnswer === "number") {
        total += 1;
        if (ans[i] === q.correctAnswer) correct += 1;
      }

      // For skill aggregation: pretend correct=1/0 mapped to 100/0,
      // else give neutral 70 to short answers (so they show up)
      const thisScore =
        hasOptions && typeof q.correctAnswer === "number"
          ? ans[i] === q.correctAnswer
            ? 100
            : 0
          : 70;

      if (!skillScores[skill]) skillScores[skill] = { sum: 0, count: 0, category };
      skillScores[skill].sum += thisScore;
      skillScores[skill].count += 1;
    });

    const skills = Object.entries(skillScores).map(([skill, agg]) => ({
      skill,
      score: Math.round(agg.sum / Math.max(1, agg.count)),
      category: agg.category,
    }));

    const overallScore =
      typeof state?.overallScore === "number"
        ? state.overallScore
        : total > 0
        ? Math.round((correct / total) * 100)
        : Math.round(
            skills.reduce((acc, s) => acc + s.score, 0) / Math.max(1, skills.length)
          );

    // Very lightweight recommendations based on <70
    const recommendations = skills
      .filter((s) => s.score < 70)
      .slice(0, 3)
      .map((s) => ({
        skill: s.skill,
        suggestion:
          s.skill === "Git"
            ? "Practice advanced Git workflows and branching strategies."
            : s.skill === "SQL"
            ? "Focus on joins, aggregations, and query optimization."
            : "Review fundamentals and practice with small projects.",
        resources: ["FreeCodeCamp", "MDN / Docs", "HackerRank / LeetCode"],
      }));

    return { overallScore, skills, recommendations };
  }, [state]);

  const strengths = (summarized.skills || []).filter((s) => s.score >= 80);
  const improvements = (summarized.skills || []).filter((s) => s.score < 70);

  // ----- Export/Share actions -----
  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(summarized, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vericv-results.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Trophy className="w-16 h-16 gradient-primary text-white p-3 rounded-full mx-auto mb-4 shadow-glow" />
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Your Assessment Results</h1>
          <p className="text-lg text-muted-foreground">
            Here&apos;s your personalized skill analysis and improvement roadmap
          </p>
        </div>

        {/* If nothing to show, display an empty state */}
        {!summarized?.skills?.length ? (
          <Card className="shadow-large">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No results to display yet. Please complete a quiz first.
              </p>
              <div className="mt-6">
                <Button asChild variant="hero" size="lg">
                  <Link to="/quiz">
                    Go to Quiz
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overall Score */}
            <Card className="shadow-large mb-8">
              <CardContent className="p-8 text-center">
                <div className="flex items-center justify-center space-x-8">
                  <div>
                    <div className="text-5xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                      {summarized.overallScore}%
                    </div>
                    <p className="text-muted-foreground">Overall Score</p>
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-semibold mb-2">Great Performance!</h3>
                    <p className="text-muted-foreground max-w-md">
                      You&apos;ve demonstrated strong capabilities. Focus on the areas below for even better results.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Skill Breakdown */}
              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>Skill Breakdown</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {summarized.skills.map((result: any) => (
                      <div key={result.skill} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{result.skill}</span>
                            <Badge
                              variant={result.category === "soft" ? "secondary" : "default"}
                              className="text-xs"
                            >
                              {result.category || "technical"}
                            </Badge>
                          </div>
                          <span className={`font-bold ${getScoreColor(result.score)}`}>
                            {result.score}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(
                              result.score
                            )}`}
                            style={{ width: `${result.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Strengths & Improvements */}
              <div className="space-y-6">
                {/* Strengths */}
                <Card className="shadow-medium">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-success">
                      <TrendingUp className="w-5 h-5" />
                      <span>Your Strengths</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {strengths.length ? (
                        strengths.map((strength) => (
                          <div key={strength.skill} className="flex items-center justify-between">
                            <span>{strength.skill}</span>
                            <Badge variant="secondary" className="bg-success/10 text-success">
                              {strength.score}%
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">We&apos;ll highlight strengths here.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Areas for Improvement */}
                <Card className="shadow-medium">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-primary">
                      <Target className="w-5 h-5" />
                      <span>Focus Areas</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {improvements.length ? (
                        improvements.map((improvement) => (
                          <div key={improvement.skill} className="flex items-center justify-between">
                            <span>{improvement.skill}</span>
                            <Badge variant="outline" className="border-primary text-primary">
                              {improvement.score}%
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No critical gaps detected.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recommendations */}
            {!!summarized.recommendations?.length && (
              <Card className="shadow-medium mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5" />
                    <span>Personalized Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {summarized.recommendations.map((rec: any) => (
                      <div key={rec.skill} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">{rec.skill}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{rec.suggestion}</p>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Recommended Resources:</p>
                          {(rec.resources || []).map((resource: string) => (
                            <Badge key={resource} variant="outline" className="mr-2 text-xs">
                              {resource}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
<div className="flex flex-col sm:flex-row gap-4 justify-center">
  <Button variant="hero" size="lg" onClick={downloadReport}>
    <Download className="w-4 h-4 mr-2" />
    Download Report
  </Button>
  <Button
    variant="outline"
    size="lg"
    onClick={() => {
      navigator.clipboard.writeText(window.location.href);
    }}
  >
    <Share className="w-4 h-4 mr-2" />
    Share Results
  </Button>
</div>
          </>
        )}
      </div>
    </div>
  );
}
