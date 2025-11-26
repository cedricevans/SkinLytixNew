-- Create beta_feedback table
CREATE TABLE public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,

  motivation text,
  report_clarity text,
  most_helpful_feature text,
  frustrations text,
  perceived_accuracy text,
  missing_feature text,

  pmf_disappointment text,
  pmf_substitute text,
  pmf_core_value text,
  pmf_willing_to_pay text,
  pmf_price_expectation text,

  wants_session boolean,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own beta feedback"
ON public.beta_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own beta feedback"
ON public.beta_feedback FOR SELECT
USING (auth.uid() = user_id);