# 🐳 Docker Deployment Guide

This guide explains how to run **UrbanForm Pro** using Docker and Docker Compose for easy deployment and development.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (version 20.10 or higher)
  - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/) for Windows/Mac
  - For Linux: Follow [official Docker installation guide](https://docs.docker.com/engine/install/)
- **Docker Compose** (version 2.0 or higher - included with Docker Desktop)
- **MapTiler API Key** (free tier available)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/urbanform-pro.git
cd urbanform-pro
```

### 2. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and add your MapTiler API key:

```env
MAPTILER_KEY=your_actual_maptiler_api_key_here
```

**Get your MapTiler API Key:**
1. Sign up at [maptiler.com](https://www.maptiler.com/cloud/)
2. Navigate to [Account → Keys](https://cloud.maptiler.com/account/keys/)
3. Copy your API key (free tier: 100,000 map loads/month)

### 3. Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

### 4. Access the Application

Once the containers are running:

- **Frontend (React App)**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

## 🛠️ Docker Commands

### Basic Operations

```bash
# Start services (after initial build)
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (clears all data)
docker-compose down -v

# Rebuild containers
docker-compose up --build

# View logs
docker-compose logs

# View logs for specific service
docker-compose logs backend
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f

# Restart a specific service
docker-compose restart backend
```

### Development Operations

```bash
# Rebuild only backend
docker-compose build backend

# Rebuild only frontend
docker-compose build frontend

# Execute commands in running container
docker-compose exec backend bash
docker-compose exec frontend sh

# Check service status
docker-compose ps

# View resource usage
docker stats
```

## 📁 Project Structure

```
urbanform-pro/
├── docker-compose.yml          # Multi-container orchestration
├── Dockerfile                  # Frontend build configuration
├── nginx.conf                  # Nginx configuration for frontend
├── .env                        # Environment variables (create from .env.example)
├── .env.example               # Template for environment variables
├── .dockerignore              # Files to exclude from frontend build
├── backend/
│   ├── Dockerfile             # Backend build configuration
│   ├── requirements.txt       # Python dependencies
│   ├── .dockerignore          # Files to exclude from backend build
│   ├── app.py                 # Flask application entry point
│   ├── zoning-documents/      # Persisted uploaded documents
│   ├── models/                # Persisted ML models
│   └── data/                  # Application data
└── src/                       # React source code
```

## 🔧 Configuration Details

### Backend Service

- **Base Image**: Python 3.9-slim
- **Port**: 5000
- **Server**: Gunicorn with 4 workers
- **Volumes**:
  - `./backend/zoning-documents` - Uploaded zoning documents
  - `./backend/models` - Trained ML models
  - `./backend/data` - Application data
  - `backend-uploads` - Temporary upload directory

### Frontend Service

- **Base Image**: Node 18-alpine (builder) + Nginx alpine (runtime)
- **Port**: 3000 (mapped to Nginx port 80)
- **Build**: Multi-stage build for optimized production image
- **Server**: Nginx with optimized configuration

### Networking

Both services run on a custom bridge network (`urbanform-network`) allowing:
- Service-to-service communication via service names
- Nginx can proxy API requests to `backend:5000`
- Isolated from other Docker networks

## 🔍 Health Checks

Both services include health checks:

**Backend Health Check:**
- Endpoint: `http://backend:5000/api/health`
- Interval: Every 30 seconds
- Timeout: 10 seconds
- Start period: 40 seconds (allows for initialization)

**Frontend Health Check:**
- Checks if Nginx is serving content
- Interval: Every 30 seconds
- Timeout: 10 seconds

## 📦 Persistent Data

The following directories are persisted using Docker volumes:

- `backend/zoning-documents/` - Uploaded zoning regulation documents
- `backend/models/` - Trained machine learning models
- `backend/data/` - Application data (JSON files)

**To reset all data:**
```bash
docker-compose down -v
rm -rf backend/zoning-documents/* backend/models/*
```

## 🐛 Troubleshooting

### Port Already in Use

If ports 3000 or 5000 are already in use:

```bash
# Check what's using the port (Windows)
netstat -ano | findstr :3000

# Edit docker-compose.yml and change port mappings:
ports:
  - "8080:80"  # Frontend on port 8080
  - "5001:5000"  # Backend on port 5001
```

### Backend Health Check Failing

```bash
# Check backend logs
docker-compose logs backend

# Test health endpoint manually
docker-compose exec backend curl http://localhost:5000/api/health

# Restart backend service
docker-compose restart backend
```

### Frontend Not Loading

```bash
# Check frontend logs
docker-compose logs frontend

# Verify nginx configuration
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Check if environment variables are set
docker-compose exec frontend env | grep REACT_APP
```

### Python Dependencies Issues

```bash
# Rebuild backend without cache
docker-compose build --no-cache backend

# Check installed packages
docker-compose exec backend pip list
```

### MapTiler API Key Issues

```bash
# Verify environment variable is set
docker-compose exec backend env | grep MAPTILER

# Check if API key is valid (should return 200)
curl "https://api.maptiler.com/geocoding/bangalore.json?key=YOUR_KEY"
```

## 🔄 Updating the Application

### Pull Latest Changes

```bash
# Stop services
docker-compose down

# Pull latest code
git pull

# Rebuild and restart
docker-compose up --build
```

### Update Dependencies

**Frontend:**
```bash
# Update package.json locally
npm update

# Rebuild container
docker-compose build frontend
```

**Backend:**
```bash
# Update requirements.txt
# Then rebuild container
docker-compose build backend
```

## 🌐 Production Deployment

For production deployment, consider:

1. **Use a reverse proxy** (Nginx/Traefik) with SSL/TLS
2. **Set proper environment**:
   ```yaml
   environment:
     - FLASK_ENV=production
     - NODE_ENV=production
   ```
3. **Configure resource limits**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 2G
   ```
4. **Use Docker secrets** for sensitive data instead of .env
5. **Set up monitoring and logging** (Prometheus, Grafana, ELK)
6. **Configure backup strategy** for volumes
7. **Use container orchestration** (Kubernetes, Docker Swarm) for scaling

### Production Docker Compose Example

```yaml
services:
  backend:
    restart: always
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 2G
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 📊 Monitoring

### View Container Stats

```bash
# Real-time resource usage
docker stats

# Check disk usage
docker system df
```

### Access Container Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## 🧹 Cleanup

### Remove Stopped Containers

```bash
docker-compose down
```

### Remove Everything (including volumes)

```bash
docker-compose down -v
docker system prune -a --volumes
```

### Free Up Disk Space

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a --volumes
```

## ❓ Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Container won't start | Check logs: `docker-compose logs [service]` |
| Out of disk space | Run `docker system prune -a` |
| Port conflicts | Change port mapping in docker-compose.yml |
| Slow build times | Use `--parallel` flag: `docker-compose up --build --parallel` |
| Changes not reflected | Rebuild: `docker-compose up --build --force-recreate` |
| Network issues | Restart Docker daemon |

## 📞 Support

- **Documentation**: See main README.md
- **Issues**: Create an issue on GitHub
- **Docker Docs**: [docs.docker.com](https://docs.docker.com/)

## 📝 License

Same as the main project (MIT License)
