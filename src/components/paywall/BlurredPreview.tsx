import { useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaywallModal } from './PaywallModal';
import { cn } from '@/lib/utils';

interface BlurredPreviewProps {
  children: React.ReactNode;
  feature: string;
  featureDescription?: string;
  isLocked: boolean;
  blurAmount?: 'sm' | 'md' | 'lg';
  showOverlay?: boolean;
  className?: string;
}

export function BlurredPreview({
  children,
  feature,
  featureDescription,
  isLocked,
  blurAmount = 'md',
  showOverlay = true,
  className,
}: BlurredPreviewProps) {
  const [showPaywall, setShowPaywall] = useState(false);

  if (!isLocked) {
    return <>{children}</>;
  }

  const blurClass = {
    sm: 'blur-[2px]',
    md: 'blur-[4px]',
    lg: 'blur-[8px]',
  }[blurAmount];

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Blurred content */}
        <div className={cn("pointer-events-none select-none", blurClass)}>
          {children}
        </div>

        {/* Overlay */}
        {showOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-lg">
            <div className="flex flex-col items-center gap-3 p-4 text-center">
              <div className="p-3 rounded-full bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Unlock {feature}</h4>
                {featureDescription && (
                  <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                    {featureDescription}
                  </p>
                )}
              </div>
              <Button 
                size="sm" 
                className="gap-2"
                onClick={() => setShowPaywall(true)}
              >
                <Sparkles className="h-4 w-4" />
                Upgrade to Unlock
              </Button>
            </div>
          </div>
        )}

        {/* Click handler for entire area */}
        {!showOverlay && (
          <button
            onClick={() => setShowPaywall(true)}
            className="absolute inset-0 cursor-pointer"
            aria-label={`Unlock ${feature}`}
          />
        )}
      </div>

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature={feature}
        featureDescription={featureDescription}
      />
    </>
  );
}
