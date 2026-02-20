/**
 * Dev Mode Login Diagnostics
 * 
 * This tool helps diagnose why dev mode login is failing
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const DevModeDiagnostics = () => {
  const [searchParams] = useSearchParams();
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        const email = searchParams.get("devEmail") || "cedric.evans@gmail.com";
        const password = searchParams.get("devPassword") || "pa55word";

        setDiagnostics({
          status: "Running diagnostics...",
          email,
          password: "***",
          timestamp: new Date().toISOString(),
        });

        // Test 1: Check Supabase connection
        const { data: sessionData } = await supabase.auth.getSession();
        
        // Test 2: Try to sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        setDiagnostics({
          status: error ? "FAILED" : "SUCCESS",
          email,
          password: "***",
          error: error ? {
            message: error.message,
            status: error.status,
            code: error.code,
          } : null,
          session: data?.session ? {
            user_id: data.user?.id,
            email: data.user?.email,
            expires_at: data.session?.expires_at,
          } : null,
          timestamp: new Date().toISOString(),
          suggestions: error ? [
            "❌ Login failed - this could mean:",
            "1. User account 'cedric.evans@gmail.com' does NOT exist in Supabase",
            "2. Password is incorrect",
            "3. User account is disabled",
            "4. User email is not confirmed",
            "",
            "✅ Solutions:",
            "- Create the user in Supabase dashboard",
            "- Or use an existing user email: ?devEmail=your@email.com",
            "- Or manually set password through Supabase admin panel",
          ] : [
            "✅ Login successful!",
            "Dev mode is working correctly",
          ],
        });
      } catch (err: any) {
        setDiagnostics({
          status: "ERROR",
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    runDiagnostics();
  }, [searchParams]);

  if (!diagnostics) return null;

  return (
    <div style={{
      padding: "20px",
      fontFamily: "monospace",
      backgroundColor: "#1e1e1e",
      color: "#00ff00",
      minHeight: "100vh",
      maxWidth: "800px",
      margin: "0 auto",
    }}>
      <h2>🔍 Dev Mode Diagnostics</h2>
      <pre>{JSON.stringify(diagnostics, null, 2)}</pre>
      {diagnostics.suggestions && (
        <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#2d2d2d" }}>
          <h3>📋 Diagnostic Report:</h3>
          {diagnostics.suggestions.map((line: string, idx: number) => (
            <div key={idx} style={{ whiteSpace: "pre-wrap" }}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DevModeDiagnostics;
