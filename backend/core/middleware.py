from django.db import connection

class CloseDBConnectionMiddleware:
    """
    Middleware to ensure database connections are closed after each request.
    This prevents connection pool exhaustion with Supabase.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Close the connection after each request
        connection.close()
        return response
