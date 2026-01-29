import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Instagram, AtSign, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const Footer = () => {
  const navigate = useNavigate();
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setShowFeedback(!!user);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setShowFeedback(!!session?.user);
    });

    loadUser();

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <footer className="py-12 px-[10px] lg:px-6 bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto">
        <div className="space-y-8 mb-8">
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            <div className="lg:col-span-2">
              <h3 className="text-2xl font-heading font-bold mb-3">SkinLytix</h3>
              <p className="font-body text-primary-foreground/80 text-sm leading-relaxed max-w-md">
                Evidence-based skincare intelligence for people tired of wasting money on products that don't work.
                Built on real consumer research. Powered by free, open APIs.
              </p>
            </div>
            <div className="hidden lg:block">
              <FooterLinks />
            </div>
            <div className="hidden lg:block">
              <FooterConnect />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 lg:hidden">
            <FooterLinks />
            <FooterConnect />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-primary-foreground/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm font-body text-primary-foreground/60">
            © 2025 SkinLytix. Built with open science & real user data.
          </p>
          {showFeedback && (
            <Button variant="cta" size="sm" onClick={() => navigate("/beta-feedback")}>
              Feedback
            </Button>
          )}
        </div>
      </div>
    </footer>
  );
};

const FooterLinks = () => (
  <div>
    <h4 className="text-sm font-heading font-semibold mb-3 text-primary-foreground uppercase tracking-[0.2em]">
      Quick Links
    </h4>
    <ul className="space-y-2 text-sm font-body">
      {[
        { label: "About Us", href: "/about" },
        { label: "How It Works", href: "/how-it-works" },
        { label: "FAQ", href: "/faq" },
        { label: "Connect", href: "/connect" },
      ].map((link) => (
        <li key={link.label}>
          <a href={link.href} className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

const FooterConnect = () => (
  <div>
    <h4 className="text-sm font-heading font-semibold mb-3 text-primary-foreground uppercase tracking-[0.2em]">
      Connect With Us
    </h4>
    <div className="flex gap-3 mb-3">
      <a
        href="https://www.instagram.com/skinlytix?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-all hover:scale-110"
        aria-label="Follow us on Instagram"
      >
        <Instagram className="w-5 h-5 text-primary-foreground" />
      </a>
      <a
        href="https://www.threads.com/@skinlytix"
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-all hover:scale-110"
        aria-label="Follow us on Threads"
      >
        <AtSign className="w-5 h-5 text-primary-foreground" />
      </a>
      <a
        href="https://www.facebook.com/profile.php?id=61574847090738"
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-all hover:scale-110"
        aria-label="Follow us on Facebook"
      >
        <Facebook className="w-5 h-5 text-primary-foreground" />
      </a>
    </div>
    <p className="text-xs text-primary-foreground/60">
      Join our community on Instagram, Threads, and Facebook for skincare tips and insights.
    </p>
  </div>
);

export default Footer;
