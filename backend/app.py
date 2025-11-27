import os
from datetime import datetime

from document_processor import DocumentProcessor
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from zoning_ml_model import ZoningMLModel

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Initialize ML model and document processor
ml_model = ZoningMLModel()
doc_processor = DocumentProcessor()

# Initialize new services
from amenities_service import AmenitiesFinder
from aqi_model import AQIPredictor
from dotenv import load_dotenv
from flood_model import FloodPredictor

load_dotenv() # Load environment variables

amenities_finder = AmenitiesFinder()
aqi_predictor = AQIPredictor()
flood_predictor = FloodPredictor()

# Load flood model on startup
try:
    flood_predictor.load_model()
except Exception as e:
    print(f"⚠️ Flood model will train on first use: {e}")

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
        
        # Get area from frontend (already calculated with turf.js)
        area_sqm = data.get('area', None)
        
        # Predict Flood Risk using city-specific data
        print("🌊 Predicting flood risk...")
        try:
            import random

            from city_climate_data import (get_city_climate,
                                           get_season_adjustment)

            # Get historical climate data for the city
            city_climate = get_city_climate(city)
            season_multiplier = get_season_adjustment()
            
            print(f"   Using historical data for {city_climate['name']}")
            print(f"   Avg annual rainfall: {city_climate['avg_annual_rainfall']}mm")
            print(f"   Elevation: {city_climate['avg_elevation']}m")
            print(f"   Risk multiplier: {city_climate['risk_multiplier']}")
            
            # Use city-specific data with some variation
            weather_data = {
                "rainfall": city_climate['monsoon_rainfall'] * season_multiplier * random.uniform(0.8, 1.2),
                "temperature": city_climate['avg_temperature'] + random.uniform(-3, 3),
                "humidity": city_climate['avg_humidity'] + random.uniform(-10, 10),
                "pressure": city_climate['avg_pressure'] + random.uniform(-5, 5),
                "elevation": city_climate['avg_elevation']
            }

            # Pass centroid coordinates for location-specific prediction
            flood_risk = flood_predictor.predict_flood(weather_data, lat=centroid_lat, lng=centroid_lng)
            
            # Apply city-specific risk multiplier
            original_score = flood_risk['riskScore']
            adjusted_score = min(100, original_score * city_climate['risk_multiplier'])
            flood_risk['riskScore'] = round(adjusted_score, 2)
            flood_risk['riskLevel'] = flood_predictor._get_risk_level(adjusted_score)
            flood_risk['description'] = f"{city_climate['name']}: {flood_predictor._get_risk_description(adjusted_score)}"
            
            # Pass coordinates for future predictions too and include city risk multiplier
            future_flood_risk = flood_predictor.predict_future_risk(
                weather_data,
                lat=centroid_lat,
                lng=centroid_lng,
                city_multiplier=city_climate.get('risk_multiplier', 1.0)
            )
            print(f"✅ Flood risk: {flood_risk.get('riskLevel', 'Unknown')} (Score: {flood_risk['riskScore']})")
        except Exception as e:
            print(f"⚠️ Error predicting flood risk: {e}")
            flood_risk = {'riskScore': 15, 'riskLevel': 'Low', 'description': 'Minimal risk', 'depthInches': 0.5}
            future_flood_risk = [
                {'year': '+5 Years', 'riskScore': 18, 'riskLevel': 'Low', 'depthInches': 0.8},
                {'year': '+10 Years', 'riskScore': 25, 'riskLevel': 'Moderate', 'depthInches': 2.5}
            ]
        
        # Generate full report using ML predictions and real data
        report = ml_model.generate_comprehensive_report(
            polygon, 
            nearby_areas, 
            amenities=amenities,
            aqi_forecast=aqi_forecast,
            lightning_risk=lightning_risk,
            road_condition=road_condition,
            area=area_sqm,
            flood_risk={
                'current': flood_risk,
                'future': future_flood_risk
            }
        )
        
        # Debug: Log flood data
        print(f"🌊 Flood data in report: {report.get('floodRisk', 'NOT FOUND')}")
        
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
    # Get processed document metadata (if any)
    documents = doc_processor.get_documents(city=city)

    # Also include any raw files that exist under zoning-documents/<city> but have no metadata
    try:
        zoning_dir = os.path.join(os.getcwd(), 'zoning-documents')
        if city:
            city_dir = os.path.join(zoning_dir, city)
            dirs_to_check = [city_dir]
        else:
            # check all city subfolders
            dirs_to_check = [os.path.join(zoning_dir, d) for d in os.listdir(zoning_dir) if os.path.isdir(os.path.join(zoning_dir, d))]

        for folder in dirs_to_check:
            if not os.path.exists(folder):
                continue
            for fname in os.listdir(folder):
                # only consider common document extensions
                if not fname.lower().endswith(('.pdf', '.docx', '.txt')):
                    continue

                # if this file already has metadata (match by filename), skip
                if any(doc.get('filename') == fname for doc in documents):
                    continue

                # Otherwise add a lightweight metadata entry so frontend can display it
                filepath = os.path.join(folder, fname)
                stat = os.stat(filepath)
                doc_entry = {
                    'id': os.path.splitext(fname)[0],
                    'filename': fname,
                    'city': os.path.basename(folder),
                    'processed_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'rules_count': 0,
                    'processed': False
                }
                documents.append(doc_entry)
    except Exception as e:
        print(f"⚠️ Error while scanning zoning-documents: {e}")

    # Get unique cities from both processed metadata and folder names
    cities = list(set(doc.get('city', 'unknown') for doc in doc_processor.documents))
    try:
        # add any cities from zoning-documents folders
        zoning_cities = []
        zoning_dir = os.path.join(os.getcwd(), 'zoning-documents')
        if os.path.exists(zoning_dir):
            for name in os.listdir(zoning_dir):
                if os.path.isdir(os.path.join(zoning_dir, name)):
                    zoning_cities.append(name)
        cities = list(set(cities + zoning_cities))
    except Exception:
        pass

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

