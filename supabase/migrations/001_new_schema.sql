-- ============================================================================
-- VERICV SUPABASE-NATIVE SCHEMA
-- Complete replacement for Django backend
-- ============================================================================

-- ============================================================================
-- 1. USER PROFILES (extends Supabase Auth)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(150) UNIQUE,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  city VARCHAR(100),
  preferred_language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.user_profiles IS 'User profile information extending Supabase Auth';

-- ============================================================================
-- 2. CVS (Curriculum Vitae / Resumes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cvs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path: user_id/cv_id/filename.pdf
  file_size BIGINT, -- File size in bytes
  file_type VARCHAR(50), -- MIME type: application/pdf, etc.

  -- Extracted Information (AI-powered)
  extracted_name VARCHAR(255),
  extracted_phone VARCHAR(50),
  extracted_city VARCHAR(100),
  extracted_job_titles JSONB DEFAULT '[]'::jsonb, -- Array of job titles
  detected_language VARCHAR(10) DEFAULT 'en', -- 'en' or 'ar'
  ip_detected_city VARCHAR(100),

  -- Status
  info_confirmed BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed

  -- Timestamps
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  CONSTRAINT cvs_user_id_idx UNIQUE (user_id, id)
);

CREATE INDEX idx_cvs_user_id ON public.cvs(user_id);
CREATE INDEX idx_cvs_uploaded_at ON public.cvs(uploaded_at DESC);
CREATE INDEX idx_cvs_detected_language ON public.cvs(detected_language);

COMMENT ON TABLE public.cvs IS 'CV/Resume uploads with AI-extracted information';

-- ============================================================================
-- 3. QUIZZES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quizzes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id BIGINT REFERENCES public.cvs(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  language VARCHAR(10) DEFAULT 'en',
  total_questions INTEGER DEFAULT 15,
  duration_minutes INTEGER DEFAULT 10,
  status VARCHAR(50) DEFAULT 'active', -- active, completed, expired
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT quizzes_user_id_idx UNIQUE (user_id, id)
);

CREATE INDEX idx_quizzes_user_id ON public.quizzes(user_id);
CREATE INDEX idx_quizzes_cv_id ON public.quizzes(cv_id);
CREATE INDEX idx_quizzes_created_at ON public.quizzes(created_at DESC);

COMMENT ON TABLE public.quizzes IS 'Quiz sessions generated from CVs';

-- ============================================================================
-- 4. QUESTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.questions (
  id BIGSERIAL PRIMARY KEY,
  quiz_id BIGINT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of 4 options: ["Option A", "Option B", "Option C", "Option D"]
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
  skill_category VARCHAR(100), -- technical, behavioral, soft_skills
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT questions_quiz_number_unique UNIQUE (quiz_id, question_number)
);

CREATE INDEX idx_questions_quiz_id ON public.questions(quiz_id);

COMMENT ON TABLE public.questions IS 'Quiz questions with multiple choice options';

-- ============================================================================
-- 5. QUIZ RESULTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quiz_results (
  id BIGSERIAL PRIMARY KEY,
  quiz_id BIGINT NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Score Information
  score NUMERIC(5,2) NOT NULL, -- Percentage: 0.00 to 100.00
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 15,

  -- Answer Details
  answers JSONB NOT NULL, -- Array of {question_id, selected_answer, is_correct, correct_answer}

  -- AI Feedback
  ai_feedback TEXT,
  ai_recommendations TEXT,
  improvement_areas JSONB DEFAULT '[]'::jsonb, -- Array of skill areas to improve

  -- Performance Metrics
  time_taken_seconds INTEGER,
  difficulty_breakdown JSONB, -- {easy: {correct: 3, total: 5}, medium: {...}, hard: {...}}

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT quiz_results_user_quiz_unique UNIQUE (user_id, quiz_id)
);

CREATE INDEX idx_quiz_results_user_id ON public.quiz_results(user_id);
CREATE INDEX idx_quiz_results_quiz_id ON public.quiz_results(quiz_id);
CREATE INDEX idx_quiz_results_score ON public.quiz_results(score DESC);
CREATE INDEX idx_quiz_results_completed_at ON public.quiz_results(completed_at DESC);

COMMENT ON TABLE public.quiz_results IS 'Quiz attempt results with AI-generated feedback';

