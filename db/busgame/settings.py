"""
Django settings for busgame project.
Based on the Django 1.6 template, with wq-specific modifications noted as such

For more information on this file, see
https://docs.djangoproject.com/en/1.6/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.6/ref/settings/

For more information about wq.db's Django settings see
http://wq.io/docs/settings

"""

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
import os
# wq: extra dirname() to account for db/ folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

# wq: SECRET_KEY, DEBUG and TEMPLATE_DEBUG are defined in local_settings.py

ALLOWED_HOSTS = ["busgame"]


# Application definition

INSTALLED_APPS = (
    'rest_framework',
    'django.contrib.contenttypes',
    'wq.db.rest',
    'grid',
    'game',
)

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

# wq: Recommended settings for Django, rest_framework, and social auth
from wq.db.default_settings import (
    TEMPLATE_LOADERS,
    TEMPLATE_CONTEXT_PROCESSORS,
    SESSION_COOKIE_HTTPONLY,
    REST_FRAMEWORK,
    SOCIAL_AUTH_PIPELINE,
)
REST_FRAMEWORK['UPLOADED_FILES_USE_URL'] = False

TEMPLATE_CONTEXT_PROCESSORS += (
    'grid.context_processors.themes',
)
# wq: Recommended settings unique to wq.db
from wq.db.default_settings import (
    ANONYMOUS_PERMISSIONS,
    SRID,
    DEFAULT_AUTH_GROUP,
    DISAMBIGUATE
)
ANONYMOUS_PERMISSIONS = (
    "grid.change_point",
    "grid.add_pointtype",
    "grid.change_pointtype",
    "grid.add_theme",
    "grid.change_theme",
    "game.add_player"
)

# wq: Social auth (see http://psa.matiasaguirre.net/docs/backends/)
AUTHENTICATION_BACKENDS = (
    'social.backends.google.GoogleOpenId',
    'django.contrib.auth.backends.ModelBackend',
)

ROOT_URLCONF = 'busgame.urls'

WSGI_APPLICATION = 'busgame.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.6/ref/settings/#databases

# wq: DATABASES is defined in local_settings.py

# Internationalization
# https://docs.djangoproject.com/en/1.6/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.6/howto/static-files/

STATIC_URL = '/static/'

# wq: Configure paths for default project layout
STATIC_ROOT = os.path.join(BASE_DIR, 'htdocs', 'static')
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
VERSION_TXT = os.path.join(BASE_DIR, 'version.txt')
MEDIA_URL = '/media/'
TEMPLATE_DIRS = (
    os.path.join(BASE_DIR, 'templates'),
)

# wq: Import local settings
try:
    from .local_settings import *
except ImportError:
    pass
