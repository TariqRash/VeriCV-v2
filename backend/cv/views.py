from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CV
from .serializers import CVSerializer
from rest_framework.permissions import IsAuthenticated
from ai.ai_logic import (
    extract_text_from_pdf,
    detect_cv_language,
    extract_cv_information,
    detect_city_from_ip
)

class CVViewSet(viewsets.ModelViewSet):
    queryset = CV.objects.all()
    serializer_class = CVSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Save CV first
        cv_instance = serializer.save(user=self.request.user)

        # Extract text and information from CV
        try:
            cv_text = extract_text_from_pdf(cv_instance.file)

            # Detect language
            language = detect_cv_language(cv_text)
            cv_instance.detected_language = language

            # Extract CV information (name, phone, city, job titles)
            extracted_info = extract_cv_information(cv_text)
            cv_instance.extracted_name = extracted_info.get('name', '')
            cv_instance.extracted_phone = extracted_info.get('phone', '')
            cv_instance.extracted_city = extracted_info.get('city', '')
            cv_instance.extracted_job_titles = extracted_info.get('job_titles', [])

            # Get IP-based city detection
            client_ip = self.get_client_ip()
            if client_ip:
                ip_city = detect_city_from_ip(client_ip)
                cv_instance.ip_detected_city = ip_city

            cv_instance.save()
        except Exception as e:
            print(f"Error extracting CV information: {e}")

    def get_client_ip(self):
        """Extract client IP from request."""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip

    @action(detail=True, methods=['post'])
    def confirm_info(self, request, pk=None):
        """Confirm extracted information."""
        cv = self.get_object()
        cv.info_confirmed = True

        # Update with user-provided corrections if any
        if 'name' in request.data:
            cv.extracted_name = request.data['name']
        if 'phone' in request.data:
            cv.extracted_phone = request.data['phone']
        if 'city' in request.data:
            cv.extracted_city = request.data['city']

        cv.save()
        return Response({'status': 'information confirmed'})

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return CV.objects.all()
        return CV.objects.filter(user=user)
