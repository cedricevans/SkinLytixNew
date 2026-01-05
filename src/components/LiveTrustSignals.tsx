import { useState, useEffect } from 'react';
import { Award, Users, FlaskConical, Shield, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LiveMetrics {
  totalAnalyses: number;
  totalUsers: number;
  expertReviews: number;
  activeInstitutions: number;
}

const LiveTrustSignals = () => {
  const [metrics, setMetrics] = useState<LiveMetrics>({
    totalAnalyses: 0,
    totalUsers: 0,
    expertReviews: 0,
    activeInstitutions: 1,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch total analyses count
        const { count: analysesCount } = await supabase
          .from('user_analyses')
          .select('*', { count: 'exact', head: true });

        // Fetch total users count
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch expert reviews count
        const { count: reviewsCount } = await supabase
          .from('expert_reviews')
          .select('*', { count: 'exact', head: true });

        // Fetch active institutions count
        const { count: institutionsCount } = await supabase
          .from('academic_institutions')
          .select('*', { count: 'exact', head: true })
          .eq('active', true);

        setMetrics({
          totalAnalyses: analysesCount || 145,
          totalUsers: usersCount || 71,
          expertReviews: reviewsCount || 0,
          activeInstitutions: institutionsCount || 1,
        });
        setIsLoaded(true);
      } catch (error) {
        console.error('Error fetching metrics:', error);
        // Fallback to static values
        setMetrics({
          totalAnalyses: 145,
          totalUsers: 71,
          expertReviews: 0,
          activeInstitutions: 1,
        });
        setIsLoaded(true);
      }
    };

    fetchMetrics();
  }, []);

  // Animated counter component
  const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
      if (!isLoaded) return;
      
      const duration = 1500;
      const steps = 30;
      const increment = value / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }, [value, isLoaded]);

    return (
      <span className="tabular-nums">
        {displayValue.toLocaleString()}{suffix}
      </span>
    );
  };

  const signals = [
    {
      icon: FlaskConical,
      stat: <AnimatedCounter value={metrics.totalAnalyses} suffix="+" />,
      label: 'Products Analyzed',
      description: 'Decoded ingredient lists helping users',
    },
    {
      icon: Users,
      stat: <AnimatedCounter value={metrics.totalUsers} suffix="+" />,
      label: 'Active Users',
      description: 'Growing community of beauty enthusiasts',
    },
    {
      icon: Award,
      stat: metrics.expertReviews > 0 
        ? <AnimatedCounter value={metrics.expertReviews} /> 
        : 'Coming Soon',
      label: 'Expert Reviews',
      description: 'Validated by Cosmetic Science students',
    },
    {
      icon: Shield,
      stat: `${metrics.activeInstitutions} Partner`,
      label: 'Academic Validation',
      description: 'Human + AI verified accuracy',
    },
  ];

  return (
    <section className="py-12 md:py-16 px-4 md:px-6 bg-primary/5 border-y border-border/50">
      <div className="max-w-6xl mx-auto">
        {/* Header with live indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-success/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-foreground opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success-foreground"></span>
            </span>
            <span className="text-xs font-medium text-success-foreground">Live Metrics</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {signals.map((signal, index) => {
            const Icon = signal.icon;
            return (
              <div
                key={signal.label}
                className="text-center animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex justify-center mb-3 md:mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-accent/20 flex items-center justify-center">
                    <Icon className="w-6 h-6 md:w-8 md:h-8 text-accent" />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-heading font-bold mb-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {signal.stat}
                </h3>
                <h4 className="text-sm md:text-base font-subheading font-semibold mb-1">
                  {signal.label}
                </h4>
                <p className="text-xs md:text-sm font-body text-muted-foreground">
                  {signal.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LiveTrustSignals;
