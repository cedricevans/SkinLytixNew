/**
 * Development Mode Auto-Login Hook
 * 
 * USAGE (in development only):
 * Add to URL: http://localhost:8080/?devMode=true&devEmail=cedric.evans@gmail.com&devPassword=pa55word
 * 
 * This hook bypasses login for development and testing purposes.
 * It should NEVER be used in production.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface DevModeConfig {
  enabled: boolean;
  email: string;
  password: string;
}

export const useDevModeLogin = () => {
  const [searchParams] = useSearchParams();
  const [isAttempting, setIsAttempting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const attemptDevLogin = async () => {
      // Only work in development
      if (import.meta.env.PROD) {
        console.warn("⚠️ Dev mode login is disabled in production");
        return;
      }

      const devMode = searchParams.get("devMode")?.toLowerCase() === "true";
      
      if (!devMode) return;

      const email = searchParams.get("devEmail") || "cedric.evans@gmail.com";
      const password = searchParams.get("devPassword") || "pa55word";

      setIsAttempting(true);
      setError(null);

      try {
        console.log("🔐 Dev Mode: Attempting auto-login...");
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error("❌ Dev login failed:", signInError.message);
          setError(signInError.message);
          return;
        }

        console.log("✅ Dev Mode: Auto-login successful!");
        
        // Remove URL parameters for cleaner experience
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } catch (err: any) {
        console.error("Dev login error:", err);
        setError(err.message);
      } finally {
        setIsAttempting(false);
      }
    };

    attemptDevLogin();
  }, [searchParams]);

  return { isAttempting, error };
};

/**
 * Helper to generate dev login URL
 * 
 * Usage:
 *   const url = getDevLoginUrl("cedric.evans@gmail.com", "pa55word");
 *   window.location.href = url;
 */
export const getDevLoginUrl = (
  email = "cedric.evans@gmail.com",
  password = "pa55word"
): string => {
  const params = new URLSearchParams();
  params.set("devMode", "true");
  params.set("devEmail", email);
  params.set("devPassword", password);
  
  return `${window.location.origin}/?${params.toString()}`;
};
