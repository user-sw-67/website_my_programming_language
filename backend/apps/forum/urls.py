from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AttachmentUploadView, CommentViewSet, ForumCategoryViewSet, ImageUploadView, TopicViewSet

router = DefaultRouter()
router.register('categories', ForumCategoryViewSet, basename='forum-category')
router.register('topics', TopicViewSet, basename='forum-topic')
router.register('comments', CommentViewSet, basename='forum-comment')

urlpatterns = [
    path('attachments/upload/', AttachmentUploadView.as_view(), name='forum-attachment-upload'),
    path('upload-image/', ImageUploadView.as_view(), name='forum-upload-image'),
] + router.urls
