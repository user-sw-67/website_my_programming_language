from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import GithubPushView, ProjectNodeViewSet, ProjectViewSet

router = DefaultRouter()
router.register('items', ProjectViewSet, basename='project')
router.register('nodes', ProjectNodeViewSet, basename='project-node')

urlpatterns = [
    path('github/push/', GithubPushView.as_view(), name='project-github-push'),
    *router.urls,
]
