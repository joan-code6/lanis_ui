#!/bin/sh
set -e

echo "Setting up environment..."
if [ ! -f .env ] && [ -f .env.example ]; then
    cp .env.example .env
    echo "Created .env file from template"
fi

echo "Setup complete! Starting: $@"
exec "$@"
