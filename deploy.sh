#!/bin/bash

# Deployment script for the NeuroBoost application
# This script automates the process of building and deploying the application using Docker.

# --- Configuration ---
# The name of the Docker image and container
IMAGE_NAME="neuro-boost-frontend"
CONTAINER_NAME="neuro-boost-frontend-app"
# The environment to deploy (e.g., production)
ENVIRONMENT=$1

# --- Functions ---
# Function to print an error message and exit
error_exit() {
    echo "Error: $1"
    exit 1
}

# --- Main Script ---
echo "Starting deployment for environment: $ENVIRONMENT"

# Check if an environment was provided
if [ -z "$ENVIRONMENT" ]; then
    error_exit "No environment specified. Usage: ./deploy.sh <environment>"
fi

# Stop and remove the existing container if it's running
if [ $(sudo docker ps -q -f name=^/${CONTAINER_NAME}$) ]; then
    echo "Stopping and removing existing container..."
    sudo docker stop $CONTAINER_NAME && sudo docker rm $CONTAINER_NAME
fi

# Build the Docker image using Dockerfile.frontend
echo "Building Docker image: $IMAGE_NAME..."
sudo docker build -f Dockerfile.frontend -t $IMAGE_NAME . || error_exit "Docker build failed."

# Run the new container
echo "Deploying container: $CONTAINER_NAME..."
sudo docker run -d \
    --name $CONTAINER_NAME \
    -p 8080:80 \
    --restart always \
    $IMAGE_NAME || error_exit "Docker run failed."

# Validation
echo "Verifying deployment..."
sleep 10 # Wait for nginx to start

# Check if the container is running
if ! sudo docker ps -q -f name=^/${CONTAINER_NAME}$ | grep -q .; then
    error_exit "Container failed to start."
fi

# Check the health of the application
echo "Pinging the application..."
curl -f http://localhost:8080/ || error_exit "Application health check failed."

echo "Deployment successful! Application is running at http://localhost:8080"

exit 0
