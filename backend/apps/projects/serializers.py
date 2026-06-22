from rest_framework import serializers

from apps.users.serializers import PublicUserSerializer

from .models import Project, ProjectNode


class ProjectNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectNode
        fields = ('id', 'project', 'parent', 'node_type', 'name', 'content', 'updated_at')
        read_only_fields = ('id', 'updated_at')

    def validate_project(self, project):
        request = self.context['request']
        if project.owner_id != request.user.id:
            raise serializers.ValidationError('Это не ваш проект.')
        return project

    def validate_parent(self, parent):
        if parent is None:
            return parent
        request = self.context['request']
        if parent.project.owner_id != request.user.id:
            raise serializers.ValidationError('Родительская папка принадлежит другому проекту.')
        return parent

    def validate(self, attrs):
        project = attrs.get('project') or getattr(self.instance, 'project', None)
        parent = attrs.get('parent') if 'parent' in attrs else getattr(self.instance, 'parent', None)
        if parent is not None and project is not None and parent.project_id != project.id:
            raise serializers.ValidationError('Родительская папка принадлежит другому проекту.')
        return attrs


class ProjectSerializer(serializers.ModelSerializer):
    owner = PublicUserSerializer(read_only=True)

    class Meta:
        model = Project
        fields = (
            'id', 'owner', 'name', 'description', 'is_public', 'run_flags',
            'artifacts', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'artifacts', 'created_at', 'updated_at')
