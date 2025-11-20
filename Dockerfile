# Multi-stage build for optimized production image

# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Use npm install instead of npm ci since package-lock.json is not committed
RUN npm install

# Copy source files
COPY . .

# Build argument for environment variables
ARG REACT_APP_MAPTILER_KEY
ARG REACT_APP_API_URL=http://localhost:5000/api

# Set environment variables for build
ENV REACT_APP_MAPTILER_KEY=$REACT_APP_MAPTILER_KEY
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the application
RUN npm run build

# Stage 2: Serve the application with nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
