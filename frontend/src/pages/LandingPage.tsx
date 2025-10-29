"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Brain, BarChart3, CheckCircle, FileText, Users, Mic } from "lucide-react"
import { Link } from "react-router-dom"
import { useLanguage } from "@/context/LanguageContext"
import heroImage from "@/assets/hero-bg.jpg"

const LandingPage = () => {
  const { t } = useLanguage()

  const steps = [
    {
      icon: Upload,
      title: t.landing.howItWorks.steps.upload.title,
      description: t.landing.howItWorks.steps.upload.description,
    },
    {
      icon: Brain,
      title: t.landing.howItWorks.steps.analyze.title,
      description: t.landing.howItWorks.steps.analyze.description,
    },
    {
      icon: CheckCircle,
      title: t.landing.howItWorks.steps.quiz.title,
      description: t.landing.howItWorks.steps.quiz.description,
    },
    {
      icon: BarChart3,
      title: t.landing.howItWorks.steps.feedback.title,
      description: t.landing.howItWorks.steps.feedback.description,
    },
  ]

  const features = [
    {
      icon: FileText,
      title: t.landing.features.items.analysis.title,
      description: t.landing.features.items.analysis.description,
    },
    {
      icon: Brain,
      title: t.landing.features.items.quiz.title,
      description: t.landing.features.items.quiz.description,
    },
    {
      icon: BarChart3,
      title: t.landing.features.items.feedback.title,
      description: t.landing.features.items.feedback.description,
    },
    {
      icon: Mic,
      title: t.landing.features.items.interview.title,
      description: t.landing.features.items.interview.description,
    },
    {
      icon: Users,
      title: t.landing.features.items.ready.title,
      description: t.landing.features.items.ready.description,
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-5"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="gradient-hero absolute inset-0" />
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto animate-slide-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              {t.landing.hero.title}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-4">{t.landing.hero.subtitle}</p>
            <p className="text-lg md:text-xl text-muted-foreground mb-12">{t.landing.hero.cta}</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="hero" size="xl" className="animate-float">
                <Link to="/upload">{t.landing.hero.uploadButton}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.landing.howItWorks.title}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.landing.howItWorks.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <Card key={step.title} className="card-hover text-center">
                <CardContent className="p-6">
                  <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.landing.features.title}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.landing.features.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {features.map((feature) => (
              <Card key={feature.title} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.landing.cta.title}</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">{t.landing.cta.subtitle}</p>
          <Button asChild variant="hero" size="xl">
            <Link to="/upload">{t.landing.cta.button}</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
