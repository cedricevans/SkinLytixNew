import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/hooks/useTracking';

const ExitIntentPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only show on homepage
    if (location.pathname !== '/') return;

    // Check if already shown this session
    const shown = sessionStorage.getItem('exitIntentShown');
    if (shown) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Detect mouse leaving toward top of viewport (browser controls)
      if (e.clientY <= 0 && !hasTriggered) {
        setHasTriggered(true);
        setIsOpen(true);
        sessionStorage.setItem('exitIntentShown', 'true');
        
        trackEvent({
          eventName: 'exit_intent_triggered',
          eventCategory: 'engagement',
          eventProperties: { page: 'homepage' }
        });
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [location.pathname, hasTriggered]);

  const handleGetStarted = () => {
    trackEvent({
      eventName: 'exit_intent_accepted',
      eventCategory: 'conversion',
      eventProperties: { action: 'get_started' }
    });
    setIsOpen(false);
    navigate('/auth');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading text-center">
            Wait! See what we found in this moisturizer 🧴
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-center text-muted-foreground">
            Before you go, create your free account to unlock personalized analysis.
          </p>
          <div className="flex flex-col gap-3">
            <Button 
              variant="cta" 
              size="lg" 
              onClick={handleGetStarted}
              className="w-full"
            >
              Get Started Free
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground"
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentPopup;
