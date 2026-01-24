import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const waitlistSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50, "First name must be less than 50 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  skinType: z.enum(["Oily", "Dry", "Combination", "Normal", "Sensitive"], {
    required_error: "Please select your skin type",
  }),
  skinCondition: z.enum(["Acne", "Aging", "Hyperpigmentation", "Rosacea", "Eczema", "None"], {
    required_error: "Please select your skin condition",
  }),
  moneySpent: z.enum(["$0-$50/month", "$50-$100/month", "$100-$200/month", "$200+/month"], {
    required_error: "Please select your spending range",
  }),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WaitlistDialog = ({ open, onOpenChange }: WaitlistDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
  });

  const onSubmit = async (data: WaitlistFormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("waitlist").insert({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        skin_type: data.skinType,
        skin_condition: data.skinCondition,
        money_spent: data.moneySpent,
      });

      if (error) {
        if (error.code === "23505") {
        toast({
          title: "Already on the waitlist",
          description: "This email is already registered. We will let you know when we go live!",
          variant: "default",
        });
        } else {
          throw error;
        }
      } else {
      toast({
        title: "Thank you for joining our waitlist!",
        description: "We will let you know when we go live.",
      });
        reset();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Error joining waitlist:", error);
      toast({
        title: "Something went wrong",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">Join Our Community</DialogTitle>
          <DialogDescription className="font-body">
            Be the first to know when SkinLytix launches. Help us build the future of skincare intelligence.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                {...register("firstName")}
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                {...register("lastName")}
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              {...register("email")}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="skinType">Skin Type</Label>
            <Select
              onValueChange={(value) => setValue("skinType", value as any)}
              value={watch("skinType")}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your skin type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Oily">Oily</SelectItem>
                <SelectItem value="Dry">Dry</SelectItem>
                <SelectItem value="Combination">Combination</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Sensitive">Sensitive</SelectItem>
              </SelectContent>
            </Select>
            {errors.skinType && (
              <p className="text-sm text-destructive">{errors.skinType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="skinCondition">Primary Skin Condition</Label>
            <Select
              onValueChange={(value) => setValue("skinCondition", value as any)}
              value={watch("skinCondition")}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your skin condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Acne">Acne</SelectItem>
                <SelectItem value="Aging">Aging</SelectItem>
                <SelectItem value="Hyperpigmentation">Hyperpigmentation</SelectItem>
                <SelectItem value="Rosacea">Rosacea</SelectItem>
                <SelectItem value="Eczema">Eczema</SelectItem>
                <SelectItem value="None">None</SelectItem>
              </SelectContent>
            </Select>
            {errors.skinCondition && (
              <p className="text-sm text-destructive">{errors.skinCondition.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="moneySpent">Monthly Skincare Spending</Label>
            <Select
              onValueChange={(value) => setValue("moneySpent", value as any)}
              value={watch("moneySpent")}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your spending range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="$0-$50/month">$0-$50/month</SelectItem>
                <SelectItem value="$50-$100/month">$50-$100/month</SelectItem>
                <SelectItem value="$100-$200/month">$100-$200/month</SelectItem>
                <SelectItem value="$200+/month">$200+/month</SelectItem>
              </SelectContent>
            </Select>
            {errors.moneySpent && (
              <p className="text-sm text-destructive">{errors.moneySpent.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            variant="cta"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join the Waitlist"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WaitlistDialog;
