import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os
from datetime import datetime
import json

class ZoningMLModel:
    """
    Machine Learning model for zoning regulation prediction
    Uses ensemble methods for classification and regression tasks
    """
    
    def __init__(self):
        self.classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=15,
            random_state=42,
            n_jobs=-1
        )
        self.far_regressor = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.training_data = []
        self.training_data_by_city = {}  # City-specific training data
        self.trained = False
        self.model_version = '1.0.0'
        self.feature_names = []
        
        # Zoning categories
        self.zone_types = ['residential', 'commercial', 'industrial', 'mixed']
        
        # City-specific pricing data (price per sqm in local currency)
        self.city_pricing = {
            'bangalore': {
                'residential': {'min': 6500, 'max': 12000, 'avg': 9000, 'currency': '₹'},
                'commercial': {'min': 8000, 'max': 15000, 'avg': 11500, 'currency': '₹'},
                'industrial': {'min': 4000, 'max': 7000, 'avg': 5500, 'currency': '₹'},
                'mixed': {'min': 7000, 'max': 13000, 'avg': 10000, 'currency': '₹'}
            },
            'mumbai': {
                'residential': {'min': 15000, 'max': 35000, 'avg': 25000, 'currency': '₹'},
                'commercial': {'min': 20000, 'max': 50000, 'avg': 35000, 'currency': '₹'},
                'industrial': {'min': 8000, 'max': 15000, 'avg': 11500, 'currency': '₹'},
                'mixed': {'min': 18000, 'max': 40000, 'avg': 29000, 'currency': '₹'}
            },
            'delhi': {
                'residential': {'min': 8000, 'max': 18000, 'avg': 13000, 'currency': '₹'},
                'commercial': {'min': 10000, 'max': 25000, 'avg': 17500, 'currency': '₹'},
                'industrial': {'min': 5000, 'max': 10000, 'avg': 7500, 'currency': '₹'},
                'mixed': {'min': 9000, 'max': 20000, 'avg': 14500, 'currency': '₹'}
            },
            'hyderabad': {
                'residential': {'min': 5000, 'max': 10000, 'avg': 7500, 'currency': '₹'},
                'commercial': {'min': 7000, 'max': 13000, 'avg': 10000, 'currency': '₹'},
                'industrial': {'min': 3500, 'max': 6000, 'avg': 4750, 'currency': '₹'},
                'mixed': {'min': 6000, 'max': 11000, 'avg': 8500, 'currency': '₹'}
            },
            'new_york': {
                'residential': {'min': 3000, 'max': 8000, 'avg': 5500, 'currency': '$'},
                'commercial': {'min': 4000, 'max': 12000, 'avg': 8000, 'currency': '$'},
                'industrial': {'min': 1500, 'max': 3500, 'avg': 2500, 'currency': '$'},
                'mixed': {'min': 3500, 'max': 10000, 'avg': 6750, 'currency': '$'}
            },
            'singapore': {
                'residential': {'min': 8000, 'max': 20000, 'avg': 14000, 'currency': 'S$'},
                'commercial': {'min': 10000, 'max': 30000, 'avg': 20000, 'currency': 'S$'},
                'industrial': {'min': 4000, 'max': 10000, 'avg': 7000, 'currency': 'S$'},
                'mixed': {'min': 9000, 'max': 25000, 'avg': 17000, 'currency': 'S$'}
            }
        }
        
    def add_training_data(self, document_data, city='bangalore'):
        """Add extracted document data to training set"""
        # Add city information
        document_data['city'] = city
        self.training_data.append(document_data)
        
        # Store in city-specific collection
        if city not in self.training_data_by_city:
            self.training_data_by_city[city] = []
        self.training_data_by_city[city].append(document_data)
        
        print(f"📚 Added training data for {city}. Total documents: {len(self.training_data_by_city.get(city, []))}")
        
    def extract_features(self, polygon, nearby_areas):
        """Extract features from polygon and surrounding areas"""
        features = {}
        
        # Geometric features
        area = self._calculate_area(polygon)
        perimeter = self._calculate_perimeter(polygon)
        compactness = (4 * np.pi * area) / (perimeter ** 2) if perimeter > 0 else 0
        
        features['area'] = area
        features['perimeter'] = perimeter
        features['compactness'] = compactness
        
        # Centroid
        centroid = self._get_centroid(polygon)
        features['centroid_lng'] = centroid[0]
        features['centroid_lat'] = centroid[1]
        
        # Nearby area features
        if nearby_areas:
            # Average property value
            avg_value = np.mean([area['value'] for area in nearby_areas])
            features['avg_nearby_value'] = avg_value
            
            # Zone type distribution
            zone_counts = {}
            for area in nearby_areas:
                zone_type = area.get('type', 'residential')
                zone_counts[zone_type] = zone_counts.get(zone_type, 0) + 1
            
            for zone_type in self.zone_types:
                features[f'nearby_{zone_type}_count'] = zone_counts.get(zone_type, 0)
            
            # Average FAR of nearby areas
            avg_far = np.mean([area.get('far', 2.0) for area in nearby_areas])
            features['avg_nearby_far'] = avg_far
            
            # Distance to nearest commercial/industrial
            commercial_areas = [a for a in nearby_areas if a.get('type') == 'commercial']
            if commercial_areas:
                min_dist = min([
                    self._distance(centroid, [a['lng'], a['lat']]) 
                    for a in commercial_areas
                ])
                features['dist_to_commercial'] = min_dist
            else:
                features['dist_to_commercial'] = 10.0  # Default
        else:
            # Default values
            features['avg_nearby_value'] = 8500
            features['nearby_residential_count'] = 3
            features['nearby_commercial_count'] = 1
            features['nearby_industrial_count'] = 0
            features['nearby_mixed_count'] = 1
            features['avg_nearby_far'] = 2.0
            features['dist_to_commercial'] = 5.0
        
        return features
    
    def train(self):
        """Train the ML model on collected data"""
        if len(self.training_data) < 10:
            # Use synthetic data if not enough real data
            self._generate_synthetic_training_data()
        
        # Prepare training data
        X = []
        y_zone = []
        y_far = []
        
        for data in self.training_data:
            features = data['features']
            X.append(list(features.values()))
            y_zone.append(data['zone_type'])
            y_far.append(data['far'])
        
        X = np.array(X)
        self.feature_names = list(self.training_data[0]['features'].keys())
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train zone classifier
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_zone, test_size=0.2, random_state=42
        )
        self.classifier.fit(X_train, y_train)
        y_pred = self.classifier.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Train FAR regressor
        X_train_far, X_test_far, y_train_far, y_test_far = train_test_split(
            X_scaled, y_far, test_size=0.2, random_state=42
        )
        self.far_regressor.fit(X_train_far, y_train_far)
        
        self.trained = True
        
        # Save model
        self.save_model('models/zoning_model.pkl')
        
        return {
            'accuracy': float(accuracy),
            'version': self.model_version,
            'samples': len(self.training_data)
        }
    
    def predict(self, features):
        """Predict zoning attributes for given features"""
        if not self.trained:
            # Return rule-based predictions if model not trained
            return self._rule_based_prediction(features)
        
        # Prepare feature vector
        feature_vector = [features[name] for name in self.feature_names]
        feature_vector = np.array([feature_vector])
        feature_vector_scaled = self.scaler.transform(feature_vector)
        
        # Predict zone type
        zone_type = self.classifier.predict(feature_vector_scaled)[0]
        zone_proba = self.classifier.predict_proba(feature_vector_scaled)[0]
        confidence = float(max(zone_proba))
        
        # Predict FAR
        predicted_far = float(self.far_regressor.predict(feature_vector_scaled)[0])
        
        # Get zoning attributes based on predicted type
        attributes = self._get_zoning_attributes(zone_type, predicted_far)
        
        return {
            'attributes': attributes,
            'confidence': confidence,
            'model_version': self.model_version
        }
    
    def generate_comprehensive_report(self, polygon, nearby_areas, amenities=None, aqi_forecast=None, lightning_risk=None, road_condition=None, city='bangalore'):
        """Generate full ML-powered report"""
        # Extract features
        features = self.extract_features(polygon, nearby_areas)
        
        # Make predictions
        predictions = self.predict(features)
        
        # Calculate additional metrics
        area = self._calculate_area(polygon)
        centroid = self._get_centroid(polygon)
        perimeter = self._calculate_perimeter(polygon)
        
        # Get zone type for pricing
        zone_type = predictions['attributes'].get('zoneType', 'residential')
        
        # Get city-specific pricing
        city_price_data = self._get_city_pricing(city, zone_type, features.get('avg_nearby_value'))
        price_range = city_price_data
        
        # Amenities (use passed real data or fallback to simulation)
        if not amenities:
            amenities = self._find_amenities(centroid)
        
        # Buildability score (city-aware)
        buildability = self._calculate_buildability(predictions['attributes'], area, amenities, city)
        
        # Development scenarios
        scenarios = self._generate_scenarios(area, predictions['attributes'])
        
        # Recommendations
        recommendations = self._generate_recommendations(
            predictions['attributes'], 
            buildability, 
            amenities
        )
        
        # Market trend (city-specific)
        market_trend = self._get_market_trend(city, zone_type)
        
        # Calculate traffic impact
        traffic = self._calculate_traffic_impact(area, predictions['attributes'])
        
        report = {
            'generatedAt': datetime.now().isoformat(),
            'parcelInfo': {
                'area': int(area),
                'perimeter': int(perimeter),
                'centroid': centroid,
                'coordinates': polygon
            },
            'pricing': {
                'pricePerSqft': price_range,
                'estimatedValue': {
                    'min': int(area * price_range['min']),
                    'max': int(area * price_range['max']),
                    'average': int(area * price_range['average'])
                },
                'marketTrend': market_trend
            },
            'zoningDetails': predictions['attributes'],
            'amenities': amenities,
            'buildability': buildability,
            'scenarios': scenarios,
            'mlConfidence': predictions['confidence'],
            'recommendations': recommendations,
            'aqiForecast': aqi_forecast,
            'lightningRisk': lightning_risk,
            'roadCondition': road_condition,
            'traffic': traffic
        }
        
        return report
    
    def _generate_synthetic_training_data(self):
        """Generate synthetic training data for initial model"""
        synthetic_data = []
        
        for _ in range(100):
            zone_type = np.random.choice(self.zone_types)
            
            # Generate features based on zone type
            if zone_type == 'residential':
                far = np.random.uniform(1.5, 2.5)
                value = np.random.uniform(8000, 12000)
            elif zone_type == 'commercial':
                far = np.random.uniform(2.5, 3.5)
                value = np.random.uniform(10000, 15000)
            elif zone_type == 'industrial':
                far = np.random.uniform(1.5, 2.0)
                value = np.random.uniform(5000, 8000)
            else:  # mixed
                far = np.random.uniform(2.0, 3.0)
                value = np.random.uniform(9000, 13000)
            
            features = {
                'area': np.random.uniform(500, 5000),
                'perimeter': np.random.uniform(100, 500),
                'compactness': np.random.uniform(0.5, 1.0),
                'centroid_lng': 77.5 + np.random.uniform(-0.3, 0.3),
                'centroid_lat': 12.9 + np.random.uniform(-0.2, 0.2),
                'avg_nearby_value': value,
                'nearby_residential_count': np.random.randint(0, 5),
                'nearby_commercial_count': np.random.randint(0, 3),
                'nearby_industrial_count': np.random.randint(0, 2),
                'nearby_mixed_count': np.random.randint(0, 2),
                'avg_nearby_far': far,
                'dist_to_commercial': np.random.uniform(0.5, 10.0)
            }
            
            synthetic_data.append({
                'features': features,
                'zone_type': zone_type,
                'far': far
            })
        
        self.training_data.extend(synthetic_data)
    
    def _rule_based_prediction(self, features):
        """Fallback rule-based prediction if model not trained"""
        # Simple rules based on nearby areas
        nearby_residential = features.get('nearby_residential_count', 0)
        nearby_commercial = features.get('nearby_commercial_count', 0)
        nearby_industrial = features.get('nearby_industrial_count', 0)
        
        if nearby_commercial > nearby_residential:
            zone_type = 'commercial'
        elif nearby_industrial > 0:
            zone_type = 'mixed'
        else:
            zone_type = 'residential'
        
        attributes = self._get_zoning_attributes(zone_type, 2.0)
        
        return {
            'attributes': attributes,
            'confidence': 0.75,
            'model_version': 'rule-based'
        }
    
    def _get_zoning_attributes(self, zone_type, predicted_far=None):
        """Get zoning attributes for a given zone type"""
        attributes_map = {
            'residential': {
                'zoneType': 'residential',
                'far': '1.5 - 2.5',
                'maxHeight': '15m - 45m',
                'groundCoverage': '40% - 60%',
                'setback': '3m - 6m',
                'parking': '1 per 100 sqm',
                'landUse': ['Apartments', 'Villas', 'Gated Communities', 'Row Houses'],
                'restrictions': ['No commercial activities', 'Noise compliance', 'Green space requirements']
            },
            'commercial': {
                'zoneType': 'commercial',
                'far': '2.5 - 3.5',
                'maxHeight': '45m - 60m',
                'groundCoverage': '50% - 70%',
                'setback': '6m - 9m',
                'parking': '1 per 50 sqm',
                'landUse': ['Office Buildings', 'Shopping Malls', 'Retail Stores', 'Business Parks'],
                'restrictions': ['Fire safety compliance', 'Parking requirements', 'Signage regulations']
            },
            'industrial': {
                'zoneType': 'industrial',
                'far': '1.5 - 2.0',
                'maxHeight': '15m - 30m',
                'groundCoverage': '60% - 75%',
                'setback': '9m - 12m',
                'parking': '1 per 75 sqm',
                'landUse': ['Factories', 'Warehouses', 'Manufacturing Units', 'Storage Facilities'],
                'restrictions': ['Environmental clearance', 'No hazardous materials', 'Pollution control']
            },
            'mixed': {
                'zoneType': 'mixed',
                'far': '2.0 - 3.0',
                'maxHeight': '30m - 50m',
                'groundCoverage': '50% - 65%',
                'setback': '4.5m - 7.5m',
                'parking': '1 per 65 sqm',
                'landUse': ['Mixed-use Towers', 'Live-Work Spaces', 'Retail + Apartments', 'Office + Residential'],
                'restrictions': ['Mixed-use compliance', 'Separate entrances', 'Noise mitigation']
            }
        }
        
        return attributes_map.get(zone_type, attributes_map['residential'])
    
    def _get_city_pricing(self, city, zone_type, nearby_avg_value=None):
        """Get city and zone-specific pricing"""
        city_lower = city.lower()
        
        # Default to bangalore if city not found
        if city_lower not in self.city_pricing:
            city_lower = 'bangalore'
        
        zone_pricing = self.city_pricing[city_lower].get(zone_type, self.city_pricing[city_lower]['residential'])
        
        # If we have nearby value data, use it to adjust pricing within city ranges
        if nearby_avg_value and nearby_avg_value > 0:
            # Use nearby values but constrain to city ranges
            adjusted_min = max(zone_pricing['min'], int(nearby_avg_value * 0.85))
            adjusted_max = min(zone_pricing['max'], int(nearby_avg_value * 1.15))
            adjusted_avg = int((adjusted_min + adjusted_max) / 2)
        else:
            adjusted_min = zone_pricing['min']
            adjusted_max = zone_pricing['max']
            adjusted_avg = zone_pricing['avg']
        
        return {
            'min': adjusted_min,
            'max': adjusted_max,
            'average': adjusted_avg,
            'currency': zone_pricing['currency']
        }
    
    def _get_market_trend(self, city, zone_type):
        """Get market trend based on city and zone type"""
        city_lower = city.lower()
        
        # City-specific growth rates (approximate annual growth %)
        city_growth = {
            'bangalore': {'residential': 8.5, 'commercial': 10.2, 'industrial': 6.5, 'mixed': 9.0},
            'mumbai': {'residential': 5.8, 'commercial': 7.5, 'industrial': 4.2, 'mixed': 6.5},
            'delhi': {'residential': 7.2, 'commercial': 8.8, 'industrial': 5.5, 'mixed': 7.8},
            'hyderabad': {'residential': 9.5, 'commercial': 11.2, 'industrial': 7.8, 'mixed': 10.0},
            'new_york': {'residential': 3.5, 'commercial': 4.8, 'industrial': 2.5, 'mixed': 4.0},
            'singapore': {'residential': 4.2, 'commercial': 5.5, 'industrial': 3.2, 'mixed': 4.8}
        }
        
        # Default to bangalore if city not found
        if city_lower not in city_growth:
            city_lower = 'bangalore'
        
        growth_rate = city_growth[city_lower].get(zone_type, 7.0)
        
        # Add some randomness for realistic variation
        growth_rate += np.random.uniform(-1.0, 1.5)
        
        trend_status = 'rising' if growth_rate > 5 else 'stable' if growth_rate > 2 else 'slow'
        outlook = 'positive' if growth_rate > 6 else 'stable' if growth_rate > 3 else 'cautious'
        
        return {
            'trend': trend_status,
            'growthRate': f"{growth_rate:.1f}%",
            'outlook': outlook,
            'description': f"Market showing {trend_status} trend with {outlook} outlook"
        }
    
    def _calculate_area(self, polygon):
        """Calculate polygon area in square meters"""
        if len(polygon) < 3:
            return 0
        
        area = 0
        for i in range(len(polygon)):
            j = (i + 1) % len(polygon)
            xi = polygon[i][0] * 111320
            yi = polygon[i][1] * 110540
            xj = polygon[j][0] * 111320
            yj = polygon[j][1] * 110540
            area += xi * yj - xj * yi
        
        return abs(area / 2)
    
    def _calculate_perimeter(self, polygon):
        """Calculate polygon perimeter in meters"""
        perimeter = 0
        for i in range(len(polygon)):
            j = (i + 1) % len(polygon)
            dx = (polygon[j][0] - polygon[i][0]) * 111320
            dy = (polygon[j][1] - polygon[i][1]) * 110540
            perimeter += np.sqrt(dx * dx + dy * dy)
        return perimeter
    
    def _get_centroid(self, polygon):
        """Calculate polygon centroid"""
        x = sum(p[0] for p in polygon) / len(polygon)
        y = sum(p[1] for p in polygon) / len(polygon)
        return [x, y]
    
    def _distance(self, point1, point2):
        """Calculate distance between two points"""
        return np.sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2) * 111
    
    def _find_amenities(self, centroid):
        """Find nearby amenities (simulated)"""
        return {
            'schools': [
                {'name': 'Delhi Public School', 'distance': 1.2, 'rating': 4.5},
                {'name': 'Manipal International School', 'distance': 2.3, 'rating': 4.3},
                {'name': 'National Public School', 'distance': 3.1, 'rating': 4.6}
            ],
            'metro': [
                {'name': 'Indiranagar Metro Station', 'distance': 1.5, 'line': 'Purple Line'},
                {'name': 'Trinity Metro Station', 'distance': 2.8, 'line': 'Green Line'}
            ],
            'hospitals': [
                {'name': 'Manipal Hospital', 'distance': 1.8, 'rating': 4.4},
                {'name': 'Columbia Asia Hospital', 'distance': 2.5, 'rating': 4.2},
                {'name': 'Apollo Hospital', 'distance': 3.2, 'rating': 4.7}
            ],
            'shopping': [
                {'name': 'Mantri Square Mall', 'distance': 1.1},
                {'name': 'Orion Mall', 'distance': 2.9}
            ]
        }
    
    def _calculate_buildability(self, attributes, area, amenities, city='bangalore'):
        """Calculate buildability score with city-specific adjustments"""
        score = 0
        factors = []
        
        # Zoning compliance (25 points)
        if attributes['far']:
            score += 25
            factors.append({'name': 'Zoning Compliance', 'score': 25, 'status': 'excellent'})
        
        # Site area evaluation (20 points) - city-specific thresholds
        city_area_thresholds = {
            'bangalore': 500, 'mumbai': 400, 'delhi': 450,
            'hyderabad': 600, 'new_york': 300, 'singapore': 350
        }
        threshold = city_area_thresholds.get(city.lower(), 500)
        
        if area > threshold * 2:
            score += 20
            factors.append({'name': 'Site Area', 'score': 20, 'status': 'excellent'})
        elif area > threshold:
            score += 15
            factors.append({'name': 'Site Area', 'score': 15, 'status': 'good'})
        else:
            score += 8
            factors.append({'name': 'Site Area', 'score': 8, 'status': 'fair'})
        
        # School proximity (20 points)
        if amenities.get('schools') and len(amenities['schools']) > 0:
            school_distances = [s.get('distance', 10) for s in amenities['schools'] if s.get('distance') is not None]
            if school_distances:
                avg_school_dist = np.mean(school_distances)
                if avg_school_dist < 1.5:
                    score += 20
                    factors.append({'name': 'School Proximity', 'score': 20, 'status': 'excellent'})
                elif avg_school_dist < 3:
                    score += 15
                    factors.append({'name': 'School Proximity', 'score': 15, 'status': 'good'})
                else:
                    score += 8
                    factors.append({'name': 'School Proximity', 'score': 8, 'status': 'fair'})
            else:
                score += 5
                factors.append({'name': 'School Proximity', 'score': 5, 'status': 'limited'})
        else:
            score += 5
            factors.append({'name': 'School Proximity', 'score': 5, 'status': 'limited'})
        
        # Transport access (20 points)
        transport_list = amenities.get('transport', amenities.get('metro', []))
        if transport_list and len(transport_list) > 0:
            transport_distances = [t.get('distance', 10) for t in transport_list if t.get('distance') is not None]
            if transport_distances:
                min_transport = min(transport_distances)
                if min_transport < 1:
                    score += 20
                    factors.append({'name': 'Transport Access', 'score': 20, 'status': 'excellent'})
                elif min_transport < 2:
                    score += 15
                    factors.append({'name': 'Transport Access', 'score': 15, 'status': 'good'})
                else:
                    score += 8
                    factors.append({'name': 'Transport Access', 'score': 8, 'status': 'fair'})
            else:
                score += 5
                factors.append({'name': 'Transport Access', 'score': 5, 'status': 'limited'})
        else:
            score += 5
            factors.append({'name': 'Transport Access', 'score': 5, 'status': 'limited'})
        
        # Healthcare proximity (15 points)
        if amenities.get('hospitals') and len(amenities['hospitals']) > 0:
            hospital_distances = [h.get('distance', 10) for h in amenities['hospitals'] if h.get('distance') is not None]
            if hospital_distances:
                avg_hospital_dist = np.mean(hospital_distances)
                if avg_hospital_dist < 2:
                    score += 15
                    factors.append({'name': 'Healthcare Access', 'score': 15, 'status': 'excellent'})
                elif avg_hospital_dist < 4:
                    score += 10
                    factors.append({'name': 'Healthcare Access', 'score': 10, 'status': 'good'})
                else:
                    score += 5
                    factors.append({'name': 'Healthcare Access', 'score': 5, 'status': 'fair'})
            else:
                score += 3
                factors.append({'name': 'Healthcare Access', 'score': 3, 'status': 'limited'})
        else:
            score += 3
            factors.append({'name': 'Healthcare Access', 'score': 3, 'status': 'limited'})
        
        # Determine grade
        grade = 'A+' if score >= 90 else 'A' if score >= 80 else 'B+' if score >= 70 else 'B' if score >= 60 else 'C+' if score >= 50 else 'C'
        
        return {
            'score': score,
            'grade': grade,
            'factors': factors
        }
    
    def _generate_scenarios(self, area, attributes):
        """Generate development scenarios"""
        far_range = attributes['far'].split('-')
        far_max = float(far_range[1].strip())
        coverage_range = attributes['groundCoverage'].split('-')
        coverage_max = float(coverage_range[1].strip().replace('%', '')) / 100
        
        max_built_area = area * far_max
        ground_floor_area = area * coverage_max
        floors = int(max_built_area / ground_floor_area) if ground_floor_area > 0 else 1
        
        return [
            {
                'name': 'Conservative',
                'description': 'Minimum FAR utilization with maximum open space',
                'far': round(far_max * 0.6, 1),
                'floors': int(floors * 0.6),
                'builtArea': int(max_built_area * 0.6),
                'openSpace': int(area * 0.5),
                'estimatedCost': int(max_built_area * 0.6 * 35000),
                'roi': '12-15%'
            },
            {
                'name': 'Moderate',
                'description': 'Balanced development with good open space',
                'far': round(far_max * 0.8, 1),
                'floors': int(floors * 0.8),
                'builtArea': int(max_built_area * 0.8),
                'openSpace': int(area * 0.35),
                'estimatedCost': int(max_built_area * 0.8 * 35000),
                'roi': '15-18%'
            },
            {
                'name': 'Maximum',
                'description': 'Full FAR utilization for maximum returns',
                'far': far_max,
                'floors': floors,
                'builtArea': int(max_built_area),
                'openSpace': int(area * 0.25),
                'estimatedCost': int(max_built_area * 35000),
                'roi': '18-22%'
            }
        ]
    
    def _generate_recommendations(self, attributes, buildability, amenities):
        """Generate AI recommendations"""
        recommendations = []
        
        if buildability['score'] > 75:
            recommendations.append({
                'type': 'positive',
                'title': 'Excellent Development Potential',
                'description': 'This site shows strong indicators for development with good zoning compliance and amenity access.'
            })
        
        if amenities['metro'][0]['distance'] < 1.5:
            recommendations.append({
                'type': 'positive',
                'title': 'Premium Metro Connectivity',
                'description': 'Proximity to metro station significantly enhances property value and marketability.'
            })
        
        if attributes['zoneType'] == 'commercial':
            recommendations.append({
                'type': 'info',
                'title': 'Commercial Zoning Advantage',
                'description': 'Commercial zoning allows for higher FAR and diverse use cases, maximizing returns.'
            })
        
        recommendations.append({
            'type': 'info',
            'title': 'Market Timing',
            'description': 'Current market conditions favor phased development with focus on quality amenities.'
        })
        
        return recommendations
    
    def _calculate_traffic_impact(self, area, attributes):
        """Calculate traffic impact based on ITE Trip Generation rates"""
        zone_type = attributes.get('zoneType', 'residential').lower()
        
        # ITE Trip Generation rates (trips per unit or per 100 sqm)
        trip_rates = {
            'residential': {'daily': 8, 'peak': 0.8},  # per dwelling unit
            'commercial': {'daily': 12, 'peak': 1.2},  # per 100 sqm
            'industrial': {'daily': 4, 'peak': 0.5},   # per 100 sqm
            'mixed-use': {'daily': 10, 'peak': 1.0}    # per 100 sqm
        }
        
        rate = trip_rates.get(zone_type, trip_rates['residential'])
        
        # Calculate units or area units
        if zone_type == 'residential':
            # Assume 100 sqm per dwelling unit
            unit_count = int(area / 100)
            unit_type = 'Dwelling Units'
        else:
            # Per 100 sqm for non-residential
            unit_count = int(area / 100)
            unit_type = '100m² Units'
        
        # Calculate trips
        daily_trips = int(unit_count * rate['daily'])
        peak_hour_trips = int(unit_count * rate['peak'])
        
        # Determine congestion level
        if peak_hour_trips < 50:
            congestion = {'level': 'Low', 'description': 'Minimal traffic impact'}
        elif peak_hour_trips < 100:
            congestion = {'level': 'Moderate', 'description': 'Manageable with mitigation'}
        elif peak_hour_trips < 200:
            congestion = {'level': 'High', 'description': 'Requires traffic management'}
        else:
            congestion = {'level': 'Very High', 'description': 'Significant mitigation needed'}
        
        return {
            'dailyTrips': daily_trips,
            'peakHourTrips': peak_hour_trips,
            'unitCount': unit_count,
            'unitType': unit_type,
            'congestion': congestion
        }
    
    def save_model(self, filepath):
        """Save trained model to disk"""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        model_data = {
            'classifier': self.classifier,
            'far_regressor': self.far_regressor,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'model_version': self.model_version,
            'trained': self.trained
        }
        joblib.dump(model_data, filepath)
    
    def load_model(self, filepath):
        """Load trained model from disk"""
        model_data = joblib.load(filepath)
        self.classifier = model_data['classifier']
        self.far_regressor = model_data['far_regressor']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.model_version = model_data['model_version']
        self.trained = model_data['trained']
    
    def is_trained(self):
        """Check if model is trained"""
        return self.trained
