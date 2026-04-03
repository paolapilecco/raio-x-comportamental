
-- Create enum for question types
CREATE TYPE public.question_type AS ENUM ('likert', 'behavior_choice', 'frequency', 'intensity');

-- Add type column with default 'likert' for existing questions
ALTER TABLE public.questions ADD COLUMN type public.question_type NOT NULL DEFAULT 'likert';
