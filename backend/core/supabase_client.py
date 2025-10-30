"""
Supabase client utility for direct API access
This bypasses Django ORM and PostgreSQL connection pool issues
"""
import os
from supabase import create_client, Client
from typing import Optional
import logging

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    """
    Get or create a singleton Supabase client
    Uses SUPABASE_URL and SUPABASE_ANON_KEY from environment
    """
    global _supabase_client
    
    if _supabase_client is None:
        supabase_url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.environ.get('SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment")
        
        _supabase_client = create_client(supabase_url, supabase_key)
        logger.info(f"[v0] Supabase client initialized with URL: {supabase_url}")
    
    return _supabase_client


def save_quiz_to_supabase(user_id: int, title: str, cv_id: Optional[int] = None) -> dict:
    """Save quiz to Supabase and return the created record"""
    client = get_supabase_client()
    
    data = {
        "user_id": user_id,
        "title": title,
        "cv_id": cv_id
    }
    
    result = client.table('quiz_quiz').insert(data).execute()
    logger.info(f"[v0] Created quiz in Supabase: {result.data}")
    return result.data[0] if result.data else None


def save_questions_to_supabase(quiz_id: int, questions: list) -> list:
    """Save questions to Supabase and return created records"""
    client = get_supabase_client()
    
    questions_data = []
    for q in questions:
        questions_data.append({
            "quiz_id": quiz_id,
            "text": q.get('question', ''),
            "options": q.get('options', []),
            "correct_answer": q.get('correctAnswer', 0)
        })
    
    result = client.table('quiz_question').insert(questions_data).execute()
    logger.info(f"[v0] Created {len(result.data)} questions in Supabase")
    return result.data


def save_result_to_supabase(quiz_id: int, user_id: int, score: int, answers: list) -> dict:
    """Save quiz result to Supabase and return the created record"""
    client = get_supabase_client()
    
    data = {
        "quiz_id": quiz_id,
        "user_id": user_id,
        "score": score,
        "answers": answers
    }
    
    result = client.table('quiz_result').insert(data).execute()
    logger.info(f"[v0] Created result in Supabase: {result.data}")
    return result.data[0] if result.data else None


def get_quiz_questions(quiz_id: int) -> list:
    """Get all questions for a quiz from Supabase"""
    client = get_supabase_client()
    
    result = client.table('quiz_question').select('*').eq('quiz_id', quiz_id).order('id').execute()
    return result.data


def get_result_by_id(result_id: int) -> Optional[dict]:
    """Get a result by ID from Supabase"""
    client = get_supabase_client()
    
    result = client.table('quiz_result').select('*').eq('id', result_id).execute()
    return result.data[0] if result.data else None


def get_user_results(user_id: int) -> list:
    """Get all results for a user from Supabase"""
    client = get_supabase_client()
    
    result = client.table('quiz_result').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
    return result.data
