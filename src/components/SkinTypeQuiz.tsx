import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Droplets, Wind, Flame, Shield, Sparkles } from "lucide-react";

interface SkinTypeQuizProps {
  open: boolean;
  onClose: () => void;
  onComplete: (skinType: "oily" | "dry" | "combination" | "sensitive" | "normal") => void;
  quizType: "face" | "body" | "scalp";
}

interface Question {
  id: string;
  question: string;
  options: Array<{
    label: string;
    scores: { oily?: number; dry?: number; combination?: number; sensitive?: number; normal?: number };
  }>;
}

const faceQuestions: Question[] = [
  {
    id: "q1",
    question: "How does your skin feel 2-3 hours after washing?",
    options: [
      { label: "Tight and uncomfortable", scores: { dry: 2 } },
      { label: "Comfortable and balanced", scores: { normal: 2 } },
      { label: "Shiny on T-zone only", scores: { combination: 2 } },
      { label: "Shiny all over", scores: { oily: 2 } },
      { label: "Stinging or irritated", scores: { sensitive: 2 } },
    ],
  },
  {
    id: "q2",
    question: "How often do you get breakouts?",
    options: [
      { label: "Rarely or never", scores: { normal: 1, dry: 1 } },
      { label: "Occasionally on T-zone", scores: { combination: 2 } },
      { label: "Frequently all over", scores: { oily: 2 } },
      { label: "Only when using new products", scores: { sensitive: 2 } },
      { label: "Occasional with dry patches", scores: { combination: 1 } },
    ],
  },
  {
    id: "q3",
    question: "How does your skin look by midday?",
    options: [
      { label: "Shiny and oily", scores: { oily: 2 } },
      { label: "Flaky or tight", scores: { dry: 2 } },
      { label: "T-zone shiny, cheeks normal", scores: { combination: 2 } },
      { label: "Same as morning", scores: { normal: 2 } },
      { label: "Red or reactive", scores: { sensitive: 2 } },
    ],
  },
  {
    id: "q4",
    question: "How does your skin react to new products?",
    options: [
      { label: "No issues", scores: { normal: 2 } },
      { label: "Gets red or stings", scores: { sensitive: 3 } },
      { label: "Breaks out", scores: { oily: 1 } },
      { label: "Gets dry or flaky", scores: { dry: 2 } },
      { label: "Depends on the product", scores: { combination: 1 } },
    ],
  },
  {
    id: "q5",
    question: "What's your main skin concern?",
    options: [
      { label: "Oiliness and shine", scores: { oily: 2 } },
      { label: "Dryness and flakiness", scores: { dry: 2 } },
      { label: "Redness and irritation", scores: { sensitive: 2 } },
      { label: "Breakouts and acne", scores: { oily: 1, combination: 1 } },
      { label: "None really", scores: { normal: 2 } },
    ],
  },
];

const getSkinTypeIcon = (type: string) => {
  switch (type) {
    case "oily": return Droplets;
    case "dry": return Wind;
    case "combination": return Flame;
    case "sensitive": return Shield;
    case "normal": return Sparkles;
    default: return Sparkles;
  }
};

const getSkinTypeDescription = (type: string) => {
  switch (type) {
    case "oily": return "Your skin produces excess sebum, especially in the T-zone. Focus on oil-control and mattifying products.";
    case "dry": return "Your skin lacks moisture and may feel tight. Look for hydrating and nourishing ingredients.";
    case "combination": return "Your T-zone is oily while cheeks are normal or dry. Balance is key with targeted treatments.";
    case "sensitive": return "Your skin reacts easily to products. Choose gentle, fragrance-free formulations.";
    case "normal": return "Your skin is well-balanced! Maintain it with gentle, consistent skincare.";
    default: return "";
  }
};

export const SkinTypeQuiz = ({ open, onClose, onComplete, quizType }: SkinTypeQuizProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<Record<string, number>>({
    oily: 0,
    dry: 0,
    combination: 0,
    sensitive: 0,
    normal: 0,
  });
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<"oily" | "dry" | "combination" | "sensitive" | "normal">("normal");

  const questions = faceQuestions; // For now, only face quiz
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (optionIndex: number) => {
    const question = questions[currentQuestion];
    const selectedOption = question.options[optionIndex];
    
    // Update answers
    setAnswers({ ...answers, [question.id]: optionIndex });
    
    // Update scores
    const newScores = { ...scores };
    Object.entries(selectedOption.scores).forEach(([type, value]) => {
      newScores[type] = (newScores[type] || 0) + (value || 0);
    });
    setScores(newScores);

    // Move to next question or show result
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResult(newScores);
    }
  };

  const calculateResult = (finalScores: Record<string, number>) => {
    // If sensitive score is high, prioritize it
    if (finalScores.sensitive >= 5) {
      setResult("sensitive");
    } else {
      // Find highest score
      const sortedTypes = Object.entries(finalScores)
        .filter(([type]) => type !== "sensitive")
        .sort(([, a], [, b]) => b - a);
      setResult(sortedTypes[0][0] as typeof result);
    }
    setShowResult(true);
  };

  const handleRetake = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setScores({ oily: 0, dry: 0, combination: 0, sensitive: 0, normal: 0 });
    setShowResult(false);
  };

  const handleConfirm = () => {
    onComplete(result);
    onClose();
    // Reset for next time
    setTimeout(() => {
      setCurrentQuestion(0);
      setAnswers({});
      setScores({ oily: 0, dry: 0, combination: 0, sensitive: 0, normal: 0 });
      setShowResult(false);
    }, 300);
  };

  const ResultIcon = getSkinTypeIcon(result);

  if (showResult) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <ResultIcon className="w-10 h-10 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              Your Skin Type: {result.charAt(0).toUpperCase() + result.slice(1)}
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {getSkinTypeDescription(result)}
            </DialogDescription>
          </DialogHeader>

          <Card className="p-4 bg-accent/5 border-primary/20">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">What this means for you:</p>
                <p className="text-sm text-muted-foreground">
                  Your EpiQ scores will now be personalized based on {result} skin characteristics. 
                  Products will be evaluated for their suitability to your specific needs.
                </p>
              </div>
            </div>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleRetake} className="flex-1">
              Retake Quiz
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Confirm & Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Skin Type Quiz</DialogTitle>
          <DialogDescription>
            Question {currentQuestion + 1} of {questions.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Progress value={progress} className="h-2" />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{currentQ.question}</h3>
            
            <div className="space-y-2">
              {currentQ.options.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4 hover:border-primary hover:bg-primary/5"
                  onClick={() => handleAnswer(index)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {currentQuestion > 0 && (
            <Button
              variant="ghost"
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
              className="w-full"
            >
              Previous Question
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
