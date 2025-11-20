# 🚀 Docker Quick Reference

## 🎯 Get Started in 3 Steps

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env and add your MAPTILER_KEY

# 2. Start everything
docker-compose up --build

# 3. Open browser
# Frontend: http://localhost:3000
# Backend: http://localhost:5000/api
```

## 📋 Essential Commands

| Command | Description |
|---------|-------------|
| `docker-compose up` | Start services |
| `docker-compose up -d` | Start in background |
| `docker-compose down` | Stop services |
| `docker-compose logs -f` | View live logs |
| `docker-compose ps` | List containers |
| `docker-compose restart` | Restart services |
| `docker-compose up --build` | Rebuild and start |

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Find what's using the port (Windows)
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Or change ports in docker-compose.yml
ports:
  - "8080:80"    # Use 8080 instead of 3000
  - "5001:5000"  # Use 5001 instead of 5000
```

### View Specific Service Logs
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs -f backend  # Follow logs
```

### Restart a Single Service
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Enter a Container
```bash
docker-compose exec backend bash
docker-compose exec frontend sh
```

### Check Service Health
```bash
curl http://localhost:5000/api/health
curl http://localhost:3000
```

### Rebuild After Code Changes
```bash
# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Rebuild and restart
docker-compose up --build
```

### Clean Everything
```bash
# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a --volumes
```

## 📁 File Structure

```
urbanform-pro/
├── docker-compose.yml         # Main orchestration file
├── Dockerfile                 # Frontend Docker build
├── nginx.conf                 # Frontend server config
├── .env                       # Your environment variables
├── .dockerignore             # Files to exclude
├── docker-start.bat          # Windows quick start script
└── backend/
    ├── Dockerfile            # Backend Docker build
    ├── requirements.txt      # Python dependencies
    └── .dockerignore        # Backend exclusions
```

## 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | React application |
| Backend API | http://localhost:5000/api | Flask REST API |
| Health Check | http://localhost:5000/api/health | Backend status |

## 🐛 Common Issues

### Backend Won't Start
```bash
# Check logs
docker-compose logs backend

# Rebuild without cache
docker-compose build --no-cache backend

# Check if port is free
netstat -ano | findstr :5000
```

### Frontend Not Loading
```bash
# Check logs
docker-compose logs frontend

# Verify environment variables
docker-compose exec frontend env | grep REACT_APP

# Rebuild
docker-compose build --no-cache frontend
```

### Changes Not Reflected
```bash
# Force rebuild
docker-compose up --build --force-recreate

# Or rebuild specific service
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Database/Volume Issues
```bash
# Remove volumes and restart fresh
docker-compose down -v
docker-compose up --build
```

## 💡 Pro Tips

### Background Running
```bash
# Start in background
docker-compose up -d

# View logs later
docker-compose logs -f

# Stop when done
docker-compose down
```

### Resource Monitoring
```bash
# View container stats
docker stats

# View disk usage
docker system df
```

### Quick Restart
```bash
# Restart specific service
docker-compose restart backend

# Restart everything
docker-compose restart
```

### Development Workflow
```bash
# 1. Make code changes
# 2. Rebuild affected service
docker-compose build backend
# 3. Restart service
docker-compose up -d backend
# 4. Check logs
docker-compose logs -f backend
```

## 🔐 Environment Variables

Required in `.env`:
```env
MAPTILER_KEY=your_api_key_here
```

Get your free API key:
👉 https://www.maptiler.com/cloud/

## 📚 More Help

- **Full Docker Guide**: See `DOCKER.md`
- **Project README**: See `README.md`
- **Quick Start Script**: Run `docker-start.bat` (Windows)
- **Make Commands**: Run `make help` (if Make is installed)

## ✅ Health Check

```bash
# Check if everything is running
docker-compose ps

# Should show:
# urbanform-backend    running    0.0.0.0:5000->5000/tcp
# urbanform-frontend   running    0.0.0.0:3000->80/tcp

# Test backend
curl http://localhost:5000/api/health

# Test frontend
curl http://localhost:3000
```

## 🎉 You're All Set!

Your UrbanForm Pro application is now running in Docker!
Open http://localhost:3000 in your browser to get started.
