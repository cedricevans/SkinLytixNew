import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import BrandName from "@/components/landing/BrandName";
import { Sparkles, ShieldCheck, FlaskConical, TrendingUp } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpDisplayName, setSignUpDisplayName] = useState("");
  
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          data: {
            display_name: signUpDisplayName,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Account Created!",
        description: "Welcome to SkinLytix. Let's set up your profile.",
      });
      
      navigate('/onboarding');
    } catch (error: any) {
      toast({
        title: "Sign Up Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      if (error) throw error;

      // Check if profile is complete and if user has seen walkthrough
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_profile_complete, has_seen_walkthrough')
        .eq('id', (await supabase.auth.getUser()).data.user?.id!)
        .single();

      toast({
        title: "Welcome Back!",
        description: "Successfully signed in.",
      });
      
      // Route based on profile status
      if (!profile?.is_profile_complete) {
        navigate('/onboarding');
      } else if (!profile?.has_seen_walkthrough) {
        navigate('/walkthrough');
      } else {
        navigate('/home');
      }
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/40 to-accent/10 flex flex-col">
      <header className="w-full bg-primary text-primary-foreground shadow-soft">
        <div className="max-w-6xl mx-auto px-[10px] lg:px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-heading text-lg font-bold text-primary-foreground hover:opacity-80 transition-opacity"
            aria-label="SkinLytix home"
          >
            <BrandName />
          </button>
          <Navigation />
        </div>
      </header>

      <main className="flex-1 px-4 py-8 lg:py-16">
        <div className="relative max-w-6xl mx-auto">
          <div className="pointer-events-none absolute -top-16 right-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <section className="order-1 lg:order-1 space-y-6">
              <div className="lg:hidden space-y-3">
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Science-first skincare
                </p>
                <h1 className="text-2xl font-heading font-semibold text-foreground leading-snug">
                  Evidence-based skincare intelligence.
                </h1>
                <p className="text-sm text-muted-foreground">
                  Ingredient insights, sensitivity signals, and smarter alternatives in minutes.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-primary/80">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-primary/90">
                    Free to start
                  </span>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-primary/90">
                    No spam
                  </span>
                </div>
                <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground/80">
                  <p className="text-sm font-semibold text-foreground">Here&apos;s what you get</p>
                  <ul className="space-y-1 text-sm">
                    <li>Ingredient match scores and routine-ready dupes.</li>
                    <li>Sensitivity signals before you buy.</li>
                    <li>Built on real consumer research.</li>
                  </ul>
                </div>
              </div>

              <div className="hidden lg:block space-y-8">
                <div className="space-y-4">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Science-first skincare
                  </p>
                  <h1 className="text-4xl md:text-5xl font-heading font-semibold text-foreground leading-tight">
                    Evidence-based skincare intelligence, built for real people.
                  </h1>
                  <p className="text-base md:text-lg text-muted-foreground max-w-xl">
                    SkinLytix helps you stop wasting money on products that do not work. We analyze ingredient lists,
                    flag potential sensitivities, and surface smarter alternatives, all powered by transparent,
                    open data.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      title: "Ingredient match score",
                      description: "Compare formulas side by side with clear, simple scoring.",
                      icon: TrendingUp,
                    },
                    {
                      title: "Sensitivity signals",
                      description: "See what might irritate your skin before you buy.",
                      icon: ShieldCheck,
                    },
                    {
                      title: "Routine-ready dupes",
                      description: "Find alternatives that fit your routine and budget.",
                      icon: Sparkles,
                    },
                    {
                      title: "Open research layer",
                      description: "Built on real consumer research and free APIs.",
                      icon: FlaskConical,
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-primary/10 bg-card/90 p-4 shadow-sm backdrop-blur"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <item.icon className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-primary/80">
                  <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1">No spam</span>
                  <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
                    Free to start
                  </span>
                  <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
                    Data-driven insights
                  </span>
                </div>
              </div>
            </section>

            <Card className="order-2 lg:order-2 w-full max-w-md lg:max-w-none mx-auto p-6 md:p-8 shadow-[var(--shadow-medium)] border-primary/20 bg-[var(--gradient-card)] backdrop-blur">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold mb-2">Start your SkinLytix account</h2>
                <p className="text-sm text-muted-foreground">
                  Sign in or create a free account to save analyses and build your routine.
                </p>
              </div>

              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-full bg-primary/10 p-1 text-primary/70">
                  <TabsTrigger
                    value="signin"
                    className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-6">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 text-sm"
                        onClick={() => navigate("/reset-password")}
                      >
                        Forgot password?
                      </Button>
                      <span className="text-xs text-muted-foreground">Secure sign-in</span>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Don&apos;t have an account?{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/auth?tab=signup")}
                        className="font-semibold text-foreground hover:text-emerald-600 transition-colors"
                      >
                        Sign up here
                      </button>
                    </p>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-name">Display Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        value={signUpDisplayName}
                        onChange={(e) => setSignUpDisplayName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">Use 6+ characters for a stronger password.</p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/auth?tab=signin")}
                        className="font-semibold text-foreground hover:text-emerald-600 transition-colors"
                      >
                        Sign in here
                      </button>
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
