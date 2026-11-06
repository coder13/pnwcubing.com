#!/bin/sh
set -eu
cd /root/directus/delegate-visibility
set -a
. ./job.env
set +a
exec /usr/bin/node ./update-delegate-visibility.mjs "$@"
