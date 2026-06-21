from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    DeveloperDetailView,
    DeveloperLevelUpdateView,
    DeveloperListView,
    EmailTokenObtainPairView,
    MeView,
    PromoteToDeveloperView,
    RegisterView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', EmailTokenObtainPairView.as_view(), name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('developers/', DeveloperListView.as_view(), name='developer-list'),
    path('developers/promote/', PromoteToDeveloperView.as_view(), name='developer-promote'),
    path('developers/<str:key>/', DeveloperDetailView.as_view(), name='developer-detail'),
    path('developers/<str:key>/level/', DeveloperLevelUpdateView.as_view(), name='developer-level'),
]
