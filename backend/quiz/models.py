from django.db import models
from django.contrib.auth.models import User

class Quiz(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quizzes')
    cv = models.ForeignKey('cv.CV', on_delete=models.CASCADE, related_name='quizzes', null=True, blank=True)
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.user.username}"

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    options = models.JSONField()
    correct_answer = models.IntegerField(default=0)

    def __str__(self):
        return f"Q: {self.text[:50]}"

class Result(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='results')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='results')
    score = models.FloatField()
    completed_at = models.DateTimeField(auto_now_add=True)

    answers = models.JSONField(default=dict, blank=True)

    ai_recommendations = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.quiz.title} - {self.score}%"

class VoiceInterview(models.Model):
    """Voice interview after quiz completion"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='voice_interviews')
    result = models.OneToOneField(Result, on_delete=models.CASCADE, related_name='voice_interview', null=True, blank=True)

    # Audio file storage
    audio_file = models.FileField(upload_to='interviews/', blank=True, null=True)

    # Transcription
    transcription = models.TextField(blank=True, null=True)

    # Interview metadata
    duration = models.IntegerField(default=180, help_text='Duration in seconds (default 3 minutes)')
    language = models.CharField(max_length=10, default='en', choices=[('en', 'English'), ('ar', 'Arabic')])

    # AI evaluation
    soft_skills_score = models.FloatField(blank=True, null=True, help_text='Soft skills score out of 100')
    communication_score = models.FloatField(blank=True, null=True, help_text='Communication score out of 100')
    confidence_score = models.FloatField(blank=True, null=True, help_text='Confidence score out of 100')

    # AI feedback (not shown as score to user)
    ai_feedback = models.TextField(blank=True, null=True)
    improvement_suggestions = models.TextField(blank=True, null=True)

    # Interview questions asked
    questions_asked = models.JSONField(default=list, blank=True)

    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Interview for {self.user.username} at {self.started_at}"
