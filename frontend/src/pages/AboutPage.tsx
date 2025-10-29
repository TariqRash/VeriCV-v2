import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Users, Target, Zap, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { login, register, uploadCV, getFeedback, generateQuiz, submitQuiz } from "@/api/endpoints";


const AboutPage = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced machine learning algorithms analyze your resume to identify and categorize both technical and soft skills with high accuracy."
    },
    {
      icon: Target,
      title: "Personalized Assessments",
      description: "Every quiz is tailored to your specific skill set, ensuring relevant and challenging questions that accurately measure your abilities."
    },
    {
      icon: Zap,
      title: "Instant Feedback",
      description: "Get immediate insights into your strengths and areas for improvement with detailed explanations and learning resources."
    },
    {
      icon: Users,
      title: "Industry Relevant",
      description: "Our assessments are designed with input from tech industry professionals to match real-world job requirements."
    }
  ];

  const stats = [
    { number: "10,000+", label: "Resumes Analyzed" },
    { number: "50,000+", label: "Skills Assessed" },
    { number: "95%", label: "Accuracy Rate" },
    { number: "24/7", label: "Available" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-hero py-20">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About VeriCV
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            We're revolutionizing how tech professionals discover and validate their skills. 
            Our AI-powered platform helps you understand your true strengths and prepare 
            for your next career opportunity.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              To bridge the gap between what professionals know and what they can confidently 
              demonstrate. We believe everyone deserves to understand their true capabilities 
              and have the tools to showcase them effectively.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose VeriCV?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform combines cutting-edge AI technology with practical career development insights
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {features.map((feature) => (
              <Card key={feature.title} className="card-hover">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground">
              Simple, fast, and accurate - get insights in minutes, not hours
            </p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start space-x-6">
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Upload Your Resume</h3>
                <p className="text-muted-foreground">
                  Simply drag and drop your resume in PDF or Word format. Our AI immediately 
                  begins analyzing your experience, skills, and achievements.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
                <p className="text-muted-foreground">
                  Our advanced algorithms extract and categorize your technical and soft skills, 
                  creating a comprehensive skill profile based on your background.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Personalized Quiz</h3>
                <p className="text-muted-foreground">
                  Take a tailored assessment that tests your knowledge in the areas identified 
                  in your resume, ensuring relevant and challenging questions.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-6">
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Detailed Feedback</h3>
                <p className="text-muted-foreground">
                  Receive comprehensive results showing your strengths, areas for improvement, 
                  and personalized recommendations with learning resources.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact/CTA */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Discover Your Potential?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of tech professionals who have already used VeriCV to 
            advance their careers and build confidence in their abilities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button asChild variant="hero" size="lg">
              <Link to="/upload">Start Your Assessment</Link>
            </Button>
            <Button variant="outline" size="lg">
              <Mail className="w-4 h-4 mr-2" />
              Contact Us
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
