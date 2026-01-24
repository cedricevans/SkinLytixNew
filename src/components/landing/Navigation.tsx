import { useState } from 'react';
import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import BrandName from './BrandName';

const Navigation = () => {
  const [open, setOpen] = useState(false);


  const scrollToSection = (href: string) => {
    const sectionId = href.replace('#', '');
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-azure">
      <div className="container mx-auto px-[5px] lg:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => scrollToSection('#home')}
            className="font-heading text-xl md:text-2xl font-bold text-primary-foreground hover:text-primary-foreground/80 transition-colors"
          >
            <BrandName />
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center">
            <button
              onClick={() => scrollToSection('#waitlist')}
              className="bg-accent hover:bg-accent-hover text-accent-foreground px-6 py-2 rounded-full font-semibold text-sm transition-all duration-300 hover:shadow-hover hover:-translate-y-0.5"
            >
              Join Waitlist
            </button>
          </nav>

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-azure border-azure">
              <SheetHeader>
                <SheetTitle className="font-heading text-xl text-primary-foreground">Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-8">
                <button
                  onClick={() => scrollToSection('#waitlist')}
                  className="bg-accent hover:bg-accent-hover text-accent-foreground px-6 py-3 rounded-full font-semibold text-base transition-all duration-300 hover:shadow-hover w-full mt-4"
                >
                  Join Waitlist
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
