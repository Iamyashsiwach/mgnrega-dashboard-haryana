#!/bin/bash

# MGNREGA Dashboard - Azure Deployment Script
# This script automates the deployment process on Azure VM

set -e

echo "🚀 MGNREGA Dashboard - Azure Deployment Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if .env exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    print_info "Please create a .env file based on .env.example"
    exit 1
fi

print_success ".env file found"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    print_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    print_success "Docker installed"
    print_info "Please logout and login again, then run this script"
    exit 0
fi

print_success "Docker is installed"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    print_info "Installing Docker Compose..."
    sudo apt install docker-compose -y
    print_success "Docker Compose installed"
fi

print_success "Docker Compose is installed"

# Stop existing containers
print_info "Stopping existing containers..."
docker-compose down || true
print_success "Containers stopped"

# Pull latest changes (if using git)
if [ -d .git ]; then
    print_info "Pulling latest changes from git..."
    git pull origin main || git pull origin master || true
    print_success "Git pull completed"
fi

# Build Docker images
print_info "Building Docker images..."
docker-compose build --no-cache
print_success "Docker images built"

# Start services
print_info "Starting services..."
docker-compose up -d
print_success "Services started"

# Wait for PostgreSQL to be ready
print_info "Waiting for PostgreSQL to be ready..."
sleep 10

# Check if database is ready
MAX_TRIES=30
TRIES=0
until docker-compose exec -T postgres pg_isready -U mgnrega > /dev/null 2>&1 || [ $TRIES -eq $MAX_TRIES ]; do
    print_info "Waiting for PostgreSQL... ($TRIES/$MAX_TRIES)"
    sleep 2
    TRIES=$((TRIES+1))
done

if [ $TRIES -eq $MAX_TRIES ]; then
    print_error "PostgreSQL failed to start"
    exit 1
fi

print_success "PostgreSQL is ready"

# Run Prisma migrations
print_info "Running database migrations..."
docker-compose exec -T app npx prisma migrate deploy
docker-compose exec -T app npx prisma generate
print_success "Database migrations completed"

# Seed districts data
print_info "Seeding districts data..."
docker-compose exec -T app npx tsx scripts/seed-districts.ts || print_info "Districts already seeded or error occurred"
print_success "Districts seeded"

# Check application health
print_info "Checking application health..."
sleep 5

HEALTH_CHECK=$(curl -s http://localhost:3000/api/health || echo "failed")
if echo "$HEALTH_CHECK" | grep -q "healthy"; then
    print_success "Application is healthy!"
else
    print_error "Application health check failed"
    print_info "Check logs with: docker-compose logs -f app"
fi

# Show running containers
print_info "Running containers:"
docker-compose ps

# Show application URL
echo ""
print_success "Deployment completed successfully!"
echo ""
print_info "Application is running at:"
echo "  - Local: http://localhost:3000"
echo "  - Network: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
print_info "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop: docker-compose down"
echo "  - Restart: docker-compose restart"
echo "  - Database shell: docker-compose exec postgres psql -U mgnrega mgnrega_dashboard"
echo ""
print_info "To sync data from API:"
echo "  curl -X POST http://localhost:3000/api/sync -H 'Content-Type: application/json' -d '{\"type\":\"current\"}'"
echo ""
print_info "To setup SSL with Let's Encrypt:"
echo "  sudo apt install certbot python3-certbot-nginx -y"
echo "  sudo certbot --nginx -d yourdomain.com"
echo ""
print_success "Happy monitoring! 🎉"

