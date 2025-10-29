from django.core.exceptions import ValidationError
import os
from django.db import models
from django.contrib.auth.models import User

def validate_cv_file(value):
        ext = os.path.splitext(value.name)[1]  # Extract file 
        valid_extensions = ['.pdf', '.docx']
        if ext.lower() not in valid_extensions:
         raise ValidationError('Unsupported file type. Only PDF and DOCX files are allowed.')
        
class CV(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cvs')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='cvs/',validators=[validate_cv_file])
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # Extracted information from CV
    extracted_name = models.CharField(max_length=255, blank=True, null=True)
    extracted_phone = models.CharField(max_length=50, blank=True, null=True)
    extracted_city = models.CharField(max_length=100, blank=True, null=True)
    detected_language = models.CharField(max_length=10, default='en', choices=[('en', 'English'), ('ar', 'Arabic')])

    # Job titles extracted from CV (stored as JSON array)
    extracted_job_titles = models.JSONField(default=list, blank=True)

    # User confirmation status
    info_confirmed = models.BooleanField(default=False)

    # IP-based city detection
    ip_detected_city = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.title
    