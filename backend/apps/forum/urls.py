from rest_framework.routers import DefaultRouter

from .views import CommentViewSet, TopicViewSet

router = DefaultRouter()
router.register('topics', TopicViewSet, basename='forum-topic')
router.register('comments', CommentViewSet, basename='forum-comment')

urlpatterns = router.urls
