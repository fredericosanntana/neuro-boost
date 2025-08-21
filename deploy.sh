#!/bin/bash

# Deployment script for the NeuroBoost frontend

# --- Configuration ---
# Base name for the Docker image and container
IMAGE_BASE_NAME="neuroboost-frontend"

# The port mapping from host to container
HOST_PORT=8080
CONTAINER_PORT=80

# The Dockerfile to use for building the image
DOCKERFILE="Dockerfile.frontend"

# --- Functions ---
usage() {
    echo "Usage: $0 [environment]"
    echo "Deploys the application for the specified environment (e.g., production, staging)."
    echo
    echo "Arguments:"
    echo "  environment    The deployment environment (e.g., 'production'). Defaults to 'development'."
    exit 1
}

# --- Script ---

# Set the -e option to exit immediately if a command exits with a non-zero status.
set -e

# --- Argument Parsing ---
ENV=${1:-development}
IMAGE_NAME="$IMAGE_BASE_NAME:$ENV"
CONTAINER_NAME="$IMAGE_BASE_NAME-$ENV"

# --- Banner ---
echo "========================================="
echo "  NeuroBoost Frontend Deployment Script  "
echo "  Environment: $ENV"
echo "========================================="
echo

# --- Build the Docker image ---
echo "Building Docker image: $IMAGE_NAME..."
docker build -f $DOCKERFILE -t $IMAGE_NAME .
echo "Docker image built successfully."
echo

# --- Stop and remove existing container ---
# We check if a container with the same name is running and stop it.
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "Stopping existing container: $CONTAINER_NAME..."
    docker stop $CONTAINER_NAME
    echo "Container stopped."
fi

# We check if a container with the same name exists (even if stopped) and remove it.
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "Removing existing container: $CONTAINER_NAME..."
    docker rm $CONTAINER_NAME
    echo "Container removed."
fi
echo

# --- Run the new container ---
echo "Starting new container: $CONTAINER_NAME..."
docker run -d \
    --name $CONTAINER_NAME \
    -p $HOST_PORT:$CONTAINER_PORT \
    --restart always \
    $IMAGE_NAME

echo
echo "========================================="
echo "  Deployment complete!                   "
echo "========================================="
echo "Application should be available at http://localhost:$HOST_PORT"
echo
