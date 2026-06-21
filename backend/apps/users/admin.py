from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User

UserAdmin.fieldsets = UserAdmin.fieldsets + (
    ('ATOM', {'fields': ('role', 'developer_level', 'developer_key', 'avatar_url', 'bio')}),
)
UserAdmin.list_display = UserAdmin.list_display + ('role', 'developer_level', 'developer_key')
UserAdmin.list_filter = UserAdmin.list_filter + ('role', 'developer_level')
UserAdmin.search_fields = UserAdmin.search_fields + ('developer_key',)
UserAdmin.readonly_fields = ('developer_key',)

admin.site.register(User, UserAdmin)
