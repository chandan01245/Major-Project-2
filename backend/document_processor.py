import json
import os
import re
from datetime import datetime

import nltk
import pdfplumber
from docx import Document
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize, word_tokenize

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

class DocumentProcessor:
    """
    Process zoning regulation documents and extract structured data
    Supports PDF, DOCX, and TXT formats
    """
    
    def __init__(self):
        self.documents = []
        self.documents_by_city = {}  # Store documents grouped by city
        self.stop_words = set(stopwords.words('english'))
        
        # Keywords for extracting zoning information
        self.keywords = {
            'far': ['far', 'floor area ratio', 'fsi', 'floor space index'],
            'height': ['height', 'max height', 'maximum height', 'building height'],
            'coverage': ['coverage', 'ground coverage', 'site coverage', 'building coverage'],
            'setback': ['setback', 'set back', 'building line', 'frontage'],
            'parking': ['parking', 'car parking', 'vehicle parking', 'parking space'],
            'zone_type': ['residential', 'commercial', 'industrial', 'mixed', 'mixed-use']
        }
        
        # City-specific keywords (can be extended)
        self.city_keywords = {
            'bangalore': ['bangalore', 'bengaluru', 'bbmp', 'bda', 'karnataka'],
            'mumbai': ['mumbai', 'bombay', 'mcgm', 'maharashtra'],
            'delhi': ['delhi', 'new delhi', 'dda', 'ndmc'],
            'chennai': ['chennai', 'madras', 'cmda', 'tamil nadu'],
            'hyderabad': ['hyderabad', 'ghmc', 'telangana'],
            'pune': ['pune', 'pmc', 'pcmc'],
            'kolkata': ['kolkata', 'calcutta', 'kmc', 'west bengal']
        }
        
        # Load existing documents from metadata
        self.load_existing_documents()
        
    def load_existing_documents(self):
        """Load previously processed documents from metadata"""
        metadata_dir = 'data'
        if not os.path.exists(metadata_dir):
            return
            
        print("📂 Loading existing documents from metadata...")
        count = 0
        for filename in os.listdir(metadata_dir):
            if filename.endswith('.json'):
                try:
                    filepath = os.path.join(metadata_dir, filename)
                    with open(filepath, 'r') as f:
                        doc = json.load(f)
                        
                    # Add to memory
                    self.documents.append(doc)
                    
                    city = doc.get('city', 'unknown')
                    if city not in self.documents_by_city:
                        self.documents_by_city[city] = []
                    self.documents_by_city[city].append(doc)
                    count += 1
                except Exception as e:
                    print(f"⚠️ Error loading metadata {filename}: {e}")
                    
        print(f"✅ Loaded {count} documents from persistence.")
        
    def process_document(self, filepath, city='bangalore'):
        """Process a document and extract zoning rules"""
        file_ext = os.path.splitext(filepath)[1].lower()
        
        if file_ext == '.pdf':
            text = self._extract_from_pdf(filepath)
        elif file_ext == '.docx':
            text = self._extract_from_docx(filepath)
        elif file_ext == '.txt':
            text = self._extract_from_txt(filepath)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")
        
        # Detect city from document if not specified
        detected_city = self._detect_city(text)
        if detected_city:
            city = detected_city
            print(f"🔍 Detected city from document: {city}")
        
        # Extract structured data
        rules = self._extract_rules(text)
        
        # Create document record
        document = {
            'id': datetime.now().strftime('%Y%m%d%H%M%S') + str(len(self.documents)),
            'filename': os.path.basename(filepath),
            'filepath': filepath,
            'city': city,
            'processed_at': datetime.now().isoformat(),
            'rules': rules,
            'text_length': len(text)
        }
        
        self.documents.append(document)
        
        # Store in city-specific collection
        if city not in self.documents_by_city:
            self.documents_by_city[city] = []
        self.documents_by_city[city].append(document)
        
        # Save document metadata
        self._save_document_metadata(document)
        
        return document
    
    def _extract_from_pdf(self, filepath):
        """Extract text from PDF"""
        text = ""
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        return text
    
    def _extract_from_docx(self, filepath):
        """Extract text from DOCX"""
        doc = Document(filepath)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    
    def _extract_from_txt(self, filepath):
        """Extract text from TXT"""
        with open(filepath, 'r', encoding='utf-8') as f:
            text = f.read()
        return text
    
    def _extract_rules(self, text):
        """Extract zoning rules from text using NLP"""
        rules = []
        
        # Tokenize into sentences
        sentences = sent_tokenize(text.lower())
        
        for sentence in sentences:
            rule = self._parse_sentence_for_rules(sentence)
            if rule:
                rules.append(rule)
        
        return rules
    
    def _parse_sentence_for_rules(self, sentence):
        """Parse a sentence to extract zoning rules"""
        rule = {}
        
        # Check for zone type
        for zone_type in self.keywords['zone_type']:
            if zone_type in sentence:
                rule['zone_type'] = zone_type.replace('-use', '')
        
        # Extract FAR
        far_match = re.search(r'(?:far|fsi)[\s:]*(?:of|is|=)?[\s]*(\d+\.?\d*)', sentence)
        if far_match:
            rule['far'] = float(far_match.group(1))
        
        # Extract height
        height_match = re.search(r'(?:height|tall)[\s:]*(?:of|is|up to)?[\s]*(\d+)[\s]*(?:m|meter|metre|feet|ft)', sentence)
        if height_match:
            rule['max_height'] = int(height_match.group(1))
        
        # Extract coverage
        coverage_match = re.search(r'(?:coverage)[\s:]*(?:of|is)?[\s]*(\d+)[\s]*%', sentence)
        if coverage_match:
            rule['ground_coverage'] = int(coverage_match.group(1))
        
        # Extract setback
        setback_match = re.search(r'(?:setback)[\s:]*(?:of|is)?[\s]*(\d+)[\s]*(?:m|meter|metre|feet|ft)', sentence)
        if setback_match:
            rule['setback'] = int(setback_match.group(1))
        
        # Extract parking
        parking_match = re.search(r'(?:parking)[\s:]*(\d+)[\s]*(?:per|for every|/)[\s]*(\d+)[\s]*(?:sqm|sq\.m|square meter)', sentence)
        if parking_match:
            rule['parking'] = f"1 per {parking_match.group(2)} sqm"
        
        # Only return if we found at least 2 pieces of information
        if len(rule) >= 2:
            rule['source_sentence'] = sentence
            return rule
        
        return None
    
    def get_documents(self, city=None):
        """Get list of all processed documents, optionally filtered by city"""
        docs = self.documents

        if city:
            # Try exact match first
            exact = self.documents_by_city.get(city)
            if exact:
                docs = exact
            else:
                # Fall back to a normalized-match: compare lowercase without spaces/underscores
                target = city.lower().replace(' ', '').replace('_', '')
                matched = []
                for doc in self.documents:
                    doc_city = str(doc.get('city', 'unknown'))
                    if doc_city.lower() == city.lower():
                        matched.append(doc)
                        continue
                    if doc_city.lower().replace(' ', '').replace('_', '') == target:
                        matched.append(doc)
                docs = matched

        return [
            {
                'id': doc['id'],
                'filename': doc['filename'],
                'city': doc.get('city', 'unknown'),
                'processed_at': doc['processed_at'],
                'rules_count': len(doc['rules'])
            }
            for doc in docs
        ]
    
    def _detect_city(self, text):
        """Detect city from document text"""
        text_lower = text.lower()
        
        for city, keywords in self.city_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    return city
        
        return None
    
    def delete_document(self, doc_id):
        """Delete a document"""
        self.documents = [doc for doc in self.documents if doc['id'] != doc_id]
    
    def _save_document_metadata(self, document):
        """Save document metadata to JSON"""
        metadata_dir = 'data'
        os.makedirs(metadata_dir, exist_ok=True)
        
        metadata_file = os.path.join(metadata_dir, f"{document['id']}.json")
        
        # Don't save the full text, just metadata
        metadata = {
            'id': document['id'],
            'filename': document['filename'],
            'city': document.get('city', 'unknown'),
            'processed_at': document['processed_at'],
            'rules': document['rules'],
            'text_length': document['text_length']
        }
        
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
    
    def get_training_data(self):
        """Convert extracted rules to training data format"""
        training_data = []
        
        for doc in self.documents:
            for rule in doc['rules']:
                if 'zone_type' in rule and 'far' in rule:
                    # Create a training sample
                    sample = {
                        'zone_type': rule['zone_type'],
                        'far': rule.get('far', 2.0),
                        'max_height': rule.get('max_height', 30),
                        'ground_coverage': rule.get('ground_coverage', 50),
                        'setback': rule.get('setback', 5)
                    }
                    training_data.append(sample)
        
        return training_data
    
    def summarize_documents(self):
        """Get summary of all processed documents"""
        total_docs = len(self.documents)
        total_rules = sum(len(doc['rules']) for doc in self.documents)
        
        zone_types = {}
        for doc in self.documents:
            for rule in doc['rules']:
                if 'zone_type' in rule:
                    zt = rule['zone_type']
                    zone_types[zt] = zone_types.get(zt, 0) + 1
        
        return {
            'total_documents': total_docs,
            'total_rules_extracted': total_rules,
            'zone_types_found': zone_types,
            'average_rules_per_document': total_rules / total_docs if total_docs > 0 else 0
        }
