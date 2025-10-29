from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CV
from .serializers import CVSerializer
from rest_framework.permissions import IsAuthenticated
import logging

logger = logging.getLogger(__name__)

class CVViewSet(viewsets.ModelViewSet):
    queryset = CV.objects.all()
    serializer_class = CVSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Save CV first
        cv_instance = serializer.save(user=self.request.user)

        # Extract text and information from CV (optional, can fail gracefully)
        try:
            from ai.ai_logic import (
                extract_text_from_pdf,
                detect_cv_language,
                extract_cv_information,
                detect_city_from_ip
            )

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
            logger.info(f"CV {cv_instance.id} processed successfully for user {self.request.user.username}")
        except Exception as e:
            logger.error(f"Error extracting CV information: {e}")
            # Don't fail the upload, just log the error

    def get_client_ip(self):
        """Extract client IP from request."""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = self.request.META.get('REMOTE_ADDR')
        return ip

    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        """Custom upload endpoint that returns cv_id for frontend."""
        try:
            file = request.FILES.get('file')
            if not file:
                return Response(
                    {'error': 'No file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create CV instance
            title = request.data.get('title', file.name)
            cv = CV.objects.create(
                user=request.user,
                title=title,
                file=file
            )

            # Extract information asynchronously (don't fail if this errors)
            try:
                from ai.ai_logic import (
                    extract_text_from_pdf,
                    detect_cv_language,
                    extract_cv_information,
                    detect_city_from_ip
                )

                cv_text = extract_text_from_pdf(cv.file)
                language = detect_cv_language(cv_text)
                cv.detected_language = language

                extracted_info = extract_cv_information(cv_text)
                cv.extracted_name = extracted_info.get('name', '')
                cv.extracted_phone = extracted_info.get('phone', '')
                cv.extracted_city = extracted_info.get('city', '')
                cv.extracted_job_titles = extracted_info.get('job_titles', [])

                client_ip = self.get_client_ip()
                if client_ip:
                    cv.ip_detected_city = detect_city_from_ip(client_ip)

                cv.save()
            except Exception as e:
                logger.error(f"Error processing CV: {e}")
                # Continue anyway, just without extracted info

            return Response({
                'cv_id': cv.id,
                'id': cv.id,
                'filename': file.name,
                'title': cv.title,
                'detected_language': cv.detected_language,
                'extracted_info': {
                    'name': cv.extracted_name or '',
                    'phone': cv.extracted_phone or '',
                    'city': cv.extracted_city or cv.ip_detected_city or '',
                    'job_titles': cv.extracted_job_titles or []
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Upload error: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
