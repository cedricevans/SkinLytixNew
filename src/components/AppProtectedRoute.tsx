import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { getKioskRedirectPath, isKioskEmail } from "@/lib/kiosk";

const AppProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsAuthed(!!user);
      setUserEmail(user?.email || null);
      setIsChecking(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session?.user);
      setUserEmail(session?.user?.email || null);
    });

    checkSession();

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/auth" replace />;
  }

  if (isKioskEmail(userEmail)) {
    const kioskRedirectPath = getKioskRedirectPath(location.pathname, location.search);
    if (kioskRedirectPath) {
      return <Navigate to={kioskRedirectPath} replace />;
    }
  }

  return <>{children}</>;
};

export default AppProtectedRoute;