@app.route('/api/buildings/models', methods=['GET'])
def get_building_models():
    """Get list of available 3D building models"""
    models_dir = os.path.join(os.getcwd(), 'data')
    if not os.path.exists(models_dir):
        return jsonify({'success': False, 'error': 'Models directory not found', 'models': []})

    models = []
    try:
        for filename in os.listdir(models_dir):
            if filename.endswith('.glb') or filename.endswith('.gltf'):
                models.append({
                    'name': filename.replace('_', ' ').replace('.glb', '').replace('.gltf', '').title(),
                    'filename': filename,
                    'url': f'/buildings/models/{filename}'
                })
        return jsonify({'success': True, 'models': models})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'models': []})

# ============================================================================
# FLOOD PREDICTION ENDPOINTS
# ============================================================================

@app.route('/api/predict-flood', methods=['POST'])
def predict_flood():
    """Predict flood risk for a given location"""
    data = request.json
    
    if not data:
        return jsonify({'error': 'Request data required'}), 400
    
    try:
        import random

        from city_climate_data import get_city_climate, get_season_adjustment

        # Get city and coordinates
        city = data.get('city', 'bangalore').lower()
        lat = data.get('lat')
        lng = data.get('lng')
        
        # Get city-specific climate data
        city_climate = get_city_climate(city)
        season_multiplier = get_season_adjustment()
        
        # Build weather data with city-specific values
        weather_data = {
            "rainfall": city_climate['monsoon_rainfall'] * season_multiplier * random.uniform(0.8, 1.2),
            "temperature": city_climate['avg_temperature'] + random.uniform(-3, 3),
            "humidity": city_climate['avg_humidity'] + random.uniform(-10, 10),
            "pressure": city_climate['avg_pressure'] + random.uniform(-5, 5),
            "elevation": city_climate['avg_elevation']
        }
        
        # Predict flood risk with location
        flood_risk = flood_predictor.predict_flood(weather_data, lat=lat, lng=lng)
        
        # Apply city-specific risk multiplier
        original_score = flood_risk['riskScore']
        adjusted_score = min(100, original_score * city_climate['risk_multiplier'])
        flood_risk['riskScore'] = round(adjusted_score, 2)
        flood_risk['riskLevel'] = flood_predictor._get_risk_level(adjusted_score)
        flood_risk['description'] = f"{city_climate['name']}: {flood_predictor._get_risk_description(adjusted_score)}"
        
        # Get future predictions (include city multiplier so depths vary by city)
        future_flood_risk = flood_predictor.predict_future_risk(
            weather_data,
            lat=lat,
            lng=lng,
            city_multiplier=city_climate.get('risk_multiplier', 1.0)
        )
        
        return jsonify({
            'success': True,
            'current': flood_risk,
            'future': future_flood_risk,
            'city_info': {
                'name': city_climate['name'],
                'avg_rainfall': city_climate['avg_annual_rainfall'],
                'elevation': city_climate['avg_elevation'],
                'historical_floods': city_climate['historical_flood_years']
            }
        })
        
    except Exception as e:
        print(f"Error predicting flood: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/flood-info/<city>', methods=['GET'])
def get_flood_info(city):
    """Get flood information for a specific city"""
    try:
        from city_climate_data import get_city_climate
        
        city_climate = get_city_climate(city)
        
        return jsonify({
            'success': True,
            'city': city_climate['name'],
            'climate': {
                'annual_rainfall': city_climate['avg_annual_rainfall'],
                'monsoon_rainfall': city_climate['monsoon_rainfall'],
                'temperature': city_climate['avg_temperature'],
                'humidity': city_climate['avg_humidity'],
                'elevation': city_climate['avg_elevation']
            },
            'flood_history': {
                'prone_areas': city_climate['flood_prone_areas'],
                'historical_years': city_climate['historical_flood_years'],
                'max_depth': city_climate['max_recorded_flood_depth'],
                'drainage_quality': city_climate['drainage_quality']
            },
            'risk_factor': city_climate['risk_multiplier']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/buildings/models/<path:filename>')
def serve_building_model(filename):
    """Serve 3D building model files"""
    models_dir = os.path.join(os.getcwd(), 'data')
    return send_from_directory(models_dir, filename)

if __name__ == '__main__':
    print("🚀 Starting ML-Powered Zoning Regulation Backend...")
    print("📊 Loading pre-trained models...")

    # Load any existing trained models
    if os.path.exists('models/zoning_model.pkl'):
        ml_model.load_model('models/zoning_model.pkl')
        print("✅ Loaded existing trained model")
    else:
        print("⚠️  No pre-trained model found. Upload documents to train.")

    print(f"🌐 Server running on http://0.0.0.0:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
