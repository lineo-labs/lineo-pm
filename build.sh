#!/bin/bash

CONTAINER_NAME="lines-pm-dev"
IMAGE_NAME="lines-pm-dev-image"


if [ "$1" == "shell" ]; then
    DEV_DOCKERFILE="Dockerfile.dev"
    echo "👉 Starting development environment…"

    # Build the development image
    docker build -f $DEV_DOCKERFILE -t $IMAGE_NAME .

    # Run the development container with volume mounting and open a shell
    docker run -it --rm \
        --name $CONTAINER_NAME \
        -v $(pwd)/src:/app \
        --env-file .env-dev \
        -p 8000:8000 \
        $IMAGE_NAME \
        bash

    exit 0
fi

echo "👉 Building production image…"
docker build -t lines-pm .
echo "✔ Build complete"