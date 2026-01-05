import { useState } from 'react';
import { Check, Crown, Sparkles, Zap, ArrowLeft, Shield, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FREE_FEATURES = [
  'Unlimited product analyses',
  'Basic EpiQ Score',
  'Ingredient safety flags',
  '1 routine (up to 5 products)',
  '3 SkinLytixGPT messages/day',
  'Compare 2 products',
];

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Full EpiQ Score breakdown',
  'Complete AI explanations',
  '30 SkinLytixGPT chats/month',
  '5 routines (unlimited products)',
  '3 routine optimizations/month',
  'Compare up to 5 products',
  'Clean PDF exports',
];

const PRO_FEATURES = [
  'Everything in Premium',
  'Unlimited SkinLytixGPT chats',
  'Unlimited routine optimizations',
  'Batch analysis (10 products)',
  'Priority support (24hr)',
  'Early access to new features',
  'Advanced ingredient insights',
];

const FAQS = [
  {
    question: 'Can I really analyze unlimited products for free?',
    answer: 'Yes! We believe everyone deserves to understand their skincare. Free users get unlimited product analyses with basic EpiQ Scores. Premium and Pro unlock deeper insights like full score breakdowns and AI-powered explanations.',
  },
  {
    question: 'What\'s the difference between Premium and Pro?',
    answer: 'Premium is perfect for dedicated skincare enthusiasts who want deeper insights. Pro is designed for power users and professionals who need unlimited access to all features including batch analysis and priority support.',
  },
  {
    question: 'How does the 7-day free trial work?',
    answer: 'Start your trial with no payment required. You get full access to Premium features for 7 days. We\'ll remind you before it ends, and you can cancel anytime with one click.',
  },
  {
    question: 'What is an EpiQ Score?',
    answer: 'The EpiQ Score is our proprietary formula rating that considers ingredient safety, formulation quality, and personalized compatibility with your skin profile. It\'s validated by cosmetic science students from our academic partners.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. No contracts, no commitments. Cancel your subscription anytime from your profile page. You\'ll keep access until the end of your billing period.',
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: 'premium' | 'pro') => {
    setIsLoading(plan);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.info('Please sign in to start your free trial');
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan, billingCycle },
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error('Failed to start checkout. Please try again.');
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Checkout opened in new tab');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const getPricing = (plan: 'premium' | 'pro') => {
    if (plan === 'premium') {
      return billingCycle === 'monthly' 
        ? { price: '$7.99', annual: '$95.88', perMonth: '$7.99' }
        : { price: '$79', annual: '$79', perMonth: '$6.58' };
    }
    return billingCycle === 'monthly'
      ? { price: '$14.99', annual: '$179.88', perMonth: '$14.99' }
      : { price: '$149', annual: '$149', perMonth: '$12.42' };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary py-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-primary-foreground hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-heading font-bold text-xl">SkinLytix</span>
          </button>
          <Button 
            variant="ghost" 
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate('/auth')}
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4 gap-1">
            <Shield className="h-3 w-3" />
            Human + AI Validation
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6">
            Simple, transparent pricing
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free forever. Upgrade when you want deeper insights into your skincare routine.
          </p>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="px-4 pb-8">
        <div className="max-w-6xl mx-auto flex justify-center">
          <div className="inline-flex items-center gap-2 p-1.5 bg-muted rounded-xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                billingCycle === 'monthly' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                billingCycle === 'annual' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <Badge className="bg-success/20 text-success-foreground border-0 text-xs">
                Save 17%
              </Badge>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 pb-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 lg:gap-8">
          {/* Free Tier */}
          <Card className="border-2 border-border relative overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-xl">Free</CardTitle>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Perfect for getting started
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/demo-analysis')}
              >
                Try Demo
              </Button>
              <ul className="space-y-3">
                {FREE_FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success-foreground mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Premium Tier */}
          <Card className="border-2 border-primary relative overflow-hidden shadow-lg scale-105">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
            <Badge className="absolute top-4 right-4 bg-primary">
              Most Popular
            </Badge>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Premium</CardTitle>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{getPricing('premium').perMonth}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              {billingCycle === 'annual' && (
                <p className="text-sm text-success-foreground mt-1">
                  Billed {getPricing('premium').annual}/year
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                For dedicated skincare enthusiasts
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full gap-2"
                onClick={() => handleCheckout('premium')}
                disabled={isLoading === 'premium'}
              >
                {isLoading === 'premium' ? 'Loading...' : 'Start 7-Day Free Trial'}
              </Button>
              <ul className="space-y-3">
                {PREMIUM_FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className="border-2 border-amber-500/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <Badge className="absolute top-4 right-4 bg-amber-500">
              Best Value
            </Badge>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-xl">Pro</CardTitle>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{getPricing('pro').perMonth}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              {billingCycle === 'annual' && (
                <p className="text-sm text-success-foreground mt-1">
                  Billed {getPricing('pro').annual}/year
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                For power users & professionals
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline"
                className="w-full gap-2 border-amber-500/50 hover:bg-amber-500/10"
                onClick={() => handleCheckout('pro')}
                disabled={isLoading === 'pro'}
              >
                {isLoading === 'pro' ? 'Loading...' : 'Start 7-Day Free Trial'}
              </Button>
              <ul className="space-y-3">
                {PRO_FEATURES.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Academic Partnership Banner */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-primary/20">
            <CardContent className="py-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Star className="h-5 w-5 text-primary" />
                <span className="font-heading font-bold text-lg">Human + AI Validation</span>
                <Star className="h-5 w-5 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Every EpiQ Score is calibrated by Cosmetic Science students from our founding academic partner, 
                <span className="font-semibold text-foreground"> Spelman College</span>. 
                Real expertise backing every recommendation.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-heading font-bold text-center mb-10">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-4">
            {FAQS.map((faq, i) => (
              <AccordionItem 
                key={i} 
                value={`faq-${i}`}
                className="border rounded-xl px-6 data-[state=open]:bg-muted/30"
              >
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-4">
            Ready to understand your skincare?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of users who've decoded their products with SkinLytix.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="cta" 
              size="lg"
              onClick={() => navigate('/demo-analysis')}
              className="px-8"
            >
              Try Demo Free
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/auth')}
              className="px-8"
            >
              Create Account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 SkinLytix. All rights reserved.</p>
          <p className="mt-2">
            Cancel anytime • No questions asked • Money-back guarantee
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
