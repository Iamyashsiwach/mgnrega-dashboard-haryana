#!/bin/bash

# Local Testing Script for MGNREGA Dashboard
# Tests the application locally before deployment

set -e

echo "🧪 Testing MGNREGA Dashboard Locally"
echo "====================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running"
    exit 1
fi

print_success "Docker is running"

# Build and start services
print_info "Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
print_info "Waiting for services to start..."
sleep 15

# Check PostgreSQL
print_info "Checking PostgreSQL..."
if docker-compose exec -T postgres pg_isready -U mgnrega > /dev/null 2>&1; then
    print_success "PostgreSQL is ready"
else
    print_error "PostgreSQL is not ready"
    docker-compose logs postgres
    exit 1
fi

# Run migrations
print_info "Running database migrations..."
docker-compose exec -T app npx prisma migrate deploy
docker-compose exec -T app npx prisma generate
print_success "Migrations completed"

# Seed districts
print_info "Seeding districts..."
docker-compose exec -T app npx tsx scripts/seed-districts.ts || print_info "Districts may already be seeded"

# Test health endpoint
print_info "Testing health endpoint..."
sleep 5
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health || echo "failed")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    print_success "Health check passed"
else
    print_error "Health check failed"
    echo "Response: $HEALTH_RESPONSE"
fi

# Test districts API
print_info "Testing districts API..."
DISTRICTS_RESPONSE=$(curl -s http://localhost:3000/api/districts || echo "failed")
if echo "$DISTRICTS_RESPONSE" | grep -q "success"; then
    print_success "Districts API works"
else
    print_error "Districts API failed"
fi

# Test specific district
print_info "Testing district detail API..."
DISTRICT_RESPONSE=$(curl -s http://localhost:3000/api/district/1210 || echo "failed")
if echo "$DISTRICT_RESPONSE" | grep -q "success"; then
    print_success "District detail API works"
else
    print_error "District detail API failed"
fi

# Sync mock data
print_info "Testing data sync with mock data..."
SYNC_RESPONSE=$(curl -s -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type":"current","useMockData":true}')
if echo "$SYNC_RESPONSE" | grep -q "success"; then
    print_success "Mock data sync works"
else
    print_error "Mock data sync failed"
    echo "Response: $SYNC_RESPONSE"
fi

# Show container status
echo ""
print_info "Container Status:"
docker-compose ps

# Show logs
echo ""
print_info "Recent logs:"
docker-compose logs --tail=20 app

echo ""
print_success "Local testing completed!"
echo ""
print_info "Access your application at:"
echo "  http://localhost:3000"
echo ""
print_info "Useful commands:"
echo "  docker-compose logs -f     # View logs"
echo "  docker-compose down        # Stop services"
echo "  docker-compose restart     # Restart services"
