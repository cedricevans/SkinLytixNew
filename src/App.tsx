import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDevModeLogin } from "@/hooks/useDevModeLogin";
import invokeFunction from "@/lib/functions-client";
import { toast } from "@/components/ui/sonner";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Analysis from "./pages/Analysis";
import AnalysisFast from "./pages/AnalysisFast";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Walkthrough from "./pages/Walkthrough";
import Profile from "./pages/Profile";
import Routine from "./pages/Routine";
import RoutineOptimization from "./pages/RoutineOptimization";
import Quiz from "./pages/Quiz";
import InstagramLanding from "./pages/InstagramLanding";
import Analytics from "./pages/Analytics";
import Feedback from "./pages/Feedback";
import About from "./pages/About";
import Faq from "./pages/Faq";
import HowItWorks from "./pages/HowItWorks";
import Connect from "./pages/Connect";
import Compare from "./pages/Compare";
import Favorites from "./pages/Favorites";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import KioskMode from "./pages/KioskMode";
import StudentReviewer from "./pages/dashboard/StudentReviewer";
import AdminDashboard from "./pages/AdminDashboard";
import FeedbackWidget from "@/components/FeedbackWidget";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TrialCountdown } from "@/components/subscription/TrialCountdown";
import ScrollToTop from "@/components/ScrollToTop";
import AppProtectedRoute from "@/components/AppProtectedRoute";
import { getKioskRedirectPath, isKioskEmail } from "@/lib/kiosk";

const queryClient = new QueryClient();

const FeedbackWidgetGate = () => {
  const location = useLocation();
  if (location.pathname === "/") return null;
  return <FeedbackWidget />;
};

const SessionRefreshGate = () => {
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          await supabase.auth.refreshSession();
        }
      } catch (error) {
        console.error("Session refresh failed:", error);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return null;
};

const DevModeLoginGate = () => {
  const { isAttempting, error } = useDevModeLogin();
  
  if (error) {
    console.error("Dev mode login error:", error);
    // Show diagnostics when dev mode fails
    if (typeof window !== 'undefined' && window.location.search.includes('devMode=true')) {
      // Redirect to diagnostics page
      const diagnosticsUrl = window.location.pathname + '?diagnostic=true&' + 
        window.location.search.substring(1);
      // console.log("Would show diagnostics at:", diagnosticsUrl);
    }
  }
  
  return null;
};

const KioskChromeGate = () => {
  const location = useLocation();

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const isKioskRoute = location.pathname === "/kiosk" || search.get("kiosk") === "1";

    document.documentElement.classList.toggle("kiosk-mode", isKioskRoute);
    document.body.classList.toggle("kiosk-mode", isKioskRoute);

    if (!isKioskRoute) return;

    const hideBrowserChrome = () => {
      window.setTimeout(() => window.scrollTo(0, 1), 50);
    };

    hideBrowserChrome();
    window.addEventListener("orientationchange", hideBrowserChrome);
    window.addEventListener("resize", hideBrowserChrome);

    return () => {
      window.removeEventListener("orientationchange", hideBrowserChrome);
      window.removeEventListener("resize", hideBrowserChrome);
    };
  }, [location.pathname, location.search]);

  return null;
};

const KioskAccountLockGate = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const enforceKioskLock = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted || !isKioskEmail(user?.email)) return;

      const kioskRedirectPath = getKioskRedirectPath(location.pathname, location.search);
      if (!kioskRedirectPath) return;

      navigate(kioskRedirectPath, { replace: true });
    };

    enforceKioskLock();

    return () => {
      isMounted = false;
    };
  }, [location.pathname, location.search, navigate]);

  return null;
};

const SubscriptionSyncGate = () => {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const subscriptionStatus = params.get("subscription");
    if (!subscriptionStatus) return;

    const syncSubscription = async () => {
      try {
        await invokeFunction("check-subscription");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("subscription:refresh"));
        }
        if (subscriptionStatus === "success") {
          toast.success("Subscription updated", {
            description: "Your plan is now active.",
          });
        } else if (subscriptionStatus === "canceled") {
          toast("Checkout canceled", {
            description: "No changes were made to your plan.",
          });
        }
      } catch (error) {
        console.error("Error syncing subscription after checkout:", error);
        toast.error("Unable to sync subscription", {
          description: "Please use the Sync button in Settings.",
        });
      } finally {
        params.delete("subscription");
        const nextSearch = params.toString();
        const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${location.hash}`;
        window.history.replaceState({}, "", nextUrl);
      }
    };

    syncSubscription();
  }, [location.hash, location.pathname, location.search]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <TrialCountdown />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <SessionRefreshGate />
        <DevModeLoginGate />
        <KioskChromeGate />
        <KioskAccountLockGate />
        <SubscriptionSyncGate />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<AppProtectedRoute><Home /></AppProtectedRoute>} />
          <Route path="/ig" element={<InstagramLanding />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/upload" element={<AppProtectedRoute><Upload /></AppProtectedRoute>} />
          <Route path="/analysis/:id" element={<AppProtectedRoute><Analysis /></AppProtectedRoute>} />
          <Route path="/analysis-fast" element={<AppProtectedRoute><AnalysisFast /></AppProtectedRoute>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<AppProtectedRoute><Onboarding /></AppProtectedRoute>} />
          <Route path="/walkthrough" element={<AppProtectedRoute><Walkthrough /></AppProtectedRoute>} />
          <Route path="/profile" element={<AppProtectedRoute><Profile /></AppProtectedRoute>} />
          <Route path="/routine" element={<AppProtectedRoute><Routine /></AppProtectedRoute>} />
          <Route path="/routine/optimization/:id" element={<AppProtectedRoute><RoutineOptimization /></AppProtectedRoute>} />
          <Route path="/analytics" element={<AppProtectedRoute><ProtectedRoute><Analytics /></ProtectedRoute></AppProtectedRoute>} />
          <Route path="/feedback" element={<AppProtectedRoute><Feedback /></AppProtectedRoute>} />
          <Route path="/compare" element={<AppProtectedRoute><Compare /></AppProtectedRoute>} />
          <Route path="/favorites" element={<AppProtectedRoute><Favorites /></AppProtectedRoute>} />
          <Route path="/settings" element={<AppProtectedRoute><Settings /></AppProtectedRoute>} />
          <Route path="/kiosk" element={<AppProtectedRoute><KioskMode /></AppProtectedRoute>} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/contact" element={<Connect />} />
          <Route path="/dashboard/reviewer" element={<AppProtectedRoute><ProtectedRoute><StudentReviewer /></ProtectedRoute></AppProtectedRoute>} />
          <Route path="/admin" element={<AppProtectedRoute><AdminDashboard /></AppProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <FeedbackWidgetGate />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
