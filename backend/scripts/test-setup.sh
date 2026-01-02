#!/bin/bash

# Script to setup and run tests for Tumulte backend
# This script starts the test database and Redis, runs migrations, and executes tests

set -e

echo "🚀 Setting up test environment for Tumulte..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Function to start test services
start_services() {
    echo -e "${BLUE}📦 Starting PostgreSQL and Redis test containers...${NC}"
    docker-compose -f docker-compose.test.yml up -d

    echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
    sleep 5

    # Wait for PostgreSQL
    until docker exec tumulte-postgres-test pg_isready -U test > /dev/null 2>&1; do
        echo "Waiting for PostgreSQL..."
        sleep 2
    done
    echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

    # Wait for Redis
    until docker exec tumulte-redis-test redis-cli ping > /dev/null 2>&1; do
        echo "Waiting for Redis..."
        sleep 2
    done
    echo -e "${GREEN}✅ Redis is ready${NC}"
}

# Function to run migrations
run_migrations() {
    echo -e "${BLUE}🔄 Running database migrations...${NC}"
    NODE_ENV=test node ace migration:run --force
    echo -e "${GREEN}✅ Migrations completed${NC}"
}

# Function to stop services
stop_services() {
    echo -e "${BLUE}🛑 Stopping test services...${NC}"
    docker-compose -f docker-compose.test.yml down
    echo -e "${GREEN}✅ Services stopped${NC}"
}

# Main execution
main() {
    check_docker

    # Parse arguments
    COMMAND=${1:-run}

    case $COMMAND in
        start)
            start_services
            run_migrations
            echo -e "${GREEN}✅ Test environment is ready!${NC}"
            echo -e "${BLUE}Run 'npm test' to execute tests${NC}"
            ;;
        stop)
            stop_services
            ;;
        run)
            start_services
            run_migrations
            echo -e "${BLUE}🧪 Running tests...${NC}"
            npm test
            ;;
        clean)
            stop_services
            echo -e "${BLUE}🧹 Cleaning up Docker volumes...${NC}"
            docker volume prune -f
            echo -e "${GREEN}✅ Cleanup completed${NC}"
            ;;
        *)
            echo "Usage: $0 {start|stop|run|clean}"
            echo "  start - Start test services and run migrations"
            echo "  stop  - Stop test services"
            echo "  run   - Start services, run migrations, and execute tests (default)"
            echo "  clean - Stop services and clean up Docker volumes"
            exit 1
            ;;
    esac
}

main "$@"
