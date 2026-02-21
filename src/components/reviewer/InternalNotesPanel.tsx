import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle } from 'lucide-react';

interface InternalNotesPanelProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function InternalNotesPanel({
  value,
  onChange,
  maxLength = 500
}: InternalNotesPanelProps) {
  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isAtLimit = characterCount >= maxLength;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          Internal Notes for Moderators
        </CardTitle>
        <CardDescription>
          Optional: Add context, concerns, or guidance for the review team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          maxLength={maxLength}
          placeholder="e.g., 'Found conflicting studies on concentration', 'May need expert dermatologist review', 'New ingredient - limited data available'"
          className="w-full min-h-[100px] p-3 border rounded-md resize-none"
        />
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-medium ${
              isAtLimit
                ? 'text-red-600'
                : isNearLimit
                ? 'text-amber-600'
                : 'text-gray-500'
            }`}
          >
            {characterCount}/{maxLength} characters
          </span>
          {isAtLimit && <span className="text-xs text-red-600">Character limit reached</span>}
        </div>
        <p className="text-xs text-gray-600">
          Use this to flag concerns, conflicting evidence, requests for expert review, or important context for moderators.
        </p>
      </CardContent>
    </Card>
  );
}
