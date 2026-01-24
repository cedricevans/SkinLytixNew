import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Instagram } from 'lucide-react';
import { trackEvent } from '@/hooks/useTracking';
import Navigation from '@/components/Navigation';

const InstagramLanding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    trackEvent({
      eventName: 'ig_landing_viewed',
      eventCategory: 'navigation',
      eventProperties: {
        referrer: searchParams.get('ref') || 'instagram',
        utm_source: searchParams.get('utm_source') || null,
      }
    });

    // Auto-redirect to sign-up after 2 seconds
    const timer = setTimeout(() => {
      navigate('/auth');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      {/* Header */}
      <header className="w-full bg-primary shadow-soft">
        <div className="max-w-6xl mx-auto px-[10px] lg:px-6 xl:px-6 py-3 md:py-4 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-heading font-bold text-primary-foreground">
            SkinLytix
          </h2>
          <Navigation />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        {/* Instagram Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-500/30">
            <Instagram className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-subheading font-medium text-foreground">
              Welcome from Instagram!
            </span>
          </div>
        </div>

        {/* Hero Text */}
        <div className="text-center space-y-6 mb-12">
          <h1 className="text-4xl md:text-5xl font-heading font-bold leading-tight">
            Your Skincare Decoder
            <br />
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              In Your Pocket 🧴
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
            Instantly decode any face, body, or hair product. No more confusing ingredient lists.
          </p>
        </div>

        {/* Loading to Demo */}
        <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          
          <div>
            <h2 className="text-2xl font-heading font-semibold mb-2">
              Preparing your account...
            </h2>
            <p className="text-muted-foreground">
              Get ready to see what's really in your products
            </p>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 space-y-3">
            <Button 
              variant="cta"
              size="lg"
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/pricing')}
              className="w-full"
            >
              View Pricing
            </Button>
          </div>
        </div>

        {/* Social Proof */}
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Join hundreds analyzing their entire personal care routine
        </p>
      </main>
    </div>
  );
};

export default InstagramLanding;
