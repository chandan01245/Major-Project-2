# Makefile for UrbanForm Pro Docker Operations
# Usage: make <target>
# Example: make up, make down, make logs, etc.

.PHONY: help up down build rebuild restart logs logs-backend logs-frontend clean clean-all ps health

# Default target
help:
	@echo "UrbanForm Pro - Docker Commands"
	@echo "================================"
	@echo ""
	@echo "Setup:"
	@echo "  make env          - Create .env file from template"
	@echo "  make build        - Build Docker images"
	@echo ""
	@echo "Running:"
	@echo "  make up           - Start all services (detached)"
	@echo "  make up-logs      - Start all services with logs"
	@echo "  make down         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make rebuild      - Rebuild and restart services"
	@echo ""
	@echo "Monitoring:"
	@echo "  make logs         - View logs from all services"
	@echo "  make logs-backend - View backend logs"
	@echo "  make logs-frontend- View frontend logs"
	@echo "  make ps           - List running containers"
	@echo "  make health       - Check service health"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Stop services and remove containers"
	@echo "  make clean-all    - Remove everything including volumes"
	@echo "  make prune        - Clean up Docker system"
	@echo ""

# Setup
env:
	@if not exist .env ( \
		copy .env.example .env && \
		echo .env file created. Please edit it and add your MAPTILER_KEY \
	) else ( \
		echo .env file already exists \
	)

# Build images
build:
	docker-compose build

# Start services (detached)
up:
	docker-compose up -d
	@echo ""
	@echo "Services started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:5000/api"
	@echo ""
	@echo "Run 'make logs' to view logs"

# Start services with logs
up-logs:
	docker-compose up

# Stop services
down:
	docker-compose down

# Rebuild and restart
rebuild:
	docker-compose up --build -d
	@echo "Services rebuilt and restarted"

# Restart services
restart:
	docker-compose restart
	@echo "Services restarted"

# View logs
logs:
	docker-compose logs -f

# View backend logs
logs-backend:
	docker-compose logs -f backend

# View frontend logs
logs-frontend:
	docker-compose logs -f frontend

# List containers
ps:
	docker-compose ps

# Check health
health:
	@echo "Checking backend health..."
	@curl -f http://localhost:5000/api/health || echo "Backend not responding"
	@echo ""
	@echo "Checking frontend..."
	@curl -f http://localhost:3000 > nul || echo "Frontend not responding"

# Clean up (remove containers)
clean:
	docker-compose down
	@echo "Containers removed"

# Clean up everything (including volumes)
clean-all:
	docker-compose down -v
	@echo "Containers and volumes removed"

# Prune Docker system
prune:
	docker system prune -f
	@echo "Docker system pruned"

# Execute shell in backend container
shell-backend:
	docker-compose exec backend bash

# Execute shell in frontend container
shell-frontend:
	docker-compose exec frontend sh

# Install backend Python package
pip-install:
	@set /p package="Enter package name: " && \
	docker-compose exec backend pip install %package%

# Show service status
status:
	@echo "=== Docker Compose Status ==="
	@docker-compose ps
	@echo ""
	@echo "=== Container Stats ==="
	@docker stats --no-stream
