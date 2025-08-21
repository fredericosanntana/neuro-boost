#!/bin/bash

# NeuroBoost Tasks Monitoring Script
# Checks application health and logs status

LOG_FILE="/var/log/neuro-boost-tasks-monitor.log"
APP_URL="https://tasks.dpo2u.com"
LOCAL_URL="http://localhost:80/health"
CONTAINER_NAME="neuro-boost-tasks"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check container status
check_container() {
    if docker ps | grep -q "$CONTAINER_NAME"; then
        CONTAINER_STATUS="running"
        HEALTH_STATUS=$(docker inspect "$CONTAINER_NAME" | grep '"Status"' | head -1 | awk -F'"' '{print $4}')
        log_message "Container: $CONTAINER_STATUS, Health: $HEALTH_STATUS"
        return 0
    else
        log_message "Container: not running"
        return 1
    fi
}

# Function to check application response
check_application() {
    # Test local health endpoint
    if curl -f -s "$LOCAL_URL" > /dev/null 2>&1; then
        log_message "Health check: PASS"
        return 0
    else
        log_message "Health check: FAIL"
        return 1
    fi
}

# Function to check external access
check_external_access() {
    # Test external access with Host header
    if curl -I -k -H "Host: tasks.dpo2u.com" -s https://195.200.2.56 | grep -q "200 OK\|200$"; then
        log_message "External access: PASS"
        return 0
    else
        log_message "External access: FAIL"
        return 1
    fi
}

# Function to check resource usage
check_resources() {
    if docker ps | grep -q "$CONTAINER_NAME"; then
        MEMORY_USAGE=$(docker stats --no-stream --format "table {{.MemUsage}}" "$CONTAINER_NAME" | tail -1)
        CPU_USAGE=$(docker stats --no-stream --format "table {{.CPUPerc}}" "$CONTAINER_NAME" | tail -1)
        log_message "Resources - Memory: $MEMORY_USAGE, CPU: $CPU_USAGE"
    fi
}

# Main monitoring function
monitor() {
    log_message "=== NeuroBoost Tasks Health Check ==="
    
    # Check container
    if ! check_container; then
        log_message "ERROR: Container not running, attempting restart..."
        docker compose -f /root/projects/neuro-boost/docker-compose.tasks.yml up -d
        sleep 30
        check_container
    fi
    
    # Check application
    if ! check_application; then
        log_message "WARNING: Application health check failed"
    fi
    
    # Check external access
    if ! check_external_access; then
        log_message "WARNING: External access check failed"
    fi
    
    # Check resources
    check_resources
    
    log_message "=== End Health Check ==="
    echo ""
}

# Run monitoring
monitor