"use client"

import type React from "react"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { register, login } from "@/api/endpoints"
import { useLanguage } from "@/context/LanguageContext"
import { UserPlus, Loader2 } from "lucide-react"

export default function SignUp() {
  const { t } = useLanguage()
  const nav = useNavigate()
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const passwordsMatch = password === confirm || confirm.length === 0

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!name || !username || !password || !confirm) {
      setError(t.auth.signUp.error.empty)
      setLoading(false)
      return
    }
    if (password !== confirm) {
      setError(t.auth.signUp.error.mismatch)
      setLoading(false)
      return
    }

    try {
      await register({ username, password, confirm, name })
      const res = await login(username, password)
      if (res?.access) {
        nav("/")
      } else {
        setError("Registered but auto-login failed. Please sign in.")
      }
    } catch (err: any) {
      console.error(err)
      const msg =
        err?.data && typeof err.data === "string"
          ? err.data
          : err?.data?.error || err?.data?.detail || t.auth.signUp.error.failed
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <Card className="w-full max-w-md shadow-large backdrop-blur-sm bg-card/95 border-border/50 relative z-10 animate-slide-in">
        <CardHeader className="text-center space-y-2">
          <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {t.auth.signUp.title}
          </CardTitle>
          <CardDescription className="text-base">{t.auth.signUp.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                {t.auth.signUp.name}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="transition-smooth focus:shadow-soft"
                placeholder={t.auth.signUp.name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                {t.auth.signUp.username}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="transition-smooth focus:shadow-soft"
                placeholder={t.auth.signUp.username}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t.auth.signUp.password}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="transition-smooth focus:shadow-soft"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm font-medium">
                {t.auth.signUp.confirm}
              </Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="transition-smooth focus:shadow-soft"
                placeholder="••••••••"
              />
              {!passwordsMatch && <p className="text-xs text-destructive">{t.auth.signUp.error.mismatch}</p>}
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary button-glow shadow-glow h-11"
              disabled={loading || !passwordsMatch}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.auth.signUp.loading}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t.auth.signUp.button}
                </>
              )}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            {t.auth.signUp.hasAccount}{" "}
            <Link to="/login" className="text-primary hover:underline font-medium transition-smooth">
              {t.auth.signUp.signInLink}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
