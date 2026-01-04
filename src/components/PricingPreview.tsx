import { useState } from 'react';
import { Check, Sparkles, Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const PricingPreview = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const tiers = [
    {
      name: 'Free',
      icon: null,
      price: '$0',
      period: '/forever',
      description: 'Get started',
      features: ['Unlimited analyses', 'Basic EpiQ Score', '1 routine'],
      cta: 'Start Free',
      variant: 'outline' as const,
      href: '/demo-analysis',
    },
    {
      name: 'Premium',
      icon: Sparkles,
      price: billingCycle === 'annual' ? '$6.58' : '$7.99',
      period: '/month',
      description: 'Most popular',
      features: ['Full score breakdown', '30 AI chats/mo', '5 routines'],
      cta: 'Try Free',
      variant: 'default' as const,
      href: '/auth',
      popular: true,
    },
    {
      name: 'Pro',
      icon: Crown,
      price: billingCycle === 'annual' ? '$12.42' : '$14.99',
      period: '/month',
      description: 'Power users',
      features: ['Unlimited everything', 'Batch analysis', 'Priority support'],
      cta: 'Try Free',
      variant: 'outline' as const,
      href: '/auth',
    },
  ];

  return (
    <section id="pricing-preview" className="py-16 md:py-20 px-4 md:px-6 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4">
            Simple Pricing
          </Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Start free, upgrade anytime
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Analyze unlimited products for free. Unlock deeper insights when you're ready.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                billingCycle === 'monthly' 
                  ? "bg-background shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                billingCycle === 'annual' 
                  ? "bg-background shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annual
              <Badge className="bg-success/20 text-success-foreground border-0 text-xs">
                -17%
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <Card 
                key={tier.name}
                className={cn(
                  "relative transition-all hover:shadow-lg",
                  tier.popular && "border-primary shadow-md md:scale-105 md:z-10"
                )}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <CardContent className="pt-8 pb-6">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {Icon && <Icon className={cn(
                        "h-5 w-5",
                        tier.popular ? "text-primary" : "text-amber-500"
                      )} />}
                      <h3 className="text-lg font-heading font-bold">{tier.name}</h3>
                    </div>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold">{tier.price}</span>
                      <span className="text-sm text-muted-foreground">{tier.period}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className={cn(
                          "h-4 w-4 flex-shrink-0",
                          tier.popular ? "text-primary" : "text-success-foreground"
                        )} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    variant={tier.variant}
                    className="w-full"
                    onClick={() => navigate(tier.href)}
                  >
                    {tier.cta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* View All Details Link */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/pricing')}
          >
            View full comparison & FAQ
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PricingPreview;
