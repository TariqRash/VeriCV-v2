from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('ping/', views.simple_health, name='simple_health'),
]
