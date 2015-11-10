from wq.db.rest.serializers import ModelSerializer
from rest_framework import serializers
from wq.db.patterns import serializers as patterns
from .models import Variant


class VariantSerializer(patterns.AttachmentSerializer):
    class Meta:
        model = Variant
        list_serializer_class = patterns.AttachmentListSerializer

class LayoutSerializer(ModelSerializer):
    variants = VariantSerializer(many=True)
    has_variants = serializers.SerializerMethodField()
    has_transform_variants = serializers.SerializerMethodField()

    def get_has_variants(self, instance):
        return instance.variants.count() > 1

    def get_has_transform_variants(self, instance):
        return instance.variants.exclude(transform_type__isnull=True).count() > 0
