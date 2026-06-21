from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/auth/social/', include('social_django.urls', namespace='social')),
    path('api/projects/', include('apps.projects.urls')),
    path('api/forum/', include('apps.forum.urls')),
    path('api/issues/', include('apps.issues.urls')),
    path('api/feedback/', include('apps.feedback.urls')),
    path('api/news/', include('apps.news.urls')),
    path('api/support/', include('apps.support_chat.urls')),
    path('api/logs/', include('apps.activitylog.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
