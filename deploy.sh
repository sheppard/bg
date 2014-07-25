#!/bin/sh

# Exit on error
set -e

# Build javascript with wq.app
cd app;
wq build $1;

# Force important files through any unwanted server caching
cd ../;
sed -i "s/busgame.js/busgame.js?v="$1"/" htdocs-build/busgame.appcache
sed -i "s/busgame.css/busgame.css?v="$1"/" htdocs-build/busgame.appcache

# Preserve Django's static files (e.g. admin)
if [ -d htdocs/static ]; then
    cp -a htdocs/static htdocs-build/static
fi;

# Replace existing htdocs with new version
rm -rf htdocs/;
mv -i htdocs-build/ htdocs;

# Restart Django
touch db/busgame/wsgi.py
