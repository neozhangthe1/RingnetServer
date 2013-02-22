from django.conf.urls import patterns, include, url
from RingNetServer.ringnet import urls

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'RingNetServer.views.home', name='home'),
    # url(r'^RingNetServer/', include('RingNetServer.RingNetServer.urls')),
    url(r'^ringnet/', include('RingNetServer.ringnet.urls')),
    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # url(r'^admin/', include(admin.site.urls)),
)