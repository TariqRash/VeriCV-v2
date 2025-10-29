import api from "./http"
import { saveTokens, clearTokens, isAuthed } from "./auth"

/* =====================
   Auth
   ===================== */

export async function login(username: string, password: string) {
  const { data } = await api.post("token/", { username, password })
  if (data?.access && data?.refresh) saveTokens(data.access, data.refresh)
  return data
}

export async function register(payload: {
  username: string
  password: string
  confirm: string
  name: string
}) {
  const { data } = await api.post("users/register/", {
    username: payload.username,
    name: payload.name,
    password: payload.password,
    confirm_password: payload.confirm,
  })
  if (data?.tokens?.access && data?.tokens?.refresh) {
    saveTokens(data.tokens.access, data.tokens.refresh)
  }
  return data
}

export function logout() {
  clearTokens()
}

export { isAuthed }

/* =====================
   CV Upload
   ===================== */

export async function uploadCV(file: File, title = "My CV") {
  const name = file?.name || "upload.pdf"
  if (file.type !== "application/pdf" && !name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Please choose a PDF file.")
  }

  // Attempt A: custom action /api/cv/upload/ with {file}
  try {
    const f1 = new FormData()
    f1.append("file", file, name)
    const { data } = await api.post("cv/upload/", f1)
    return data // { cv_id, filename, ... }
  } catch (err: any) {
    const st = err?.response?.status
    if (st !== 404 && st !== 405) throw err
  }

  // Attempt B: standard ModelViewSet create /api/cv/ with {title, file}
  const f2 = new FormData()
  f2.append("title", title)
  f2.append("file", file, name)
  const { data } = await api.post("cv/", f2)
  return data // often { id, title, file, ... }
}

/* =====================
   User Profile
   ===================== */

export async function getUserProfile() {
  const { data } = await api.get("users/profile/")
  return data
}

/* =====================
   AI: Quiz generation & submission
   ===================== */

export async function aiGenerateFromFileSmart(file: File) {
  const tryKeys = ["cv", "file", "pdf", "cv_file", "resume", "document"]
  let last: any
  for (const key of tryKeys) {
    try {
      const fd = new FormData()
      fd.append(key, file, file.name || "upload.pdf")
      const { data } = await api.post("ai/generate/", fd)
      return data // {questions:[...]} or [...]
    } catch (e) {
      last = e
    }
  }
  throw last || new Error("PDF upload for AI generation failed.")
}

export async function aiGenerateFromCVId(cvId: number | string) {
  const { data } = await api.post("ai/generate/", { cv_id: cvId })
  return data // {questions:[...]} or [...]
}

export async function aiSubmitAnswers(answers: Array<{ question: string; answer: string }>) {
  const { data } = await api.post("ai/submit/", { answers })
  return data
}

export async function submitAnswers(answers: any) {
  const { data } = await api.post("ai/submit/", { answers })
  return data
}

/* =====================
   Voice Interview
   ===================== */

export async function startVoiceInterview(cvId: string | number) {
  const { data } = await api.post("ai/interview/start/", { cv_id: cvId })
  return data // { interview_id, questions, language, duration }
}

export async function submitVoiceInterview(formData: FormData) {
  const { data } = await api.post("ai/interview/submit/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
  return data // { transcription, evaluation, status }
}

export async function generatePdfReport(payload: {
  cv_id: number | string
  result_id: number | string
  interview_id?: number | string
}) {
  const response = await api.post("ai/report/pdf/", payload, {
    responseType: "blob",
  })
  return response.data
}
