from django.conf.urls.defaults import patterns, url, include
from views import *

urlpatterns = patterns("",
                       url(r'^$',ringnet),
                       url(r'^render/topic/$',render_topic),
                       url(r'^render/egonet/$',render_egonet),
                       url(r'^topic/$',get_jconf_topic),
                       url(r'^render/word/$',render_topic_word),
                       url(r'^coevo/$',coevolution),
                       url(r'^render/coevo/$',render_coevo),
                       url(r'^render/coevo/add/$',add_coevo),
                       url(r'^search/', search),
                       )