-- ============================================================================
-- 6. VOICE INTERVIEWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.voice_interviews (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_result_id BIGINT REFERENCES public.quiz_results(id) ON DELETE SET NULL,
  cv_id BIGINT REFERENCES public.cvs(id) ON DELETE SET NULL,

  -- Audio Recording
  audio_path TEXT, -- Supabase Storage path: user_id/interview_id/audio.webm
  audio_duration_seconds INTEGER DEFAULT 180, -- 3 minutes default

  -- Interview Content
  questions_asked JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of interview questions
  transcription TEXT, -- Whisper API transcription
  language VARCHAR(10) DEFAULT 'en',

  -- AI Evaluation Scores (0-100)
  soft_skills_score NUMERIC(5,2),
  communication_score NUMERIC(5,2),
  confidence_score NUMERIC(5,2),
  overall_score NUMERIC(5,2), -- Average of above scores

  -- AI Feedback
  ai_feedback TEXT,
  improvement_suggestions TEXT,
  strengths JSONB DEFAULT '[]'::jsonb, -- Array of identified strengths
  weaknesses JSONB DEFAULT '[]'::jsonb, -- Array of areas to improve

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_voice_interviews_user_id ON public.voice_interviews(user_id);
CREATE INDEX idx_voice_interviews_quiz_result_id ON public.voice_interviews(quiz_result_id);
CREATE INDEX idx_voice_interviews_started_at ON public.voice_interviews(started_at DESC);

COMMENT ON TABLE public.voice_interviews IS 'Voice interview recordings with AI evaluation';

-- ============================================================================
-- 7. FEEDBACK
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id BIGINT REFERENCES public.cvs(id) ON DELETE SET NULL,
  quiz_result_id BIGINT REFERENCES public.quiz_results(id) ON DELETE SET NULL,

  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_type VARCHAR(50) DEFAULT 'quiz', -- quiz, interview, general

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);

COMMENT ON TABLE public.feedback IS 'AI-generated feedback for users';

-- ============================================================================
-- 8. ANALYTICS / TRACKING (Optional - for future use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_activity (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL, -- cv_upload, quiz_start, quiz_complete, interview_start, etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_created_at ON public.user_activity(created_at DESC);
CREATE INDEX idx_user_activity_type ON public.user_activity(activity_type);

COMMENT ON TABLE public.user_activity IS 'User activity tracking for analytics';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- CVs: Users can only see and manage their own CVs
CREATE POLICY "Users can view own CVs" ON public.cvs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own CVs" ON public.cvs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own CVs" ON public.cvs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own CVs" ON public.cvs
  FOR DELETE USING (auth.uid() = user_id);

-- Quizzes: Users can only see and manage their own quizzes
CREATE POLICY "Users can view own quizzes" ON public.quizzes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quizzes" ON public.quizzes
  FOR UPDATE USING (auth.uid() = user_id);

-- Questions: Users can view questions for their own quizzes
CREATE POLICY "Users can view own quiz questions" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes
      WHERE quizzes.id = questions.quiz_id
      AND quizzes.user_id = auth.uid()
    )
  );

-- Edge Functions can insert questions (using service role key)
CREATE POLICY "Service role can insert questions" ON public.questions
  FOR INSERT WITH CHECK (true);

-- Quiz Results: Users can only see their own results
CREATE POLICY "Users can view own results" ON public.quiz_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own results" ON public.quiz_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Voice Interviews: Users can only see and manage their own interviews
CREATE POLICY "Users can view own interviews" ON public.voice_interviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interviews" ON public.voice_interviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interviews" ON public.voice_interviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Feedback: Users can only see their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (true);

-- User Activity: Users can view their own activity
CREATE POLICY "Users can view own activity" ON public.user_activity
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert activity" ON public.user_activity
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER set_updated_at_user_profiles
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_cvs
  BEFORE UPDATE ON public.cvs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- CLEANUP: Drop old Django tables (OPTIONAL - run after migration verified)
-- ============================================================================

-- IMPORTANT: Only run these after successful migration and testing!
-- Uncomment to execute:

/*
DROP TABLE IF EXISTS public.auth_group CASCADE;
DROP TABLE IF EXISTS public.auth_group_permissions CASCADE;
DROP TABLE IF EXISTS public.auth_permission CASCADE;
DROP TABLE IF EXISTS public.auth_user_groups CASCADE;
DROP TABLE IF EXISTS public.auth_user_user_permissions CASCADE;
DROP TABLE IF EXISTS public.django_admin_log CASCADE;
DROP TABLE IF EXISTS public.django_content_type CASCADE;
DROP TABLE IF EXISTS public.django_migrations CASCADE;
DROP TABLE IF EXISTS public.django_session CASCADE;
-- Keep auth_user temporarily for data migration reference
-- DROP TABLE IF EXISTS public.auth_user CASCADE;
*/

-- ============================================================================
-- GRANTS (Ensure proper permissions)
-- ============================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant access to service role (for Edge Functions)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- VIEWS FOR CONVENIENCE
-- ============================================================================

-- View: User dashboard summary
CREATE OR REPLACE VIEW public.user_dashboard_summary AS
SELECT
  u.id as user_id,
  u.email,
  p.username,
  p.full_name,
  (SELECT COUNT(*) FROM public.cvs WHERE user_id = u.id) as total_cvs,
  (SELECT COUNT(*) FROM public.quizzes WHERE user_id = u.id) as total_quizzes,
  (SELECT COUNT(*) FROM public.quiz_results WHERE user_id = u.id) as total_results,
  (SELECT AVG(score) FROM public.quiz_results WHERE user_id = u.id) as average_score,
  (SELECT MAX(completed_at) FROM public.quiz_results WHERE user_id = u.id) as last_quiz_date
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id;

COMMENT ON VIEW public.user_dashboard_summary IS 'User dashboard overview with statistics';

-- ============================================================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ============================================================================

-- Uncomment to insert test data:
/*
INSERT INTO public.user_profiles (id, username, full_name) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'testuser', 'Test User');
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
