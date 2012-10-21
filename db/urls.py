from django.conf.urls.defaults import patterns, include, url

# Uncomment the next two lines to enable the admin:
#from django.contrib import admin
#admin.autodiscover()

from grid.views import IndexView

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'db.views.home', name='home'),
    url(r'^', include('wq.db.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
#    url(r'^admin/', include(admin.site.urls)),

    url(r'^$', IndexView.as_view())
)

if True:
    urlpatterns += patterns('',
        url(r'^js/(?P<path>.*)$', 'django.views.static.serve', {
            'document_root': '/var/www/busgame/htdocs/js',
        }),
   )
