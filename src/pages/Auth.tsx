import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import BrandName from "@/components/landing/BrandName";

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
        navigate('/profile');
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col">
      <header className="w-full bg-primary text-primary-foreground shadow-soft">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
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

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Welcome to SkinLytix</h1>
          <p className="text-muted-foreground">
            Your personal skincare intelligence engine
          </p>
        </div>

        <Alert className="mb-6 border-border bg-muted/40">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-sm">
            <strong>Beta Notice:</strong> If you forget your password, use the password reset flow to regain access.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
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
              <Button
                type="button"
                variant="link"
                className="px-0 text-sm"
                onClick={() => navigate("/reset-password")}
              >
                Forgot password?
              </Button>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
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
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        </Card>
      </main>
    </div>
  );
};

export default Auth;
