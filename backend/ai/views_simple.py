from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
def generate_questions_view(request):
    """Temporary simple version - just return mock questions"""
    try:
        logger.info("[v0] Generate questions called")
        
        # Return simple mock questions
        questions = [
            {
                "id": i,
                "question": f"سؤال تجريبي {i}",
                "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
                "correctAnswer": 0,
                "skill": "عام"
            }
            for i in range(1, 16)
        ]
        
        return Response({
            "questions": questions,
            "quiz_id": 1
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"[v0] Error in generate_questions: {str(e)}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def submit_answers_view(request):
    """Temporary simple version - just return mock results"""
    try:
        logger.info("[v0] Submit answers called")
        
        return Response({
            "score": 75,
            "result_id": 1,
            "quiz_id": 1,
            "correct": 12,
            "total": 15,
            "feedback": "نتيجة جيدة"
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"[v0] Error in submit_answers: {str(e)}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
