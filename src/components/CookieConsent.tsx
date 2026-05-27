"use client";

import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";
import Link from "next/link";

export function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user already consented
    const consent = localStorage.getItem("cookie_consent_accepted");
    if (!consent) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500); // Small delay for premium entry animation
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent_accepted", "true");
    setIsOpen(false);
  };

  const handleDecline = () => {
    // Strictly necessary cookies (Supabase Auth) will still function, but we record preference
    localStorage.setItem("cookie_consent_accepted", "false");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto md:max-w-md z-[9999] animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="glass-card border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl bg-slate-950/80 text-foreground flex flex-col gap-4">
        <div className="flex gap-4 items-start">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary shrink-0">
            <Cookie className="h-6 w-6 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-white text-base">We Value Your Privacy / Cookie Policy</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We use strictly necessary cookies to authenticate your account and persist session states. By using our website, you agree to our usage of cookies. Read our{" "}
              <Link href="/privacy" className="text-primary hover:underline font-medium">
                Privacy Policy
              </Link>{" "}
              for more details.
            </p>
          </div>
          <button 
            onClick={handleDecline} 
            className="text-muted-foreground hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-3 justify-end items-center text-xs mt-1">
          <button
            onClick={handleDecline}
            className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-muted-foreground font-medium"
          >
            Decline / Từ chối
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            Accept / Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
}
