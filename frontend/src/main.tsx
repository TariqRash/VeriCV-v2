import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

// Set initial direction based on language
const savedLanguage = localStorage.getItem('i18nextLng') || 'en';
document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLanguage;

createRoot(document.getElementById("root")!).render(<App />);
