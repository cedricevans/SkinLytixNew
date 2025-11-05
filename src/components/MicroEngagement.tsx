import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles } from 'lucide-react';
import { trackEvent } from '@/hooks/useTracking';

const MicroEngagement = () => {
  const [productName, setProductName] = useState('');
  const navigate = useNavigate();

  const handleQuizClick = () => {
    trackEvent({
      eventName: 'quiz_teaser_clicked',
      eventCategory: 'engagement',
      eventProperties: { location: 'micro_engagement' }
    });
    navigate('/onboarding');
  };

  const handleProductLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (productName.trim()) {
      trackEvent({
        eventName: 'product_lookup_attempted',
        eventCategory: 'engagement',
        eventProperties: { product: productName }
      });
      navigate('/upload');
    }
  };

  return (
    <section className="py-12 md:py-16 bg-accent/5">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Quiz Teaser */}
          <div 
            onClick={handleQuizClick}
            className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-all cursor-pointer group hover:shadow-glow"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-lg mb-2">
                  Is your moisturizer safe?
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Take our 30-second skin type quiz
                </p>
                <Button variant="ghost" size="sm" className="p-0 h-auto text-primary hover:text-primary/80">
                  Start Quiz →
                </Button>
              </div>
            </div>
          </div>

          {/* Product Lookup */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-accent/10 rounded-xl">
                <Search className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-lg mb-2">
                  Quick Product Lookup
                </h3>
                <form onSubmit={handleProductLookup} className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Enter product name..."
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="bg-background"
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    variant="secondary"
                    disabled={!productName.trim()}
                    className="w-full"
                  >
                    Analyze Now
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MicroEngagement;
