# 🏙️ UrbanForm Pro - AI-Powered Urban Planning Platform

**Next-generation urban planning platform with ML-powered zoning analysis, 3D visualization, and automated compliance reporting**

[![Version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/yourusername/urbanform-pro)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2-61dafb)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.9-blue)](https://python.org/)

> Transform urban planning with AI-driven insights, procedurally generated 3D models, and real-time regulatory compliance checks.

---

## 🌟 Key Features

### **🤖 AI-Powered Analysis**
- 🧠 **ML-Based Zoning Classification** - Automated zone type detection
- 📄 **Document Intelligence** - Extract regulations from PDFs and documents
- 🔍 **Smart Recommendations** - AI-suggested building configurations
- 📊 **Predictive Analytics** - Traffic impact and development forecasting

### **🏗️ 3D Visualization**
- 🎨 **Procedural Building Generation** - Auto-generate 3D building models based on zoning
- 🌳 **Landscape Elements** - Trees, green spaces, and urban features
- 🎥 **Cinematic Views** - 60° pitch camera with smooth animations
- 🎯 **Height-Accurate Models** - Buildings respect FAR and height regulations
- 🌍 **Multiple Map Styles** - Streets, Satellite, Outdoor terrain

### **✏️ Interactive Drawing & Planning**
- ✍️ **Parcel Drawing Tool** - Draw custom parcels directly on map
- 📐 **Real-time Area Calculation** - Instant square meter measurements
- 🏞️ **Park Detection** - Warns when drawing over protected green zones
- 🎯 **Zone Overlays** - Toggle between markers and polygon overlays

### **📋 Automated Reporting**
- 📝 **Instant PDF Generation** - Professional compliance reports
- 📊 **Regulatory Analysis** - FAR, height, setback, parking calculations
- 🚗 **Traffic Impact Assessment** - Trip generation and congestion analysis
- ⚖️ **Compliance Checking** - Automated zoning regulation validation

### **🌍 Multi-City Support**
- 🇮🇳 **Indian Cities**: Bangalore, Mumbai, Delhi, Pune, Chennai, Hyderabad
- 🌏 **Global Cities**: Singapore, Dubai, London, New York
- 📍 **70+ Districts** mapped with real property values
- 🔄 **Extensible Architecture** - Easy to add new cities

### **📱 Modern User Experience**
- 🎨 **Beautiful UI** - Tailwind CSS with smooth animations
- 🌓 **Loading States** - Professional buffering indicators for all operations
- 🔔 **Smart Notifications** - Contextual alerts and warnings
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Prerequisites
- **Node.js** v16+ and npm/yarn
- **Python** 3.9+ (for backend ML services)
- **MapTiler API Key** (free tier: 100,000 map loads/month)

### Installation

#### 1️⃣ **Clone the Repository**
```bash
git clone https://github.com/YOUR_USERNAME/urbanform-pro.git
cd urbanform-pro
```

#### 2️⃣ **Frontend Setup**
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

Edit `.env` and configure:
```env
REACT_APP_MAPTILER_KEY=your_maptiler_api_key_here
REACT_APP_API_URL=http://localhost:5000/api
```

**Get MapTiler API Key:**
- Sign up at [maptiler.com](https://www.maptiler.com/cloud/)
- Navigate to [Account → Keys](https://cloud.maptiler.com/account/keys/)
- Copy your API key (free tier available)

#### 3️⃣ **Backend Setup (Python)**
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend server
python app.py
```

Backend will start on `http://localhost:5000`

#### 4️⃣ **Start Development**
```bash
# In project root (separate terminal)
npm start
```

Visit **[http://localhost:3000](http://localhost:3000)** 🎉

---

## 📖 User Guide

### **Basic Workflow**

1. **🌍 Select a City** - Choose from world map or dropdown
2. **📄 Upload Regulations** (Optional) - Upload zoning PDFs for ML analysis
3. **✏️ Draw Parcel** - Use pencil tool to draw on map
4. **🏗️ View 3D Model** - Automatic 3D building generation based on zoning
5. **📊 Generate Report** - Click button to create compliance report
6. **💾 Download PDF** - Export professional report

### **Key Controls**

| Action | Control |
|--------|---------|
| **Draw Parcel** | Click Pencil icon → Draw polygon → Double-click to finish |
| **3D View** | Automatically activates after drawing |
| **Pan Map** | Click & drag |
| **Rotate 3D** | Ctrl + drag (or right-click + drag) |
| **Zoom** | Mouse wheel or +/- buttons |
| **Delete Drawing** | Trash icon or Cancel button |

---

## 🏙️ Bangalore Coverage

### 8 BBMP Zones with Full Data

| Zone | Areas Covered | Primary Use |
|------|---------------|-------------|
| **Bommanahalli** | HSR Layout, Koramangala, BTM, E-City, etc. | Residential/Tech |
| **East** | Indiranagar, Whitefield, Marathahalli, etc. | Mixed/Commercial |
| **West** | Rajajinagar, Malleshwaram, Yeshwanthpur, etc. | Residential |
| **South** | Jayanagar, Basavanagudi, JP Nagar, etc. | Residential |
| **Mahadevapura** | Bellandur, Varthur, HAL, etc. | Tech/Residential |
| **Dasarahalli** | Peenya, Hebbal, Jalahalli, etc. | Industrial/Mixed |
| **Yelahanka** | Yelahanka, Jakkur, Thanisandra, etc. | Residential |
| **RR Nagar** | Kengeri, Vijayanagar, Nagarbhavi, etc. | Residential |

**Total: 70+ localities with complete zoning data**

## 📊 Zoning Categories

### 4 Primary Zone Types

1. **🏠 Residential**
   - FAR: 1.5 - 2.5
   - Max Height: 15m - 45m
   - Use: Apartments, housing complexes

2. **🏢 Commercial** 
   - FAR: 2.5 - 3.5
   - Max Height: 45m - 60m
   - Use: Offices, retail, business parks

3. **🏭 Industrial**
   - FAR: 1.5 - 2.0
   - Max Height: 15m - 30m
   - Use: Manufacturing, warehouses

4. **🏗️ Mixed Use**
   - FAR: 2.0 - 3.0
   - Max Height: 30m - 50m
   - Use: Combined residential/commercial

## 🛠️ Technology Stack

### **Frontend**
- ⚛️ **React 18** - Modern UI framework
- 🗺️ **MapTiler SDK** - Advanced mapping with 3D terrain
- 🎨 **Tailwind CSS** - Utility-first styling
- 🎯 **Mapbox GL Draw** - Interactive drawing tools
- 📊 **Recharts** - Data visualization
- 🌍 **Turf.js** - Geospatial analysis
- 🎨 **Lucide Icons** - Beautiful icon library

### **Backend**
- 🐍 **Python 3.9+** - Core backend
- 🤖 **Flask** - REST API framework
- 📄 **PyPDF2** - Document parsing
- 🧠 **scikit-learn** - ML classification
- 📊 **pandas** - Data processing
- 🔍 **spaCy** - NLP for document analysis

### **Build & Development**
- 📦 **Create React App** - Zero-config setup
- 🔧 **PostCSS** - CSS processing
- ⚡ **Webpack** - Module bundling
- 🔄 **Hot Module Replacement** - Fast development

---

## 📁 Project Structure (Production-Ready Architecture)

```
urbanform-pro/
├── 📂 public/                          # Static assets (served by CDN in prod)
│   ├── index.html                     # HTML template
│   ├── favicon.ico                    # Site icon
│   ├── manifest.json                  # PWA manifest
│   ├── robots.txt                     # SEO crawler rules
│   └── images/                        # Static images
│
├── 📂 src/                            # Frontend source (React 18)
│   ├── 📂 components/                # Reusable React components
│   │   ├── ReportPreview.jsx        # PDF report modal with download
│   │   ├── Loading.jsx              # Loading indicators
│   │   └── common/                  # Shared UI components
│   │
│   ├── 📂 services/                  # Business logic layer
│   │   ├── mapService.js            # MapTiler SDK operations
│   │   ├── mlServiceBackend.js      # ML API client (Backend integration)
│   │   ├── pdfService.js            # jsPDF report generation
│   │   ├── building3DService.js     # 3D building placement & rendering
│   │   ├── trafficService.js        # ITE trip generation calculations
│   │   └── geoapifyService.js       # Geocoding & place search
│   │
│   ├── 📂 config/                    # Configuration files
│   │   ├── cities.js                # 10+ city definitions with zones
│   │   └── map.config.js            # Map initialization config
│   │
│   ├── 📂 constants/                 # Application constants
│   │   └── zoningTypes.js           # Zoning categories & regulations
│   │
│   ├── 📂 data/                      # Static GeoJSON data
│   │   └── sample_buildings.geojson # Building footprints
│   │
│   ├── 📂 hooks/                     # Custom React hooks
│   │   ├── useMap.js                # Map lifecycle management
│   │   └── useDebounce.js           # Search debouncing
│   │
│   ├── 📂 utils/                     # Utility functions
│   │   ├── calculations.js          # FAR, FSI, area calculations
│   │   ├── formatters.js            # Number & date formatting
│   │   └── validators.js            # Input validation helpers
│   │
│   ├── App.jsx                       # Main application component
│   ├── index.js                      # React entry point
│   └── index.css                     # Global styles (Tailwind)
│
├── 📂 backend/                        # Python Flask backend
│   ├── 📂 data/                      # Data storage
│   │   ├── uploaded_docs/           # User-uploaded PDFs (gitignored)
│   │   ├── sample_buildings/        # 3D building models (.obj, .glb)
│   │   └── training_data/           # ML training datasets
│   │
│   ├── 📂 models/                    # ML models (gitignored)
│   │   ├── zone_classifier.pkl      # Scikit-learn classifier
│   │   └── regulation_extractor/    # NLP model files
│   │
│   ├── 📂 uploads/                   # Temporary upload directory
│   ├── 📂 zoning-documents/          # Zoning regulation PDFs
│   │
│   ├── app.py                        # Flask application & API routes
│   ├── document_processor.py         # PDF parsing with PyPDF2
│   ├── zoning_ml_model.py           # ML classification logic
│   ├── amenities_service.py         # Overpass API amenities finder
│   ├── aqi_model.py                 # Air quality predictions
│   ├── requirements.txt             # Python dependencies
│   └── README.md                    # Backend documentation
│
├── 📂 build/                          # Production build (gitignored)
│   └── static/                       # Optimized JS/CSS bundles
│
├── 📂 node_modules/                   # npm dependencies (gitignored)
├── 📂 venv/                          # Python virtual env (gitignored)
│
├── 📂 .github/                        # GitHub Actions CI/CD
│   └── workflows/
│       ├── deploy.yml               # Production deployment
│       └── test.yml                 # Automated testing
│
├── 📂 docs/                           # Documentation
│   ├── API.md                       # API documentation
│   ├── ARCHITECTURE.md              # System architecture
│   └── DEPLOYMENT.md                # Deployment guide
│
├── .env                              # Environment variables (gitignored)
├── .env.example                      # Environment template
├── .gitignore                        # Git ignore rules (comprehensive)
├── .eslintrc.json                    # ESLint configuration
├── package.json                      # npm configuration & scripts
├── package-lock.json                 # Locked dependencies
├── tailwind.config.js                # Tailwind CSS configuration
├── postcss.config.js                 # PostCSS configuration
├── vercel.json                       # Vercel deployment config
├── netlify.toml                      # Netlify deployment config
├── Dockerfile                        # Docker containerization
├── docker-compose.yml                # Local Docker setup
├── CHANGES_SUMMARY.md                # Change log
├── QUICK_FIXES.md                    # Quick fix documentation
└── README.md                         # This file (main documentation)
```

### **Key Architecture Decisions**

1. **Service Layer Pattern**: All business logic isolated in `services/` for testability
2. **Environment-based Config**: `.env` for secrets, config files for app settings
3. **Stateless Backend**: Flask API can scale horizontally
4. **CDN-First Frontend**: React build optimized for edge delivery
5. **Modular Components**: Each component has single responsibility
6. **Type Safety**: PropTypes validation in production build

---

## 🔧 Configuration

### **Environment Variables**

Create `.env` file with the following:

```env
# MapTiler Configuration
REACT_APP_MAPTILER_KEY=your_maptiler_api_key

# Backend API
REACT_APP_API_URL=http://localhost:5000/api

# Feature Flags
REACT_APP_ENABLE_3D=true
REACT_APP_ENABLE_ML=true

# Analytics (optional)
REACT_APP_GA_TRACKING_ID=your_ga_id
```

### **Backend Configuration**

Edit `backend/config.py`:

```python
# Flask configuration
DEBUG = True
PORT = 5000
HOST = '0.0.0.0'

# Upload settings
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
UPLOAD_FOLDER = 'data/uploaded_docs'

# ML Model settings
MODEL_PATH = 'models/zone_classifier.pkl'
```

---

## 🧪 Testing

### **Frontend Tests**
```bash
npm test                 # Run tests
npm test -- --coverage   # With coverage
```

### **Backend Tests**
```bash
cd backend
pytest                   # Run all tests
pytest --cov             # With coverage
```

---

## 📦 Deployment & Production

### **Quick Deployment Guide**

#### Option 1: Vercel (Frontend) + Railway (Backend) ⭐ **Recommended**

**Frontend on Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Backend on Railway:**
1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect Python and deploy

**Environment Variables:**
- Vercel: Add `REACT_APP_MAPTILER_KEY` and `REACT_APP_API_URL` in dashboard
- Railway: Add `MAPTILER_KEY`, `PORT=5000`

#### Option 2: Netlify (Frontend) + Render (Backend)

**Frontend on Netlify:**
```bash
# Build command: npm run build
# Publish directory: build

# Deploy via CLI
npm install -g netlify-cli
netlify deploy --prod
```

**Backend on Render:**
1. Go to [render.com](https://render.com)
2. New → Web Service → Connect GitHub repo
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `gunicorn -w 4 -b 0.0.0.0:$PORT app:app`

#### Option 3: Docker Deployment (Full Stack)

**Create `Dockerfile`:**
```dockerfile
# Multi-stage build for optimized image

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

# Stage 2: Python backend with built frontend
FROM python:3.9-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy backend files
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY backend/ ./

# Copy built frontend
COPY --from=frontend-build /app/build ./static

# Create necessary directories
RUN mkdir -p data/uploaded_docs zoning-documents uploads

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=5000

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5000/api/health')"

# Run with gunicorn
CMD ["gunicorn", "--workers=4", "--bind=0.0.0.0:5000", "--timeout=120", "app:app"]
```

**Create `docker-compose.yml`:**
```yaml
version: '3.8'

services:
  urbanform:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MAPTILER_KEY=${MAPTILER_KEY}
      - FLASK_ENV=production
    volumes:
      - ./backend/data:/app/data
      - ./backend/uploads:/app/uploads
      - ./backend/zoning-documents:/app/zoning-documents
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  data:
  uploads:
  documents:
```

**Deploy:**
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

#### Option 4: AWS Deployment (Scalable Production)

**Architecture:**
- **Frontend**: S3 + CloudFront CDN
- **Backend**: ECS Fargate or EC2
- **Database**: RDS PostgreSQL (if needed)
- **Storage**: S3 for documents

**Deploy Frontend to S3:**
```bash
# Build
npm run build

# Upload to S3
aws s3 sync build/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

**Deploy Backend to ECS:**
```bash
# Build and push Docker image
docker build -t urbanform-backend .
docker tag urbanform-backend:latest YOUR_ECR_REPO:latest
docker push YOUR_ECR_REPO:latest

# Create ECS task definition and service via AWS Console or Terraform
```

### **Production Optimizations**

#### Frontend Performance
```javascript
// Add to package.json build scripts
"build": "GENERATE_SOURCEMAP=false react-scripts build",
"build:analyze": "npm run build && npx source-map-explorer 'build/static/js/*.js'"
```

#### Backend Scaling
```python
# Use Redis for caching
from flask_caching import Cache
cache = Cache(config={'CACHE_TYPE': 'redis', 'CACHE_REDIS_URL': 'redis://localhost:6379/0'})

# Add rate limiting
from flask_limiter import Limiter
limiter = Limiter(app, key_func=lambda: request.remote_addr)

@app.route('/api/predict-zoning', methods=['POST'])
@limiter.limit("10 per minute")
def predict_zoning():
    # ... endpoint logic
```

#### Database for Scale
```bash
# Migrate to PostgreSQL for production
pip install psycopg2-binary sqlalchemy

# Update config
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/urbanform')
```

### **Monitoring & Logging**

**Add Sentry for Error Tracking:**
```bash
npm install @sentry/react
pip install sentry-sdk[flask]
```

```javascript
// src/index.js
import * as Sentry from "@sentry/react";
Sentry.init({ dsn: process.env.REACT_APP_SENTRY_DSN });
```

```python
# backend/app.py
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(dsn=os.getenv('SENTRY_DSN'), integrations=[FlaskIntegration()])
```

**Add Analytics:**
```javascript
// Google Analytics
npm install react-ga4

// src/index.js
import ReactGA from 'react-ga4';
ReactGA.initialize('G-XXXXXXXXXX');
```

### **CI/CD Pipeline**

**GitHub Actions Workflow** (`.github/workflows/deploy.yml`):
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      
  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          
  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: "urbanform-backend"
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
          appdir: "backend"
```

### **Security Checklist for Production**

- [ ] ✅ Use HTTPS only (enable SSL certificates)
- [ ] ✅ Set secure CORS policies
- [ ] ✅ Enable rate limiting on APIs
- [ ] ✅ Sanitize all user inputs
- [ ] ✅ Use environment variables for secrets
- [ ] ✅ Enable CSP (Content Security Policy)
- [ ] ✅ Regular security audits (`npm audit`, `safety check`)
- [ ] ✅ Implement authentication if needed
- [ ] ✅ Enable logging and monitoring
- [ ] ✅ Regular backups of uploaded documents

### **Performance Targets**

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.5s | Lighthouse |
| API Response Time | < 200ms | Backend monitoring |
| Uptime | > 99.9% | UptimeRobot |

### **Scaling Strategy**

**Phase 1: Single Server (0-1K users)**
- Vercel/Netlify frontend
- Railway/Render backend
- ~$20/month

**Phase 2: Horizontal Scaling (1K-10K users)**
- CDN for static assets
- Load balancer for backend
- Redis caching layer
- ~$100/month

**Phase 3: Microservices (10K+ users)**
- Separate ML service
- Document processing queue (Celery)
- PostgreSQL with read replicas
- Kubernetes orchestration
- ~$500+/month

---

## 🐛 Troubleshooting

### **Common Issues**

**Issue: Map not loading**
```bash
# Check MapTiler API key
echo $REACT_APP_MAPTILER_KEY

# Verify in browser console
# Should not show CORS errors
```

**Issue: Backend not connecting**
```bash
# Check backend is running
curl http://localhost:5000/api/health

# Verify REACT_APP_API_URL matches backend
```

**Issue: 3D buildings not showing**
- Zoom to level 14+ (buildings only show when close)
- Check browser console for errors
- Ensure pitch is set (60°) - happens automatically after drawing

**Issue: Documents not uploading**
- Check file size < 16MB
- Verify file format is PDF/DOC/TXT
- Check backend logs for parsing errors

---

## 📈 Roadmap

### **Version 2.1** (Q1 2025)
- [ ] 🌍 Expand to 20+ global cities
- [ ] 👥 User authentication and saved projects
- [ ] 🔄 Real-time collaboration features
- [ ] 📱 Progressive Web App (PWA)

### **Version 2.2** (Q2 2025)
- [ ] 🤖 Advanced AI recommendations
- [ ] 📊 Historical data & trend analysis
- [ ] 🚇 Public transit integration
- [ ] 🌦️ Climate impact assessment

### **Version 3.0** (Q3 2025)
- [ ] 🎮 VR/AR visualization
- [ ] 🔌 Third-party API integration
- [ ] 📡 IoT sensor data integration
- [ ] 🏗️ Construction phase simulation

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

### **Development Workflow**

1. **Fork & Clone**
```bash
git clone https://github.com/YOUR_USERNAME/urbanform-pro.git
cd urbanform-pro
git remote add upstream https://github.com/ORIGINAL/urbanform-pro.git
```

2. **Create Feature Branch**
```bash
git checkout -b feature/amazing-feature
```

3. **Make Changes**
- Follow code style guidelines
- Add tests for new features
- Update documentation

4. **Commit with Convention**
```bash
git commit -m "feat: add amazing feature"
# Types: feat, fix, docs, style, refactor, test, chore
```

5. **Push & Create PR**
```bash
git push origin feature/amazing-feature
```
Then create Pull Request on GitHub

### **Code Style**

- **JavaScript**: Use ESLint configuration
- **Python**: Follow PEP 8
- **Commits**: Follow Conventional Commits
- **Documentation**: Update README for new features

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[MapTiler](https://www.maptiler.com)** - Exceptional mapping services
- **[OpenStreetMap](https://www.openstreetmap.org)** - Community-driven map data
- **NBC 2016** - National Building Code regulations
- **BBMP** - Bangalore zoning data
- **Urban planning community** - Invaluable feedback

---

## 📞 Support & Contact

- 📧 **Email**: support@urbanform.pro
- 💬 **Discord**: [Join our community](https://discord.gg/urbanform)
- 🐛 **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/urbanform-pro/issues)
- 📖 **Docs**: [Full Documentation](https://docs.urbanform.pro)

---

## ⭐ Star History

If you find this project useful, please consider giving it a star! ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=YOUR_USERNAME/urbanform-pro&type=Date)](https://star-history.com/#YOUR_USERNAME/urbanform-pro&Date)

---

**Made with ❤️ by urban planners, for urban planners**
