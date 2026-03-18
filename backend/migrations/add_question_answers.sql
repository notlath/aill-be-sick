-- Migration: Add question_answers field to diagnosis_sessions
-- This field tracks the actual answers (yes/no) for each asked question,
-- enabling prerequisite-based question filtering (e.g., don't ask about
-- cough character until cough existence is confirmed).

-- Add the column if it doesn't exist
ALTER TABLE diagnosis_sessions
ADD COLUMN IF NOT EXISTS question_answers TEXT NOT NULL DEFAULT '{}';

-- The field stores a JSON object mapping question_id to answer:
-- {"dengue_q10": "no", "influenza_q2": "yes", ...}
