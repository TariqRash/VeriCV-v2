"use client"

import { Github, LinkedinIcon, FileText, Brain, BarChart3, User, Home } from "lucide-react"
import { Link } from "react-router-dom"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"

const Footer = () => {
  const { language } = useLanguage()
  const { user } = useAuth()

  return (
    <footer className="bg-muted/50 border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        {user && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div>
              <h3 className="font-semibold mb-3 text-sm">{language === "ar" ? "التنقل السريع" : "Quick Links"}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/" className="hover:text-primary transition-smooth flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    {language === "ar" ? "الرئيسية" : "Home"}
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:text-primary transition-smooth flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {language === "ar" ? "لوحة التحكم" : "Dashboard"}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">{language === "ar" ? "التقييمات" : "Assessments"}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/upload" className="hover:text-primary transition-smooth flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {language === "ar" ? "رفع السيرة الذاتية" : "Upload CV"}
                  </Link>
                </li>
                <li>
                  <Link to="/quiz" className="hover:text-primary transition-smooth flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    {language === "ar" ? "اختبار سريع" : "Quick Quiz"}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">{language === "ar" ? "النتائج" : "Results"}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/results" className="hover:text-primary transition-smooth flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {language === "ar" ? "آخر النتائج" : "Latest Results"}
                  </Link>
                </li>
                <li>
                  <Link to="/interview" className="hover:text-primary transition-smooth flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {language === "ar" ? "مقابلة صوتية" : "Voice Interview"}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-sm">{language === "ar" ? "معلومات" : "Information"}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/about" className="hover:text-primary transition-smooth">
                    {language === "ar" ? "عن المنصة" : "About"}
                  </Link>
                </li>
                <li>
                  <Link to="/team" className="hover:text-primary transition-smooth">
                    {language === "ar" ? "الفريق" : "Team"}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 pt-6 border-t">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-6 h-6 gradient-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">V</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {language === "ar" ? "© 2025 VeriCV. جميع الحقوق محفوظة" : "© 2025 VeriCV. All rights reserved"}
            </span>
          </div>

          <div className="flex items-center space-x-3 space-x-reverse">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-smooth"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-smooth"
            >
              <LinkedinIcon className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
