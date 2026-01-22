import { useEffect, useState } from "react";
import { Bell, ClipboardCheck, LogOut, Menu, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useReviewerAccess } from "@/hooks/useReviewerAccess";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type NavigationVariant = "marketing" | "app";

const marketingNavigationItems = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "/pricing", isRoute: true },
];

const appNavigationItems = [
  { label: "Home", href: "/home", isRoute: true },
  { label: "Scan", href: "/upload", isRoute: true },
  { label: "Compare", href: "/compare", isRoute: true },
  { label: "Favorites", href: "/favorites", isRoute: true },
  { label: "Routine", href: "/routine", isRoute: true },
  { label: "Profile", href: "/profile", isRoute: true },
];

const Navigation = ({
  variant = "marketing",
  onAskGpt,
}: {
  variant?: NavigationVariant;
  onAskGpt?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { hasAccess: hasReviewerAccess } = useReviewerAccess();
  const { toast } = useToast();
  const isAppNav = variant === "app";
  const navigationItems = isAppNav ? appNavigationItems : marketingNavigationItems;
  const desktopNavigationItems = isAppNav
    ? appNavigationItems.filter((item) => item.label !== "Profile")
    : marketingNavigationItems;
  const [userInitials, setUserInitials] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("sl_user_initials") || "";
  });
  const [isInitialsLoaded, setIsInitialsLoaded] = useState(false);

  const getInitials = (value: string) => {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  useEffect(() => {
    if (!isAppNav) return;
    let isMounted = true;

    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (!user) {
        setUserInitials("SL");
        if (typeof window !== "undefined") {
          localStorage.removeItem("sl_user_initials");
        }
        setIsInitialsLoaded(true);
        return;
      }
      const name = `${user.user_metadata?.display_name || user.user_metadata?.full_name || user.email || ""}`;
      const initials = getInitials(name);
      const nextInitials = initials || "SL";
      setUserInitials(nextInitials);
      if (typeof window !== "undefined") {
        localStorage.setItem("sl_user_initials", nextInitials);
      }
      setIsInitialsLoaded(true);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [isAppNav]);

  const scrollToSection = (href: string, isRoute?: boolean) => {
    if (isRoute) {
      navigate(href);
      setOpen(false);
      return;
    }
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        setOpen(false);
        return;
      }
      navigate(`/${href}`);
      setOpen(false);
    }
  };

  const handleSignIn = () => {
    navigate("/auth");
    setOpen(false);
  };

  const handleGetStarted = () => {
    navigate("/auth");
    setOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    navigate("/", { replace: true });
  };

  const handleAlerts = () => {
    toast({
      title: "Alerts coming soon",
      description: "Notification settings will be available in a future update.",
    });
  };

  const renderAvatarTrigger = (className?: string) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label="Open profile menu"
        >
          <span className="text-xs font-semibold">
            {userInitials || (isInitialsLoaded ? "SL" : "...")}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleAlerts}>
          <Bell className="mr-2 h-4 w-4" />
          Alerts
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const handleAskGpt = async () => {
    if (!isAppNav) return;
    if (onAskGpt) {
      onAskGpt();
      setOpen(false);
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        setOpen(false);
        return;
      }

      const { data } = await supabase
        .from("user_analyses")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.id) {
        navigate(`/analysis/${data.id}?chat=1`);
      } else {
        navigate("/upload");
      }
    } catch (error) {
      console.error("Failed to open SkinLytixGPT:", error);
      toast({
        title: "Unable to open chat",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isAppNav && (
        renderAvatarTrigger("md:hidden h-9 w-9 rounded-full bg-white/15 text-primary-foreground hover:bg-white/25")
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-primary-foreground hover:bg-primary-foreground/10"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="md:hidden w-[280px] sm:w-[320px]">
          <nav className="flex flex-col gap-4 mt-8">
            {navigationItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.href, (item as any).isRoute)}
                className="text-left px-4 py-3 text-lg font-subheading hover:bg-accent/10 rounded-lg transition-colors"
              >
                {item.label}
              </button>
            ))}
            {hasReviewerAccess && (
              <button
                onClick={() => {
                  navigate('/dashboard/reviewer');
                  setOpen(false);
                }}
                className="text-left px-4 py-3 text-lg font-subheading hover:bg-accent/10 rounded-lg transition-colors flex items-center gap-2 text-primary"
              >
                <ClipboardCheck className="w-5 h-5" />
                Reviewer
              </button>
            )}
            {isAppNav && onAskGpt && (
              <div className="mt-2 px-4">
                <Button
                  variant="cta"
                  className="w-full"
                  onClick={handleAskGpt}
                >
                  Ask SkinLytixGPT
                </Button>
              </div>
            )}
            {isAppNav ? (
              <div className="mt-4 space-y-3 px-4" />
            ) : (
              <div className="mt-4 space-y-3 px-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSignIn}
                >
                  Sign In
                </Button>
                <Button
                  variant="cta"
                  className="w-full"
                  onClick={handleGetStarted}
                >
                  Get Started Free
                </Button>
              </div>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      <nav className="hidden md:flex items-center gap-6">
        {desktopNavigationItems.map((item) => (
          <button
            key={item.label}
            onClick={() => scrollToSection(item.href, (item as any).isRoute)}
            className="text-sm font-subheading text-primary-foreground hover:text-primary-foreground/80 transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-primary-foreground after:transition-all after:duration-300"
          >
            {item.label}
          </button>
        ))}
        {hasReviewerAccess && (
          <button
            onClick={() => navigate('/dashboard/reviewer')}
            className="text-sm font-subheading text-primary-foreground hover:text-primary-foreground/80 transition-colors flex items-center gap-1.5"
          >
            <ClipboardCheck className="w-4 h-4" />
            Reviewer
          </button>
        )}
        {isAppNav && onAskGpt && (
          <Button
            variant="cta"
            size="sm"
            onClick={handleAskGpt}
          >
            Ask SkinLytixGPT
          </Button>
        )}
        {isAppNav ? (
          renderAvatarTrigger("h-9 w-9 rounded-full bg-white/20 text-white border border-white/30 hover:bg-white/30 transition-all")
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="bg-white/20 text-white border border-white/50 hover:bg-white/30 transition-all"
              onClick={handleSignIn}
            >
              Sign In
            </Button>
            <Button variant="cta" size="sm" onClick={handleGetStarted}>
              Get Started Free
            </Button>
          </>
        )}
      </nav>
    </div>
  );
};

export default Navigation;
