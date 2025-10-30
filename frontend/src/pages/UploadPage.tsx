"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, CheckCircle, X, LogIn, ArrowRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { uploadCV } from "@/api/endpoints"
import { useLanguage } from "@/context/LanguageContext"
import { supabaseHelpers } from "@/lib/supabase"

type UploadState = "idle" | "uploading" | "success" | "error" | "unauth"

export default function UploadPage() {
  const { t, language } = useLanguage()
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [state, setState] = useState<UploadState>("idle")
  const [serverFileName, setServerFileName] = useState<string>("")
  const [cvId, setCvId] = useState<string | number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()
  const nav = useNavigate()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onPick = (file: File | undefined | null) => {
    if (!file) return
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      setUploadedFile(null)
      setError(language === "ar" ? "يرجى اختيار ملف PDF" : "Please select a PDF file.")
      toast({
        title: language === "ar" ? "ملف غير صالح" : "Invalid file",
        description: language === "ar" ? "يدعم PDF فقط" : "Only PDF is supported.",
        variant: "destructive",
      })
      return
    }
    setUploadedFile(file)
    setError(null)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files)
      onPick(files[0])
    },
    [language],
  )

  const openFileDialog = () => {
    if (state === "uploading") return
    fileInputRef.current?.click()
  }

  const onHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    onPick(f)
    e.currentTarget.value = ""
  }

  const resetUpload = () => {
    setUploadedFile(null)
    setError(null)
    setState("idle")
    setCvId(null)
    setServerFileName("")
  }

  const startQuiz = () => {
    if (!cvId) return
    nav("/quiz", { state: { cvId } })
  }

  const doUpload = async () => {
    const token = localStorage.getItem("access")
    if (!token) {
      setState("unauth")
      setError(t.upload.authRequired)
      return
    }
    if (!uploadedFile) {
      setError(language === "ar" ? "يرجى اختيار ملف PDF للرفع" : "Please choose a PDF to upload.")
      return
    }
    setState("uploading")
    setError(null)

    try {
      const res = await uploadCV(uploadedFile)
      const backendCvId = res?.cv_id ?? res?.id ?? res?.cvId

      if (!backendCvId) throw new Error("Upload succeeded but server did not return cv_id.")

      const cvData = await supabaseHelpers.saveCV({
        filename: res?.filename ?? uploadedFile.name,
        extracted_name: res?.extracted_name ?? "",
        extracted_phone: res?.extracted_phone ?? "",
        extracted_city: res?.extracted_city ?? "",
        ip_detected_city: res?.ip_detected_city ?? "",
        info_confirmed: false,
        backend_cv_id: backendCvId,
        uploaded_at: new Date().toISOString(),
      })

      const id = cvData.id
      localStorage.setItem("last_cv_id", String(id))
      window.dispatchEvent(new StorageEvent("storage", { key: "last_cv_id", newValue: String(id) }))

      setCvId(id)
      setServerFileName(cvData.filename)
      setState("success")

      toast({
        title: t.upload.success,
        description: language === "ar" ? "تم رفع سيرتك الذاتية بنجاح" : "Your CV has been uploaded successfully.",
      })
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 401 || status === 403) {
        setState("unauth")
        setError(t.upload.authRequired)
        return
      }
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.message ||
        (language === "ar" ? "فشل الرفع" : "Upload failed.")
      setError(msg)
      setState("error")
      toast({ title: language === "ar" ? "فشل الرفع" : "Upload failed", description: msg, variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{t.upload.title}</h1>
          <p className="text-lg text-muted-foreground">{t.upload.subtitle}</p>
        </div>

        {(state === "idle" || state === "uploading" || (!cvId && uploadedFile)) && (
          <Card className="shadow-large">
            <CardContent className="p-8">
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-105"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">{t.upload.dragDrop}</h3>
                <p className="text-muted-foreground mb-6">{t.upload.or}</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={onHiddenInputChange}
                  style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
                  tabIndex={-1}
                />

                <div className="inline-flex">
                  <Button
                    variant="hero"
                    size="lg"
                    className="gap-2"
                    onClick={openFileDialog}
                    disabled={state === "uploading"}
                  >
                    <Upload className="w-4 h-4" />
                    {state === "uploading" ? t.upload.uploading : t.upload.selectButton}
                  </Button>
                </div>

                {uploadedFile && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
                    <FileText className="w-5 h-5" />
                    <span>
                      {t.upload.selected} <strong>{uploadedFile.name}</strong>
                    </span>
                  </div>
                )}

                <p className="text-sm text-muted-foreground mt-4">{t.upload.fileSupport}</p>

                <div className="mt-6">
                  <Button
                    variant="hero"
                    size="lg"
                    className="gap-2"
                    onClick={doUpload}
                    disabled={!uploadedFile || state === "uploading"}
                  >
                    <ArrowRight className="w-4 h-4" />
                    {state === "uploading" ? t.upload.uploading : t.upload.uploadButton}
                  </Button>
                </div>

                {error && <div className="text-red-600 text-sm mt-4">{error}</div>}
              </div>
            </CardContent>
          </Card>
        )}

        {state === "success" && (
          <Card className="shadow-medium animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <span>{t.upload.success}</span>
                </span>
                <Button variant="ghost" size="sm" onClick={resetUpload}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <FileText className="w-5 h-5" />
                <span>{serverFileName || uploadedFile?.name}</span>
              </div>
              <div className="text-center pt-4">
                <Button variant="hero" size="lg" className="gap-2" onClick={startQuiz}>
                  <ArrowRight className="w-4 h-4" />
                  {t.upload.startQuiz}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {language === "ar" ? `تم حفظ معرف السيرة الذاتية ${String(cvId)}` : `Saved CV ID ${String(cvId)}`}
              </div>
            </CardContent>
          </Card>
        )}

        {state === "unauth" && (
          <Card className="shadow-medium animate-fade-in mt-6">
            <CardContent className="p-6 text-center space-y-3">
              <div className="text-amber-600 text-sm">{t.upload.authRequired}</div>
              <Button variant="hero" size="lg" className="gap-2" onClick={() => nav("/login")}>
                <LogIn className="w-4 h-4" />
                {t.upload.goToLogin}
              </Button>
              <Button variant="outline" onClick={resetUpload}>
                {t.upload.back}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
