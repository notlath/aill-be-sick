-- Migration: Add initial_eig field to diagnosis_sessions
-- This field stores the Expected Information Gain (EIG) of the first
-- follow-up question, used for early stopping comparison.

-- Add the column if it doesn't exist
ALTER TABLE diagnosis_sessions
ADD COLUMN IF NOT EXISTS initial_eig DOUBLE PRECISION;
