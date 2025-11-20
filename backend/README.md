# Python ML Backend for Zoning Regulation Analysis

This is a Python-based Machine Learning backend that processes zoning regulation documents, trains ML models, and provides predictions for the GIS application.

## Features

- 📄 **Document Processing**: Extract zoning rules from PDF, DOCX, and TXT files
- 🤖 **ML Model Training**: Train Random Forest and Gradient Boosting models on regulation data
- 🎯 **Prediction API**: Predict zoning attributes for any location
- 📊 **Report Generation**: Generate comprehensive ML-powered reports
- 🔄 **Auto-fallback**: Frontend gracefully falls back to simulation if backend unavailable

## Setup Instructions

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Start the Backend Server

```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /api/health
```

### Upload Document
```
POST /api/upload-document
Content-Type: multipart/form-data
Body: file (PDF, DOCX, or TXT)
```

### Train Model
```
POST /api/train-model
```

### Predict Zoning
```
POST /api/predict-zoning
Content-Type: application/json
Body: {
  "polygon": [[lng, lat], ...],
  "nearby_areas": [...]
}
```

### Generate Report
```
POST /api/generate-report
Content-Type: application/json
Body: {
  "polygon": [[lng, lat], ...],
  "nearby_areas": [...]
}
```

### Get Documents
```
GET /api/documents
```

### Delete Document
```
DELETE /api/documents/{doc_id}
```

## Architecture

### Components

1. **app.py**: Flask REST API server
2. **zoning_ml_model.py**: ML model implementation (Random Forest + Gradient Boosting)
3. **document_processor.py**: NLP-based document processing

### ML Pipeline

1. **Document Upload** → Extract text from PDF/DOCX/TXT
2. **NLP Processing** → Extract structured zoning rules
3. **Feature Extraction** → Convert rules to ML features
4. **Model Training** → Train ensemble models
5. **Prediction** → Predict zoning for new locations
6. **Report Generation** → Generate comprehensive analysis

## Training the Model

1. Upload zoning regulation documents through the UI or API
2. The system automatically extracts rules from documents
3. Click "Train Model" or POST to `/api/train-model`
4. Model is saved to `models/zoning_model.pkl`

## Sample Zoning Document Format

For best results, upload documents with clear sections like:

```
Residential Zone R1:
- FAR: 1.5 to 2.0
- Max Height: 15 meters
- Ground Coverage: 40%
- Setback: 3 meters
- Parking: 1 space per 100 sqm

Commercial Zone C1:
- FAR: 2.5 to 3.5
- Max Height: 45 meters
- Ground Coverage: 60%
- Setback: 6 meters
- Parking: 1 space per 50 sqm
```

## Model Performance

- **Algorithm**: Random Forest (classification) + Gradient Boosting (regression)
- **Features**: Area, perimeter, compactness, location, nearby zones
- **Expected Accuracy**: 85-95% (depending on training data quality)

## Troubleshooting

### Backend not connecting
- Ensure Python backend is running on port 5000
- Check CORS settings if accessing from different domain
- Frontend will automatically fallback to simulation mode

### Model not training
- Upload at least 3-5 zoning documents first
- Ensure documents have clear zoning rules
- Check console for extraction errors

### Low accuracy
- Upload more diverse zoning documents
- Include examples from all zone types
- Retrain after adding new documents

## Environment Variables

Create a `.env` file in the backend folder:

```
FLASK_ENV=development
FLASK_DEBUG=True
MODEL_PATH=models/zoning_model.pkl
UPLOAD_FOLDER=uploads
```

## Production Deployment

For production:

1. Set `debug=False` in app.py
2. Use a production WSGI server (gunicorn, uwsgi)
3. Set up proper logging
4. Implement authentication
5. Add rate limiting
6. Use a proper database for document metadata

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## License

MIT License
