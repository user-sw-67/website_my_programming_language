from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ImageUploadView, NewsPostViewSet

router = DefaultRouter()
router.register('', NewsPostViewSet, basename='news')

urlpatterns = [
    # должен идти раньше router.urls — иначе 'upload-image' попадёт в
    # детальный маршрут NewsPostViewSet (lookup_field='slug') и улетит в него
    path('upload-image/', ImageUploadView.as_view(), name='news-upload-image'),
] + router.urls
