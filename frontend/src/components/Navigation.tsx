// src/components/Navigation.tsx
import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
// import { Menu, X, FileText, Brain, User, Home, Info, LogOut, LogIn, UserPlus } from "lucide-react";
import { Menu, X, FileText, User, Home, Info, LogOut, LogIn, UserPlus } from "lucide-react";
import { isAuthenticated, hasUploadedCV, logout, subscribeAuth } from "@/utils/auth";
import { LanguageSwitcher } from "./LanguageSwitcher";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [authed, setAuthed] = useState(isAuthenticated());
  const [cvReady, setCvReady] = useState(hasUploadedCV());
  const nav = useNavigate();
  const location = useLocation();

  // Keep state fresh on any auth change
  useEffect(() => {
    const refresh = () => {
      setAuthed(isAuthenticated());
      setCvReady(hasUploadedCV());
    };
    refresh(); // on mount
    const unsub = subscribeAuth(refresh);
    // still keep these as fallbacks (optional)
    const onStorage = () => refresh();
    const onDomEvent = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth-changed", onDomEvent);
    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", onDomEvent);
    };
  }, []);

  // Also re-check on route change
  useEffect(() => {
    setAuthed(isAuthenticated());
    setCvReady(hasUploadedCV());
  }, [location.pathname]);

  const navItems = [
    { name: "Home", href: "/", icon: Home, show: true },
    { name: "Upload CV", href: "/upload", icon: FileText, show: authed },
    // { name: "Quiz", href: "/quiz", icon: Brain, show: authed && cvReady },
    // { name: "Dashboard", href: "/dashboard", icon: User, show: authed },
    { name: "About", href: "/about", icon: Info, show: true },
  ].filter(i => i.show);

  const handleLogout = () => {
    logout();
    nav("/");
  };

  return (
    <nav className="bg-background/60 backdrop-blur border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <NavLink
          to="/"
          className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                `flex items-center gap-2 text-sm ${isActive ? "text-primary" : "text-foreground/80 hover:text-foreground"}`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </NavLink>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          {!authed ? (
            <>
              <Button variant="outline" onClick={() => nav("/login")}><LogIn className="w-4 h-4 mr-2" />Sign In</Button>
              <Button className="gradient-primary button-glow" onClick={() => nav("/register")}><UserPlus className="w-4 h-4 mr-2" />Sign Up</Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" />Logout</Button>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden border-t">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-3">
            {navItems.map((item) => (
              <NavLink key={item.href} to={item.href} onClick={() => setIsOpen(false)} className="flex items-center gap-2">
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            ))}
            <div className="flex items-center gap-2 pt-2 pb-2">
              <span className="text-sm">Language:</span>
              <LanguageSwitcher />
            </div>
            <div className="flex gap-2 pt-2">
              {!authed ? (
                <>
                  <Button variant="outline" className="flex-1" onClick={() => { setIsOpen(false); nav("/login"); }}>
                    <LogIn className="w-4 h-4 mr-2" />Sign In
                  </Button>
                  <Button className="flex-1 gradient-primary button-glow" onClick={() => { setIsOpen(false); nav("/register"); }}>
                    <UserPlus className="w-4 h-4 mr-2" />Sign Up
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="flex-1" onClick={() => { setIsOpen(false); handleLogout(); }}>
                  <LogOut className="w-4 h-4 mr-2" />Logout
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
