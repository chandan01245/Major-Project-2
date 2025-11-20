from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import requests
from datetime import datetime
from zoning_ml_model import ZoningMLModel
from document_processor import DocumentProcessor

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Initialize ML model and document processor
ml_model = ZoningMLModel()
doc_processor = DocumentProcessor()

# Initialize new services
from amenities_service import AmenitiesFinder
from aqi_model import AQIPredictor
from dotenv import load_dotenv

load_dotenv() # Load environment variables

amenities_finder = AmenitiesFinder()
aqi_predictor = AQIPredictor()

UPLOAD_FOLDER = 'uploads'
ZONING_DOCS_FOLDER = 'zoning-documents'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(ZONING_DOCS_FOLDER, exist_ok=True)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_trained': ml_model.is_trained(),
        'documents_processed': len(doc_processor.get_documents())
    })

@app.route('/api/upload-document', methods=['POST'])
def upload_document():
    """Upload and process zoning regulation documents"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Get optional city parameter (default: bangalore)
    city = request.form.get('city', 'bangalore').lower()
    
    # Create city-specific folder
    city_folder = os.path.join(ZONING_DOCS_FOLDER, city)
    os.makedirs(city_folder, exist_ok=True)
    
    # Save file with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{timestamp}_{file.filename}"
    
    # Save to both uploads (temporary) and zoning-documents (permanent)
    temp_filepath = os.path.join(UPLOAD_FOLDER, filename)
    permanent_filepath = os.path.join(city_folder, filename)
    
    file.save(temp_filepath)
    
    try:
        # Process document
        extracted_data = doc_processor.process_document(temp_filepath, city=city)
        
        # Copy to permanent storage after successful processing
        import shutil
        shutil.copy2(temp_filepath, permanent_filepath)
        
        # Train model with extracted data
        ml_model.add_training_data(extracted_data, city=city)
        
        print(f"✅ Document saved to: {permanent_filepath}")
        print(f"📊 Extracted {len(extracted_data['rules'])} rules for {city}")
        
        return jsonify({
            'success': True,
            'document_id': extracted_data['id'],
            'filename': filename,
            'city': city,
            'extracted_rules': len(extracted_data['rules']),
            'processed': True,
            'storage_path': permanent_filepath
        })
    except Exception as e:
        print(f"❌ Error processing document: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/train-model', methods=['POST'])
def train_model():
    """Train the ML model on uploaded documents"""
    try:
        training_result = ml_model.train()
        return jsonify({
            'success': True,
            'accuracy': training_result['accuracy'],
            'model_version': training_result['version'],
            'training_samples': training_result['samples']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict-zoning', methods=['POST'])
def predict_zoning():
    """Predict zoning attributes for a given location"""
    data = request.json
    
    if not data or 'polygon' not in data:
        return jsonify({'error': 'Polygon coordinates required'}), 400
    
    try:
        polygon = data['polygon']
        nearby_areas = data.get('nearby_areas', [])
        city = data.get('city', 'bangalore').lower()  # Get city from request
        
        # Check if zoning documents exist for this city
        docs = doc_processor.get_documents(city=city)
        if not docs:
            return jsonify({
                'error': f'No zoning regulations found for {city}. Please upload documents first.',
                'code': 'NO_ZONING_DOCS'
            }), 400
        
        print(f"🔍 Predicting zoning for {city}")
        
        # Extract features from polygon
        features = ml_model.extract_features(polygon, nearby_areas)
        
        # Predict zoning attributes
        predictions = ml_model.predict(features)
        
        return jsonify({
            'success': True,
            'zoning_attributes': predictions['attributes'],
            'confidence': predictions['confidence'],
            'model_version': predictions['model_version']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-report', methods=['POST'])
def generate_report():
    """Generate comprehensive ML-powered report"""
    data = request.json
    
    if not data or 'polygon' not in data:
        return jsonify({'error': 'Polygon coordinates required'}), 400
    
    try:
        polygon = data['polygon']
        nearby_areas = data.get('nearby_areas', [])
        city = data.get('city', 'bangalore').lower()
        
        # Check if zoning documents exist for this city
        docs = doc_processor.get_documents(city=city)
        if not docs:
            return jsonify({
                'error': f'No zoning regulations found for {city}. Please upload documents first.',
                'code': 'NO_ZONING_DOCS'
            }), 400
        
        # Calculate centroid for amenities search
        centroid_lng = sum(p[0] for p in polygon) / len(polygon)
        centroid_lat = sum(p[1] for p in polygon) / len(polygon)
        
        # Fetch real amenities
        amenities = amenities_finder.find_amenities(centroid_lat, centroid_lng)
        
        # Predict AQI
        # For demo, we use a random current AQI if not provided
        current_aqi = data.get('current_aqi', 100)
        aqi_forecast = aqi_predictor.predict_future(current_aqi)
        
        # Get Lightning Risk
        # We need to know the building type, which comes from zoning prediction
        # So we first predict zoning to get the type
        features = ml_model.extract_features(polygon, nearby_areas)
        zoning_prediction = ml_model.predict(features)
        building_type = zoning_prediction['attributes']['zoneType']
        
        lightning_risk = aqi_predictor.get_lightning_risk(city, building_type)
        
        # Get Road Condition
        road_condition = amenities_finder.get_road_condition(centroid_lat, centroid_lng)
        
        # Generate full report using ML predictions and real data
        report = ml_model.generate_comprehensive_report(
            polygon, 
            nearby_areas, 
            amenities=amenities,
            aqi_forecast=aqi_forecast,
            lightning_risk=lightning_risk,
            road_condition=road_condition
        )
        
        return jsonify({
            'success': True,
            'report': report
        })
    except Exception as e:
        print(f"Error generating report: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/documents', methods=['GET'])
def get_documents():
    """Get list of uploaded documents"""
    city = request.args.get('city', None)
    documents = doc_processor.get_documents(city=city)
    
    # Get unique cities
    cities = list(set(doc.get('city', 'unknown') for doc in doc_processor.documents))
    
    return jsonify({
        'success': True,
        'documents': documents,
        'cities': cities,
        'filtered_by_city': city
    })

@app.route('/api/cities', methods=['GET'])
def get_cities():
    """Get list of cities with uploaded documents"""
    cities = list(doc_processor.documents_by_city.keys())
    city_stats = {}
    
    for city in cities:
        docs = doc_processor.documents_by_city[city]
        total_rules = sum(len(doc['rules']) for doc in docs)
        city_stats[city] = {
            'documents': len(docs),
            'total_rules': total_rules
        }
    
    return jsonify({
        'success': True,
        'cities': cities,
        'statistics': city_stats
    })

@app.route('/api/documents/<doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    """Delete a document"""
    try:
        doc_processor.delete_document(doc_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API Key endpoints
@app.route('/api/config/maptiler-key', methods=['GET'])
def get_maptiler_key():
    """Get MapTiler API key for map initialization"""
    # In production, consider implementing rate limiting and authentication
    api_key = os.getenv('MAPTILER_KEY')
    if not api_key:
        return jsonify({'error': 'API key not configured'}), 500
    
    return jsonify({'key': api_key})

# API Proxy Endpoints to hide API keys from client
@app.route('/api/proxy/maptiler/dataset/<dataset_id>', methods=['GET'])
def proxy_maptiler_dataset(dataset_id):
    """Proxy MapTiler dataset API"""
    api_key = os.getenv('MAPTILER_KEY')
    if not api_key:
        return jsonify({'error': 'API key not configured'}), 500
    
    url = f"https://api.maptiler.com/data/{dataset_id}/features.json?key={api_key}"
    
    try:
        response = requests.get(url)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/proxy/geoapify/search', methods=['GET'])
def proxy_geoapify_search():
    """Proxy Geoapify geocoding search"""
    text = request.args.get('text')
    limit = request.args.get('limit', 1)
    
    api_key = os.getenv('GEOAPIFY_KEY')
    if not api_key:
        return jsonify({'error': 'API key not configured'}), 500
    
    url = f"https://api.geoapify.com/v1/geocode/search?text={text}&limit={limit}&apiKey={api_key}"
    
    try:
        response = requests.get(url)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/proxy/geoapify/boundary', methods=['GET'])
def proxy_geoapify_boundary():
    """Proxy Geoapify boundary lookup"""
    place_id = request.args.get('id')
    geometry = request.args.get('geometry', 'geometry_1000')
    
    api_key = os.getenv('GEOAPIFY_KEY')
    if not api_key:
        return jsonify({'error': 'API key not configured'}), 500
    
    url = f"https://api.geoapify.com/v1/boundaries/place?id={place_id}&geometry={geometry}&apiKey={api_key}"
    
    try:
        response = requests.get(url)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/proxy/geoapify/places', methods=['GET'])
def proxy_geoapify_places():
    """Proxy Geoapify places (amenities) search"""
    categories = request.args.get('categories')
    filter_param = request.args.get('filter')
    limit = request.args.get('limit', 20)
    
    api_key = os.getenv('GEOAPIFY_KEY')
    if not api_key:
        return jsonify({'error': 'API key not configured'}), 500
    
    url = f"https://api.geoapify.com/v2/places?categories={categories}&filter={filter_param}&limit={limit}&apiKey={api_key}"
    
    try:
        response = requests.get(url)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve React frontend in production (when static folder exists)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve React build in production"""
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    elif os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_from_directory(app.static_folder, 'index.html')
    else:
        # Development mode - API only
        return jsonify({
            'message': 'UrbanForm Pro API',
            'version': '2.0.0',
            'status': 'running',
            'note': 'Frontend not built. Run in development mode or build React app.'
        })

if __name__ == '__main__':
    print("🚀 Starting ML-Powered Zoning Regulation Backend...")
    print("📊 Loading pre-trained models...")

    # Load any existing trained models
    if os.path.exists('models/zoning_model.pkl'):
        ml_model.load_model('models/zoning_model.pkl')
        print("✅ Loaded existing trained model")
    else:
        print("⚠️  No pre-trained model found. Upload documents to train.")

    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') != 'production'
    
    print(f"🌐 Server running on http://0.0.0.0:{port}")
    if os.path.exists('static/index.html'):
        print("✅ Serving React frontend from /static")
    else:
        print("ℹ️  API-only mode (frontend not built)")
    
    app.run(debug=debug, host='0.0.0.0', port=port)
