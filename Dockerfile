# Multi-stage build for production deployment
# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app

# Copy frontend package files
COPY package*.json ./
RUN npm ci --production=false

# Copy frontend source
COPY public ./public
COPY src ./src
COPY tailwind.config.js postcss.config.js ./

# Build React app
RUN npm run build

# Stage 2: Python Backend with Built Frontend
FROM python:3.9-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend to serve from Flask
COPY --from=frontend-build /app/build ./static

# Create necessary directories
RUN mkdir -p data uploads zoning-documents models

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=5000 \
    FLASK_ENV=production

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Run with gunicorn
CMD ["gunicorn", "--workers=4", "--bind=0.0.0.0:5000", "--timeout=120", "--access-logfile=-", "--error-logfile=-", "app:app"]
