-- Migration: Create diagnosis_sessions table
-- This table stores server-side state for the follow-up questionnaire,
-- replacing the cookie-based session approach.

CREATE TABLE IF NOT EXISTS diagnosis_sessions (
    session_id      TEXT PRIMARY KEY,
    chat_id         TEXT NOT NULL,
    initial_symptoms TEXT NOT NULL,
    base_probs      TEXT NOT NULL,         -- JSON array of initial NLP probabilities
    current_probs   TEXT NOT NULL,         -- JSON array of Bayesian-updated probabilities
    disease         TEXT NOT NULL,         -- Current predicted disease
    confidence      DOUBLE PRECISION NOT NULL,
    uncertainty     DOUBLE PRECISION NOT NULL,
    top_diseases    TEXT NOT NULL,         -- JSON array of {disease, probability}
    model_used      TEXT NOT NULL,
    lang            TEXT NOT NULL DEFAULT 'en',
    asked_questions TEXT NOT NULL DEFAULT '[]',  -- JSON array of question IDs
    evidence_texts  TEXT NOT NULL DEFAULT '[]',  -- JSON array of structured evidence strings
    created_at      DOUBLE PRECISION NOT NULL,
    updated_at      DOUBLE PRECISION NOT NULL
);

-- Index for fast lookup by chat_id (one active session per chat)
CREATE INDEX IF NOT EXISTS idx_diagnosis_sessions_chat_id ON diagnosis_sessions(chat_id);
