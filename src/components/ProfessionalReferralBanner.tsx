import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Stethoscope, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProfessionalReferralBannerProps {
  reason: string;
  suggestedProfessionalType: string;
}

export const ProfessionalReferralBanner = ({
  reason,
  suggestedProfessionalType,
}: ProfessionalReferralBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-warning/10 to-destructive/10 border-b-2 border-warning animate-pulse-glow">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Stethoscope className="w-6 h-6 text-warning flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                ⚕️ Professional Consultation Recommended
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {reason}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Learn More
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-warning" />
                    Professional Consultation Recommended
                  </DialogTitle>
                  <DialogDescription>
                    Based on our analysis, we recommend consulting with a healthcare professional.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Reason</h4>
                    <p className="text-sm text-muted-foreground">{reason}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Suggested Professional</h4>
                    <p className="text-sm text-muted-foreground">{suggestedProfessionalType}</p>
                  </div>
                  <div className="pt-4 border-t">
                    <Button variant="secondary" disabled className="w-full gap-2">
                      <Stethoscope className="w-4 h-4" />
                      Book Consultation (Coming Soon)
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDismissed(true)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
