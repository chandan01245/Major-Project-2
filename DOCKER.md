# 🐳 Docker Quick Start Guide

## Prerequisites
- Docker Desktop installed and running
- Git repository cloned

## Quick Start

1. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```
   
2. **Edit `.env` and add your API keys:**
   - Get MapTiler API key from: https://www.maptiler.com/
   - Get WAQI API key from: https://aqicn.org/data-platform/token/

3. **Build and run:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Architecture

The application uses a **multi-service architecture**:

```
┌─────────────────────────────────────────────┐
│         Docker Network (bridge)             │
│                                             │
│  ┌──────────────┐      ┌─────────────────┐ │
│  │   Frontend   │      │     Backend     │ │
│  │  (Nginx:80)  │─────►│  (Flask:5000)   │ │
│  └──────────────┘      └─────────────────┘ │
│       ↑                        ↑            │
│   Port 3000                Port 5000        │
└─────────────────────────────────────────────┘
```

- **Frontend**: React SPA served by Nginx (port 3000 → 80)
- **Backend**: Flask API with ML models (port 5000)
- **Network**: Custom bridge network for service communication

## Available Commands

### Build and Start
```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# Build specific service
docker-compose build frontend
docker-compose build backend
```

### Stop and Clean
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Remove all unused containers and images
docker system prune -a
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Service Management
```bash
# Restart a service
docker-compose restart backend

# Rebuild without cache
docker-compose build --no-cache

# Scale services (if needed)
docker-compose up --scale backend=2
```

## Health Checks

Both services include health checks:
- **Frontend**: `http://localhost:3000/health`
- **Backend**: `http://localhost:5000/api/health`

Check status:
```bash
docker-compose ps
```

## Data Persistence

The following directories are mounted as volumes:
- `./backend/data` - Application data
- `./backend/zoning-documents` - Uploaded zoning documents
- `./backend/models` - Trained ML models

These persist across container restarts and rebuilds.

## Troubleshooting

### Port conflicts
If ports 3000 or 5000 are in use, modify `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Change 3000 to 8080
  - "5001:5000"  # Change 5000 to 5001
```

### Build issues
```bash
# Clear Docker cache
docker builder prune -a

# Rebuild from scratch
docker-compose build --no-cache --pull
```

### Container won't start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check if containers are running
docker ps -a
```

### Permission issues (Linux/macOS)
```bash
# Fix volume permissions
sudo chown -R $USER:$USER backend/data
sudo chown -R $USER:$USER backend/models
sudo chown -R $USER:$USER backend/zoning-documents
```

## Production Deployment

For production, consider:

1. **Use environment-specific configs:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Enable HTTPS with Let's Encrypt**
3. **Use Docker secrets for API keys**
4. **Set resource limits in docker-compose.yml**
5. **Configure logging drivers**
6. **Use orchestration (Kubernetes, Docker Swarm)**

## Development vs Production

This configuration is optimized for **production**. For development:
- Use volume mounts for hot-reload
- Expose debug ports
- Use development environment variables
- Consider docker-compose.dev.yml

## Need Help?

- Check logs: `docker-compose logs -f`
- Inspect containers: `docker-compose ps`
- Enter container shell: `docker-compose exec backend sh`
- View resource usage: `docker stats`
