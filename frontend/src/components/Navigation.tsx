"use client"

// src/components/Navigation.tsx
import { useState, useEffect } from "react"
import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Menu, X, FileText, Home, Info, LogOut, LogIn, UserPlus, LayoutDashboard } from "lucide-react"
import { isAuthenticated, hasUploadedCV, logout, subscribeAuth } from "@/utils/auth"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { useLanguage } from "@/context/LanguageContext"
import api from "@/utils/api"

const Navigation = () => {
  const { t, language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [authed, setAuthed] = useState(isAuthenticated())
  const [cvReady, setCvReady] = useState(hasUploadedCV())
  const [userName, setUserName] = useState<string | null>(null)
  const nav = useNavigate()
  const location = useLocation()

  // Keep state fresh on any auth change
  useEffect(() => {
    const refresh = () => {
      setAuthed(isAuthenticated())
      setCvReady(hasUploadedCV())
    }
    refresh() // on mount
    const unsub = subscribeAuth(refresh)
    // still keep these as fallbacks (optional)
    const onStorage = () => refresh()
    const onDomEvent = () => refresh()
    window.addEventListener("storage", onStorage)
    window.addEventListener("auth-changed", onDomEvent)
    return () => {
      unsub()
      window.removeEventListener("storage", onStorage)
      window.removeEventListener("auth-changed", onDomEvent)
    }
  }, [])

  // Also re-check on route change
  useEffect(() => {
    setAuthed(isAuthenticated())
    setCvReady(hasUploadedCV())
  }, [location.pathname])

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authed) {
        setUserName(null)
        return
      }

      try {
        // Try to get name from localStorage first
        const storedName = localStorage.getItem("user_name")
        if (storedName) {
          setUserName(storedName)
          return
        }

        // Otherwise fetch from API
        const { data } = await api.get("users/profile/")
        if (data?.name) {
          setUserName(data.name)
          localStorage.setItem("user_name", data.name)
        }
      } catch (err) {
        console.error("[v0] Failed to fetch user profile:", err)
      }
    }

    fetchUserProfile()
  }, [authed])

  const navItems = [
    { name: t.nav.home, href: "/", icon: Home, show: true },
    { name: t.nav.upload, href: "/upload", icon: FileText, show: authed },
    { name: language === "ar" ? "لوحة التحكم" : "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: authed },
    { name: t.nav.about, href: "/about", icon: Info, show: true },
  ].filter((i) => i.show)

  const handleLogout = () => {
    logout()
    nav("/")
  }

  return (
    <nav className="bg-background/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50 shadow-soft">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <NavLink
          to="/"
          className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="VeriCV home"
        >
          <img src="/brand/favicon.svg" alt="VeriCV" className="h-10 w-10" />
        </NavLink>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-2 text-sm font-medium transition-smooth ${
                  isActive ? "text-primary" : "text-foreground/70 hover:text-foreground"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </NavLink>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          {!authed ? (
            <>
              <Button variant="outline" onClick={() => nav("/login")} className="transition-smooth">
                <LogIn className="w-4 h-4 mr-2" />
                {t.nav.signIn}
              </Button>
              <Button className="gradient-primary button-glow shadow-glow" onClick={() => nav("/register")}>
                <UserPlus className="w-4 h-4 mr-2" />
                {t.nav.signUp}
              </Button>
            </>
          ) : (
            <>
              {userName && (
                <span className="text-sm font-medium text-muted-foreground">
                  {language === "ar" ? `مرحباً، ${userName}` : `Hello, ${userName}`}
                </span>
              )}
              <Button variant="outline" onClick={handleLogout} className="transition-smooth bg-transparent">
                <LogOut className="w-4 h-4 mr-2" />
                {t.nav.logout}
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-3">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 py-2 transition-smooth hover:text-primary"
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            ))}
            <div className="flex items-center gap-2 pt-2 pb-2 border-t border-border/50">
              <LanguageSwitcher />
            </div>
            <div className="flex gap-2 pt-2">
              {!authed ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => {
                      setIsOpen(false)
                      nav("/login")
                    }}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {t.nav.signIn}
                  </Button>
                  <Button
                    className="flex-1 gradient-primary button-glow"
                    onClick={() => {
                      setIsOpen(false)
                      nav("/register")
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t.nav.signUp}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    setIsOpen(false)
                    handleLogout()
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t.nav.logout}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navigation
