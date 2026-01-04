import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const navigationItems = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "/pricing", isRoute: true },
];

const Navigation = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
      }
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

  // Mobile Navigation
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
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
          </nav>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop Navigation
  return (
    <nav className="flex items-center gap-6">
      {navigationItems.map((item) => (
        <button
          key={item.label}
          onClick={() => scrollToSection(item.href, (item as any).isRoute)}
          className="text-sm font-subheading text-primary-foreground hover:text-primary-foreground/80 transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-primary-foreground after:transition-all after:duration-300"
        >
          {item.label}
        </button>
      ))}
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
    </nav>
  );
};

export default Navigation;
