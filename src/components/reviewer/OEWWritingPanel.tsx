import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  PenTool,
  AlertCircle
} from 'lucide-react';

interface OEWWritingPanelProps {
  value: string;
  onChange: (value: string) => void;
  ingredientName: string;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export function OEWWritingPanel({
  value,
  onChange,
  ingredientName
}: OEWWritingPanelProps) {
  const wordCount = countWords(value);

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Step 3: Writing</CardTitle>
          </div>
          <Badge 
            variant="outline"
            className="bg-muted/40 text-muted-foreground border-muted"
          >
            {wordCount} words
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Write a plain-language explanation for consumers
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Voice & Tone Guidelines */}
        <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg space-y-3">
          <p className="font-medium text-sm text-purple-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Voice & Tone Requirements
          </p>
          <div className="grid md:grid-cols-2 gap-2 text-xs text-purple-600/80">
            <div>✓ Use plain language (high school reading level)</div>
            <div>✓ Be honest about limitations</div>
            <div>✓ Lead with safety-critical info</div>
            <div>✓ Explain what, how, and who it's for</div>
            <div>✗ No jargon without explanation</div>
            <div>✗ No marketing hype or overclaiming</div>
          </div>
        </div>

        {/* Suggested Structure */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="font-medium text-sm">Suggested Structure (5 sections)</p>
          <ol className="text-xs space-y-2 text-muted-foreground ml-4 list-decimal">
            <li><span className="font-medium text-foreground">What it is</span> (2 sentences) - Definition and origin</li>
            <li><span className="font-medium text-foreground">What it does</span> (2-3 sentences) - Mechanism of action in plain terms</li>
            <li><span className="font-medium text-foreground">Who it's for</span> (2 sentences) - Best skin types and concerns</li>
            <li><span className="font-medium text-foreground">Cautions</span> (1-2 sentences) - Irritation risks, concentration, special populations</li>
            <li><span className="font-medium text-foreground">Bottom line</span> (1 sentence) - Clear, actionable summary</li>
          </ol>
        </div>

        {/* Example */}
        <div className="p-4 bg-slate-500/5 rounded-lg space-y-2">
          <p className="font-medium text-sm text-slate-600">Example: Salicylic Acid</p>
          <p className="text-xs text-slate-600/80 leading-relaxed italic">
            Salicylic acid is a beta hydroxy acid (BHA) derived from willow bark and wintergreen. 
            It works by dissolving the sebum and dead skin cells that build up in pores, making it 
            especially effective for acne-prone and oily skin types. This ingredient is best suited for 
            oily, combination, and acne-prone skin. It helps clear clogged pores and can reduce breakouts 
            when used regularly at 0.5–2% concentration. However, salicylic acid can be irritating—especially 
            for sensitive skin and first-time users. Start with low concentration and use only 2–3 times 
            per week. Pregnant individuals should use cautiously due to systemic absorption risk with high 
            concentrations (&gt;20%). Bottom line: Salicylic acid is a proven, safe exfoliant for oily and 
            acne-prone skin when used gradually at low-to-moderate concentrations.
          </p>
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <Label htmlFor="explanation" className="text-sm font-medium">
            Public Explanation for Consumers *
          </Label>
          <Textarea
            id="explanation"
            placeholder={`Write your plain-language explanation here. Remember:\n\n1. Use simple words (avoid technical jargon)\n2. Explain what the ingredient does and why\n3. Say who it's best for (skin type/concern)\n4. Mention any irritation risks or cautions\n5. Finish with a clear recommendation`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={10}
            className="font-sans text-sm leading-relaxed resize-none"
          />
        </div>

        {/* Word Count Indicator */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>{wordCount === 0 ? 'Start typing your explanation...' : `Word count: ${wordCount}`}</span>
          <span>Keep it clear, accurate, and easy to understand.</span>
        </div>

        {/* Tips */}
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-2">
          <p className="font-medium text-sm text-amber-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Writing Tips
          </p>
          <ul className="text-xs text-amber-600/80 space-y-1 list-disc ml-5">
            <li>Assume reader knows nothing about skincare chemistry</li>
            <li>Define any technical terms before using them</li>
            <li>Use short sentences and paragraphs</li>
            <li>Include concentration ranges from your peer-reviewed sources</li>
            <li>Mention how long results take to appear</li>
            <li>Note any contraindications (e.g., pregnancy, other ingredients)</li>
            <li>Be transparent about what the evidence shows vs. marketing claims</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
