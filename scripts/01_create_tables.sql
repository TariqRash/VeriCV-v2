-- VeriCV Database Schema for Supabase PostgreSQL
-- This script creates all necessary tables for the VeriCV application

-- Enable UUID extension (useful for future features)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Django's built-in auth_user table will be created by migrations
-- But we need to ensure our custom tables are created

-- CV Table
CREATE TABLE IF NOT EXISTS cv_cv (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Extracted information from CV
    extracted_name VARCHAR(255),
    extracted_phone VARCHAR(50),
    extracted_city VARCHAR(100),
    detected_language VARCHAR(10) DEFAULT 'en',
    
    -- Job titles extracted from CV (stored as JSON array)
    extracted_job_titles JSONB DEFAULT '[]'::jsonb,
    
    -- User confirmation status
    info_confirmed BOOLEAN DEFAULT FALSE,
    
    -- IP-based city detection
    ip_detected_city VARCHAR(100)
);

-- Quiz Table
CREATE TABLE IF NOT EXISTS quiz_quiz (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Question Table
CREATE TABLE IF NOT EXISTS quiz_question (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES quiz_quiz(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer VARCHAR(1) NOT NULL
);

-- Result Table
CREATE TABLE IF NOT EXISTS quiz_result (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT NOT NULL REFERENCES quiz_quiz(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    score DOUBLE PRECISION NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Store detailed answers
    answers JSONB DEFAULT '{}'::jsonb,
    
    -- AI recommendations
    ai_recommendations TEXT
);

-- Voice Interview Table
CREATE TABLE IF NOT EXISTS quiz_voiceinterview (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    result_id BIGINT UNIQUE REFERENCES quiz_result(id) ON DELETE CASCADE,
    
    -- Audio file storage
    audio_file VARCHAR(100),
    
    -- Transcription
    transcription TEXT,
    
    -- Interview metadata
    duration INTEGER DEFAULT 180,
    language VARCHAR(10) DEFAULT 'en',
    
    -- AI evaluation
    soft_skills_score DOUBLE PRECISION,
    communication_score DOUBLE PRECISION,
    confidence_score DOUBLE PRECISION,
    
    -- AI feedback
    ai_feedback TEXT,
    improvement_suggestions TEXT,
    
    -- Interview questions asked
    questions_asked JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Feedback Table
CREATE TABLE IF NOT EXISTS feedback_feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    cv_id BIGINT NOT NULL REFERENCES cv_cv(id) ON DELETE CASCADE,
    result_id BIGINT UNIQUE NOT NULL REFERENCES quiz_result(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    rating INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT feedback_rating_check CHECK (rating >= 1 AND rating <= 5)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cv_user ON cv_cv(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_uploaded_at ON cv_cv(uploaded_at);

CREATE INDEX IF NOT EXISTS idx_quiz_user ON quiz_quiz(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_created_at ON quiz_quiz(created_at);

CREATE INDEX IF NOT EXISTS idx_question_quiz ON quiz_question(quiz_id);

CREATE INDEX IF NOT EXISTS idx_result_user ON quiz_result(user_id);
CREATE INDEX IF NOT EXISTS idx_result_quiz ON quiz_result(quiz_id);
CREATE INDEX IF NOT EXISTS idx_result_completed_at ON quiz_result(completed_at);

CREATE INDEX IF NOT EXISTS idx_voiceinterview_user ON quiz_voiceinterview(user_id);
CREATE INDEX IF NOT EXISTS idx_voiceinterview_result ON quiz_voiceinterview(result_id);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_cv ON feedback_feedback(cv_id);
CREATE INDEX IF NOT EXISTS idx_feedback_result ON feedback_feedback(result_id);

-- Add comments to tables for documentation
COMMENT ON TABLE cv_cv IS 'Stores uploaded CV files and extracted information';
COMMENT ON TABLE quiz_quiz IS 'Stores quiz instances generated from CVs';
COMMENT ON TABLE quiz_question IS 'Stores individual quiz questions';
COMMENT ON TABLE quiz_result IS 'Stores quiz completion results and scores';
COMMENT ON TABLE quiz_voiceinterview IS 'Stores voice interview recordings and AI evaluations';
COMMENT ON TABLE feedback_feedback IS 'Stores AI-generated feedback for quiz results';
