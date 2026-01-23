import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import BrandName from "@/components/landing/BrandName";
import { SkinTypeQuiz } from "@/components/SkinTypeQuiz";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Quiz = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [result, setResult] = useState<"oily" | "dry" | "combination" | "sensitive" | "normal" | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setIsAuthed(Boolean(data.session));
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const quickScore = useMemo(() => {
    if (!result) return null;
    const scoreMap: Record<string, number> = {
      oily: 68,
      dry: 74,
      combination: 76,
      sensitive: 62,
      normal: 82,
    };
    return scoreMap[result] ?? 70;
  }, [result]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="sticky top-0 z-50 w-full bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-heading text-xl font-bold text-primary-foreground hover:opacity-80 transition-opacity"
            aria-label="SkinLytix home"
          >
            <BrandName />
          </button>
          <Navigation />
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 py-16">
        <Card className="p-6 md:p-8 text-center">
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3">
            Skin Type Quiz
          </h1>
          <p className="text-muted-foreground mb-6">
            Answer 5 quick questions to personalize your EpiQ scores.
          </p>
          {!open && !result && (
            <Button onClick={() => setOpen(true)}>
              Start Quiz
            </Button>
          )}
          {result && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quick Score</p>
                <p className="text-4xl font-bold mt-2">{quickScore}/100</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Based on your answers, your skin type is {result}.
                </p>
              </div>
              {!isAuthed ? (
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button onClick={() => navigate('/auth?tab=signin')}>
                    Log In
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/auth?tab=signup')}>
                    Sign Up
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button onClick={() => navigate('/upload')}>
                    Continue to Upload
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/profile')}>
                    View Profile
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <SkinTypeQuiz
        open={open}
        onClose={() => setOpen(false)}
        onComplete={(skinType) => {
          toast({
            title: "Quiz complete",
            description: isAuthed
              ? "Your quick score is ready."
              : "Log in or sign up to save your results.",
          });
          setResult(skinType);
          setOpen(false);
        }}
        quizType="face"
      />
    </main>
  );
};

export default Quiz;
