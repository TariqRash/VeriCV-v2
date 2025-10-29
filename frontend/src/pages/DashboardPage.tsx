import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { login, register, uploadCV, getFeedback, generateQuiz, submitQuiz } from "@/api/endpoints";
import { 
  User, 
  FileText, 
  Brain, 
  Calendar, 
  TrendingUp, 
  Eye,
  Plus,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";

const DashboardPage = () => {
  const userStats = {
    totalAssessments: 3,
    averageScore: 78,
    lastAssessment: "2 days ago",
    strongestSkill: "Python"
  };

  const recentAssessments = [
    {
      id: 1,
      date: "2024-01-15",
      title: "Full Stack Developer Resume",
      score: 85,
      skills: ["React", "Node.js", "MongoDB", "Leadership"],
      status: "completed"
    },
    {
      id: 2,
      date: "2024-01-10",
      title: "Software Engineer Resume",
      score: 78,
      skills: ["Python", "SQL", "Git", "Communication"],  
      status: "completed"
    },
    {
      id: 3,
      date: "2024-01-05",
      title: "Frontend Developer Resume",
      score: 72,
      skills: ["JavaScript", "CSS", "React", "Problem Solving"],
      status: "completed"
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 70) return "text-primary";
    return "text-destructive";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 70) return "secondary";
    return "destructive";
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
            <p className="text-muted-foreground">
              Track your progress and continue improving your skills
            </p>
          </div>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Button asChild variant="outline">
              <Link to="/upload">
                <Plus className="w-4 h-4 mr-2" />
                New Assessment
              </Link>
            </Button>
            <Button asChild variant="hero">
              <Link to="/quiz">
                <Brain className="w-4 h-4 mr-2" />
                Quick Quiz
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.totalAssessments}</p>
                  <p className="text-sm text-muted-foreground">Assessments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.averageScore}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.strongestSkill}</p>
                  <p className="text-sm text-muted-foreground">Top Skill</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.lastAssessment}</p>
                  <p className="text-sm text-muted-foreground">Last Activity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Assessments */}
        <Card className="shadow-large">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Your Assessment History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="border rounded-lg p-4 hover:shadow-medium transition-smooth"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold">{assessment.title}</h3>
                        <Badge 
                          variant={getScoreBadgeVariant(assessment.score)}
                          className="text-xs"
                        >
                          {assessment.score}%
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(assessment.date).toLocaleDateString()}</span>
                        </span>
                        <span>{assessment.skills.length} skills analyzed</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {assessment.skills.slice(0, 4).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {assessment.skills.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{assessment.skills.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/results`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Report
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Ready for your next assessment?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="hero" size="lg">
              <Link to="/upload">
                <FileText className="w-5 h-5 mr-2" />
                Upload New Resume
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/quiz">
                <Brain className="w-5 h-5 mr-2" />
                Take Practice Quiz
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
