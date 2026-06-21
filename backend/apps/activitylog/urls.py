from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ActivityLogViewSet, StatsView

router = DefaultRouter()
router.register('', ActivityLogViewSet, basename='activitylog')

urlpatterns = [
    path('stats/', StatsView.as_view(), name='activitylog-stats'),
] + router.urls
