from django.conf.urls import patterns, url

from .views import generate_theme, generate_bg

urlpatterns = patterns('',
    url(r'^generate_theme/(?P<theme>\d+)/(?P<image>.+)$', generate_theme),
    url(r'^generate_bg/(?P<level>\d+)/(?P<scale>\d+)/(?P<x>\d+)/(?P<y>\d+).png$', generate_bg),
)
