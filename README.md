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

## 📁 Project Structure

```
urbanform-pro/
├── 📂 public/                    # Static assets
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
│
├── 📂 src/                       # Frontend source
│   ├── 📂 components/           # React components
│   │   ├── ReportPreview.jsx   # PDF report modal
│   │   └── ...
│   │
│   ├── 📂 services/             # Business logic
│   │   ├── mapService.js       # Map operations
│   │   ├── mlServiceBackend.js # ML API integration
│   │   ├── pdfService.js       # Report generation
│   │   ├── procedural3DService.js  # 3D model generation
│   │   ├── trafficService.js   # Traffic analysis
│   │   └── geoapifyService.js  # Geocoding
│   │
│   ├── 📂 config/               # Configuration
│   │   └── cities.js           # City definitions
│   │
│   ├── 📂 constants/            # Constants
│   │   └── zoningTypes.js      # Zoning categories
│   │
│   ├── 📂 data/                 # Static data
│   │   └── sample_buildings.geojson
│   │
│   ├── 📂 hooks/                # Custom React hooks
│   │   └── useMap.js
│   │
│   ├── 📂 utils/                # Utility functions
│   │   ├── calculations.js     # FAR, area calculations
│   │   ├── formatters.js       # Data formatting
│   │   └── validators.js       # Input validation
│   │
│   ├── App.jsx                  # Main application
│   ├── index.js                 # Entry point
│   └── index.css                # Global styles
│
├── 📂 backend/                   # Python backend
│   ├── 📂 api/                  # API routes
│   │   ├── __init__.py
│   │   ├── documents.py        # Document endpoints
│   │   ├── zoning.py          # Zoning analysis
│   │   └── reports.py         # Report generation
│   │
│   ├── 📂 services/             # Backend services
│   │   ├── ml_service.py      # ML models
│   │   ├── pdf_parser.py      # Document parsing
│   │   └── zone_classifier.py # Zone classification
│   │
│   ├── 📂 models/               # Data models
│   │   ├── document.py
│   │   ├── zone.py
│   │   └── regulation.py
│   │
│   ├── 📂 data/                 # Backend data
│   │   └── uploaded_docs/      # Uploaded documents
│   │
│   ├── app.py                   # Flask application
│   ├── config.py               # Backend config
│   └── requirements.txt        # Python dependencies
│
├── 📂 build/                     # Production build (generated)
├── 📂 node_modules/             # npm packages (generated)
├── 📂 venv/                     # Python virtual env (generated)
│
├── .env                         # Environment variables (create from .env.example)
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── package.json                 # npm configuration
├── tailwind.config.js          # Tailwind CSS config
├── postcss.config.js           # PostCSS config
└── README.md                    # This file
```

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

## 📦 Deployment

### **Production Build**

#### Frontend
```bash
npm run build
```
Generates optimized production build in `build/` directory.

#### Backend
```bash
cd backend
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### **Docker Deployment**

Create `Dockerfile`:
```dockerfile
FROM node:16-alpine as frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build

FROM python:3.9-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=frontend /app/build /app/static
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

Build and run:
```bash
docker build -t urbanform-pro .
docker run -p 5000:5000 urbanform-pro
```

### **Cloud Deployment Options**

- **Vercel/Netlify** - Frontend (React)
- **Heroku/Railway** - Backend (Python)
- **AWS/GCP/Azure** - Full stack
- **DigitalOcean** - Droplet deployment

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
