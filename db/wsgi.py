#!/usr/bin/python
import os
import sys
sys.stdout = sys.stderr

os.environ["DJANGO_SETTINGS_MODULE"] = "busgame.db.settings"

import django.core.handlers.wsgi
application = django.core.handlers.wsgi.WSGIHandler()
