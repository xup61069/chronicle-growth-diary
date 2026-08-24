#!/bin/sh
set -eu

case "${CHRONICLE_RUN_MIGRATIONS:-true}" in
  true)
    ./node_modules/.bin/drizzle-kit migrate
    ;;
  false)
    ;;
  *)
    echo "CHRONICLE_RUN_MIGRATIONS must be true or false" >&2
    exit 64
    ;;
esac

exec "$@"
