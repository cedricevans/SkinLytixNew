import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 px-6 bg-primary text-primary-foreground">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-heading font-bold mb-3">SkinLytix</h3>
            <p className="font-body text-primary-foreground/80 text-sm leading-relaxed max-w-md">
              Evidence-based skincare intelligence for people tired of wasting money on products that don't work. 
              Built on real consumer research. Powered by free, open APIs.
            </p>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-primary-foreground/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm font-body text-primary-foreground/60">
            © 2025 SkinLytix. Built with open science & real user data.
          </p>
          <div className="flex items-center gap-2 text-sm font-body text-primary-foreground/60">
            <span>Made with</span>
            <Heart className="w-4 h-4 text-cta fill-cta" />
            <span>for beauty enthusiasts everywhere</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
