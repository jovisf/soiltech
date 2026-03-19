#!/bin/sh

# Exit on error
set -e

echo "Applying Prisma migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec "$@"
