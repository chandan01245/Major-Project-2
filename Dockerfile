# Multi-stage build for production deployment
# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app

# Copy frontend package files
COPY package*.json ./
RUN npm install --production=false

# Accept build arguments for API keys
ARG REACT_APP_MAPTILER_KEY
ARG REACT_APP_GEOAPIFY_KEY

# Set as environment variables for build
ENV REACT_APP_MAPTILER_KEY=$REACT_APP_MAPTILER_KEY
ENV REACT_APP_GEOAPIFY_KEY=$REACT_APP_GEOAPIFY_KEY

# Copy frontend source
COPY public ./public
COPY src ./src
COPY tailwind.config.js postcss.config.js ./

# Build React app
RUN npm run build

# Stage 2: Serve Frontend with Nginx
FROM nginx:alpine AS frontend
WORKDIR /usr/share/nginx/html

# Remove default nginx config and static files
RUN rm -rf /etc/nginx/nginx.conf /usr/share/nginx/html/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built React app
COPY --from=frontend-build /app/build .

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Stage 3: Python Backend
FROM python:3.9-slim AS backend
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"

# Copy backend code
COPY backend/ ./

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
