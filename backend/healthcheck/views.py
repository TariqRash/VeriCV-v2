from django.http import JsonResponse
from django.db import connection
from django.db.utils import OperationalError

def health(request):
    """Health check endpoint that tests database connectivity"""
    try:
        # Test database connection
        connection.ensure_connection()
        db_status = 'connected'
    except OperationalError:
        db_status = 'disconnected'
    
    return JsonResponse({
        'status': 'ok',
        'database': db_status
    })

def simple_health(request):
    """Simple health check that doesn't require database connection"""
    return JsonResponse({'status': 'ok'})

# Alias for backward compatibility
health_check = health
