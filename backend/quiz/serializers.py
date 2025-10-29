from rest_framework import serializers
from .models import Quiz, Question, Result
from feedback.models import Feedback

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = '__all__'
        read_only_fields = ['user', 'created_at']
    
    def get_question_count(self, obj):
        return obj.questions.count()

class ResultSerializer(serializers.ModelSerializer):
    quiz = QuizSerializer(read_only=True)
    feedback = serializers.SerializerMethodField()
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    
    class Meta:
        model = Result
        fields = '__all__'
        read_only_fields = ['user', 'completed_at']
    
    def get_feedback(self, obj):
        try:
            feedback = Feedback.objects.get(result=obj)
            return {
                'content': feedback.content,
                'rating': feedback.rating,
                'created_at': feedback.created_at
            }
        except Feedback.DoesNotExist:
            return None
