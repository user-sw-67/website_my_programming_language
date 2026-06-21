from django.contrib import admin

from .models import Comment, Topic

admin.site.register(Topic)
admin.site.register(Comment)
