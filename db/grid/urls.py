from django.conf.urls import patterns, url

from .views import generate_theme

urlpatterns = patterns('',
    url(r'^generate_theme/(?P<theme>\d+)/(?P<image>.+)$', generate_theme),
)
