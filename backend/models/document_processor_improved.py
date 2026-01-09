import json
import os
import re
from collections import defaultdict
from datetime import datetime

import pdfplumber
from docx import Document
from nltk.tokenize import sent_tokenize

# Minimal NLTK usage for speed
# No stopwords, no POS tagging, no chunking - just basic tokenization if needed

class ImprovedDocumentProcessor:
    """
    Enhanced NLP-based document processor for zoning regulations
    ULTRA-FAST MODE: Optimized for 1-2 minute processing
    """
    
    def __init__(self):
        self.documents = []
        self.documents_by_city = {}
        self.storage_file = 'data/extracted_rules.json'
        
        # Enhanced keywords with patterns
        self.rule_patterns = {
            'far': {
                'keywords': ['far', 'floor area ratio', 'fsi', 'floor space index', 'plot ratio'],
                'patterns': [
                    r'(?:far|fsi|floor\s+(?:area|space)\s+(?:ratio|index))\s*(?:of|is|shall\s+be|:|=)?\s*([0-9.]+(?:\s*[-–to]\s*[0-9.]+)?)',
                    r'(?:maximum|max\.?|minimum|min\.?)\s+(?:far|fsi)\s*(?:of|is|:|=)?\s*([0-9.]+)',
                    r'([0-9.]+)\s+(?:far|fsi)'
                ],
                'unit': 'ratio'
            },
            'height': {
                'keywords': ['height', 'building height', 'maximum height', 'storey', 'stories', 'floors'],
                'patterns': [
                    r'(?:maximum|max\.?|permissible)\s+height\s*(?:of|is|shall\s+be|:|=)?\s*([0-9.]+)\s*(m|meters|metre|feet|ft)',
                    r'height\s+(?:not\s+to\s+exceed|limited\s+to|up\s+to)\s+([0-9.]+)\s*(m|meters|metre|feet|ft)',
                    r'([0-9]+)\s+(?:storey|stories|floors?)'
                ],
                'unit': 'meters/floors'
            },
            'coverage': {
                'keywords': ['coverage', 'ground coverage', 'site coverage', 'building coverage', 'built-up area'],
                'patterns': [
                    r'(?:ground|site|building)\s+coverage\s*(?:of|is|shall\s+be|:|=)?\s*([0-9.]+)\s*%',
                    r'([0-9.]+)\s*%\s+(?:ground|site)\s+coverage',
                    r'(?:maximum|max\.?)\s+coverage\s*(?::|=)?\s*([0-9.]+)\s*%'
                ],
                'unit': 'percentage'
            },
            'setback': {
                'keywords': ['setback', 'building line', 'margin', 'buffer', 'frontage', 'side yard', 'rear yard'],
                'patterns': [
                    r'(?:front|rear|side)\s+(?:setback|margin)\s*(?:of|is|shall\s+be|:|=)?\s*([0-9.]+)\s*(m|meters|metre|feet|ft)',
                    r'setback\s+(?:from\s+)?(?:road|boundary)\s*(?::|=)?\s*([0-9.]+)\s*(m|meters|metre|feet|ft)',
                    r'minimum\s+(?:front|rear|side)\s+space\s*(?::|=)?\s*([0-9.]+)\s*(m|meters|metre|feet|ft)'
                ],
                'unit': 'meters'
            },
            'parking': {
                'keywords': ['parking', 'car parking', 'vehicle parking', 'parking space', 'parking requirement'],
                'patterns': [
                    r'([0-9.]+)\s+(?:car\s+)?parking\s+(?:space|slot)s?\s+per\s+([0-9.]+)\s*(sqm|sq\.?\s*m|square\s+meters?)',
                    r'(?:minimum|required)\s+parking\s*(?::|=)?\s*([0-9.]+)\s+(?:space|slot|car)s?\s+per\s+unit',
                    r'parking\s+(?:ratio|requirement)\s*(?::|=)?\s*([0-9.]+)(?:\s+per\s+([0-9.]+)\s*(sqm|unit))?'
                ],
                'unit': 'spaces/area'
            },
            'open_space': {
                'keywords': ['open space', 'recreational space', 'green space', 'common area'],
                'patterns': [
                    r'(?:minimum|min\.?)\s+open\s+space\s*(?::|=)?\s*([0-9.]+)\s*%',
                    r'([0-9.]+)\s*%\s+(?:of\s+)?(?:plot|site)\s+(?:area\s+)?(?:as|for)\s+open\s+space',
                    r'open\s+space\s+(?:requirement|shall\s+be)\s*(?::|=)?\s*([0-9.]+)\s*%'
                ],
                'unit': 'percentage'
            },
            'density': {
                'keywords': ['density', 'dwelling units', 'units per', 'population density'],
                'patterns': [
                    r'([0-9.]+)\s+(?:dwelling\s+)?units?\s+per\s+(?:hectare|acre)',
                    r'(?:maximum|max\.?)\s+density\s*(?::|=)?\s*([0-9.]+)\s+(?:units?\s+per|units?/)',
                    r'density\s+(?:not\s+to\s+exceed|limited\s+to)\s+([0-9.]+)'
                ],
                'unit': 'units/area'
            },
            'zone_type': {
                'keywords': ['residential', 'commercial', 'industrial', 'mixed', 'mixed-use', 'institutional'],
                'patterns': [
                    r'(?:zone|area|district)\s+(?:is|classified\s+as|designated\s+for)\s+(\w+)',
                    r'(\w+)\s+zone',
                    r'(?:for|under)\s+(\w+)\s+use'
                ],
                'unit': 'category'
            }
        }
        
        # City detection patterns
        self.city_patterns = {
            'bangalore': ['bangalore', 'bengaluru', 'bbmp', 'bda', 'bruhat bengaluru mahanagara palike'],
            'mumbai': ['mumbai', 'bombay', 'mcgm', 'brihanmumbai', 'bmc'],
            'delhi': ['delhi', 'new delhi', 'dda', 'delhi development authority', 'ndmc'],
            'chennai': ['chennai', 'madras', 'cmda', 'chennai metropolitan'],
            'hyderabad': ['hyderabad', 'ghmc', 'greater hyderabad'],
            'pune': ['pune', 'pmc', 'pcmc', 'pune municipal'],
            'kolkata': ['kolkata', 'calcutta', 'kmc', 'kolkata municipal'],
            'new_york': ['new york', 'nyc', 'new york city', 'manhattan', 'brooklyn'],
            'singapore': ['singapore', 'ura', 'urban redevelopment authority']
        }
        
        # Load existing rules
        self.load_stored_rules()
    
    def load_stored_rules(self):
        """Load permanently stored rules from JSON file"""
        os.makedirs('data', exist_ok=True)
        
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r', encoding='utf-8') as f:
                    stored_data = json.load(f)
                    self.documents = stored_data.get('documents', [])
                    self.documents_by_city = stored_data.get('documents_by_city', {})
                print(f"✅ Loaded {len(self.documents)} stored documents with extracted rules")
            except Exception as e:
                print(f"⚠️ Error loading stored rules: {e}")
                self.documents = []
                self.documents_by_city = {}
    
    def save_rules_permanently(self):
        """Save all extracted rules to permanent storage - FAST VERSION"""
        try:
            data = {
                'documents': self.documents,
                'documents_by_city': self.documents_by_city,
                'last_updated': datetime.now().isoformat()
            }
            
            # Fast write without pretty formatting
            with open(self.storage_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False)  # No indent for speed
            
            print(f"💾 Rules saved to {self.storage_file}")
            return True
        except Exception as e:
            print(f"❌ Error saving rules: {e}")
            return False
    
    def process_document(self, file_path, city='bangalore', progress_callback=None):
        """
        Process document with enhanced NLP extraction
        ULTRA-FAST MODE: Completes in 1-2 minutes max
        
        Args:
            file_path: Path to document
            city: City name
            progress_callback: Optional function to call with progress updates (progress, message)
        """
        import time
        start_time = time.time()
        
        def update_progress(progress, message):
            """Helper to update progress"""
            if progress_callback:
                progress_callback(progress, message)
            print(f"⚡ [{progress}%] {message}")
        
        update_progress(5, f"Processing document: {os.path.basename(file_path)}")
        
        # Extract text with timeout
        update_progress(10, "Extracting text from document...")
        text = self._extract_text_fast(file_path)
        if not text:
            raise Exception("Could not extract text from document")
        
        elapsed = time.time() - start_time
        update_progress(30, f"Extracted {len(text)} characters in {elapsed:.1f}s")
        
        # Quick city detection (limited search)
        update_progress(35, "Detecting city from content...")
        detected_city = self._detect_city_fast(text[:5000])  # Only check first 5000 chars
        if detected_city and detected_city != 'unknown':
            city = detected_city
            update_progress(40, f"Detected city: {city}")
        
        # Extract rules with strict time limit
        update_progress(45, "Extracting zoning rules...")
        rules = self._extract_rules_ultra_fast(text, progress_callback=progress_callback)
        elapsed = time.time() - start_time
        update_progress(75, f"Extracted {len(rules)} rules in {elapsed:.1f}s")
        
        # Create lightweight document metadata (skip some fields for speed)
        update_progress(80, "Saving extracted rules...")
        doc_id = f"{city}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        document = {
            'id': doc_id,
            'filename': os.path.basename(file_path),
            'city': city,
            'processed_at': datetime.now().isoformat(),
            'text_length': len(text),
            'rules': rules,
            'rule_count': len(rules),
            'summary': {'total_rules': len(rules)}  # Simplified summary for speed
        }
        
        # Add to memory
        self.documents.append(document)
        if city not in self.documents_by_city:
            self.documents_by_city[city] = []
        self.documents_by_city[city].append(document)
        
        # Save permanently (async would be even faster, but sync is safer)
        update_progress(90, "Saving to permanent storage...")
        self.save_rules_permanently()
        
        total_time = time.time() - start_time
        update_progress(100, f"Complete! Total time: {total_time:.1f}s")
        
        return document
    
    def _extract_text_fast(self, file_path):
        """Extract text from document - ULTRA FAST MODE"""
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if ext == '.pdf':
                text = ""
                with pdfplumber.open(file_path) as pdf:
                    # Limit to first 20 pages for speed
                    max_pages = min(30, len(pdf.pages))
                    print(f"⚡ Processing {max_pages} pages (speed mode)")
                    
                    for i, page in enumerate(pdf.pages[:max_pages]):
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                        
                        # Stop if we have enough text (50KB is plenty)
                        if len(text) > 50000:
                            print(f"⚡ Stopping at page {i+1} - sufficient text extracted")
                            break
                return text
            
            elif ext == '.docx':
                doc = Document(file_path)
                # Limit to first 50 paragraphs
                paragraphs = doc.paragraphs[:50]
                return "\n".join([para.text for para in paragraphs])
            
            elif ext == '.txt':
                # Read only first 50KB
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read(50000)
            
            else:
                raise Exception(f"Unsupported file format: {ext}")
        
        except Exception as e:
            print(f"❌ Error extracting text: {e}")
            return None
    
    def _detect_city_fast(self, text):
        """Detect city quickly - only check beginning of document"""
        text_lower = text.lower()
        
        for city, patterns in self.city_patterns.items():
            for pattern in patterns:
                if pattern in text_lower:
                    return city
        
        return 'unknown'
    
    def _extract_rules_ultra_fast(self, text, progress_callback=None):
        """
        ULTRA FAST rule extraction - completes in seconds
        Aggressive optimizations for speed
        """
        import time
        start = time.time()
        
        def update_progress(progress, message):
            if progress_callback:
                progress_callback(progress, message)
        
        rules = []
        
        # Limit text size aggressively
        update_progress(50, "Analyzing document content...")
        max_chars = 30000  # Only process first 30KB
        if len(text) > max_chars:
            text = text[:max_chars]
            print(f"⚡ Text limited to {max_chars} chars for speed")
        
        # Clean text (minimal processing)
        text = re.sub(r'\s+', ' ', text)
        
        # Use simple split instead of NLTK (much faster)
        sentences = text.split('. ')[:200]  # Max 200 sentences
        print(f"⚡ Processing {len(sentences)} sentences")
        
        # Pre-compile ALL patterns once
        update_progress(55, "Preparing pattern matchers...")
        if not hasattr(self, '_compiled_patterns'):
            self._compiled_patterns = {}
            for category, config in self.rule_patterns.items():
                self._compiled_patterns[category] = {
                    'keywords': config['keywords'],
                    'patterns': [re.compile(p, re.IGNORECASE) for p in config['patterns']],
                    'unit': config['unit']
                }
        
        # Extract rules from priority categories only
        priority_categories = ['far', 'height', 'coverage', 'setback', 'parking']
        
        total_categories = len(priority_categories)
        for idx, category in enumerate(priority_categories):
            if category not in self._compiled_patterns:
                continue
            
            # Update progress for each category
            progress = 55 + (idx / total_categories) * 15  # 55% to 70%
            update_progress(int(progress), f"Extracting {category} rules...")
                
            config = self._compiled_patterns[category]
            keywords = config['keywords']
            patterns = config['patterns']
            unit = config['unit']
            
            # Quick scan
            for sentence in sentences:
                sentence_lower = sentence.lower()
                
                # Quick keyword check
                if not any(kw in sentence_lower for kw in keywords):
                    continue
                
                # Try patterns
                for pattern in patterns:
                    try:
                        match = pattern.search(sentence)
                        if match:
                            rules.append({
                                'category': category,
                                'value': match.group(1),
                                'unit': unit,
                                'context': sentence[:150],  # Short context
                                'confidence': 0.85
                            })
                            
                            # Limit rules per category for speed
                            if len([r for r in rules if r['category'] == category]) >= 10:
                                break
                    except:
                        continue
                
                # Stop if we have enough rules total
                if len(rules) >= 50:
                    print(f"⚡ Stopping - extracted {len(rules)} rules (sufficient)")
                    break
            
            if len(rules) >= 50:
                break
            
            # Timeout check - abort if taking too long
            if time.time() - start > 30:  # Max 30 seconds for rule extraction
                print(f"⚡ Timeout - extracted {len(rules)} rules in 30s")
                break
        
        # Fast deduplication
        update_progress(70, "Removing duplicates...")
        seen = set()
        unique = []
        for rule in rules:
            key = f"{rule['category']}_{rule['value']}"
            if key not in seen:
                seen.add(key)
                unique.append(rule)
        
        elapsed = time.time() - start
        print(f"⚡ Rule extraction completed in {elapsed:.1f}s")
        
        return unique
    
    def _extract_rules_advanced(self, text):
        """
        Advanced rule extraction using multiple NLP techniques
        OPTIMIZED for speed
        """
        rules = []
        
        # Clean and normalize text (faster operations)
        text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
        text = re.sub(r'[''"""]', '', text)  # Remove fancy quotes
        
        # Split into sentences for better context (cached)
        sentences = sent_tokenize(text)
        # Limit processing for very large documents (speed optimization)
        max_sentences = 500  # Process first 500 sentences max
        if len(sentences) > max_sentences:
            print(f"⚡ Large document detected. Processing first {max_sentences} sentences for speed.")
            sentences = sentences[:max_sentences]
        
        # Extract rules for each category (parallelizable in future)
        for category, config in self.rule_patterns.items():
            category_rules = self._extract_category_rules(sentences, category, config)
            rules.extend(category_rules)
            
            # Early termination if we have enough rules (speed optimization)
            if len(rules) > 100:
                print(f"⚡ Speed optimization: Stopping after {len(rules)} rules extracted")
                break
        
        # Skip expensive operations for speed (can be enabled if needed)
        # table_rules = self._extract_table_rules(text)
        # rules.extend(table_rules)
        
        # conditional_rules = self._extract_conditional_rules(sentences)
        # rules.extend(conditional_rules)
        
        # Remove duplicates (fast hash-based)
        unique_rules = self._deduplicate_rules(rules)
        
        return unique_rules
    
    def _extract_category_rules(self, sentences, category, config):
        """Extract rules for a specific category - OPTIMIZED"""
        rules = []
        keywords = config['keywords']
        patterns = config['patterns']
        
        # Pre-compile patterns for speed (cache this in __init__ for production)
        compiled_patterns = [re.compile(p, re.IGNORECASE) for p in patterns]
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            
            # Quick keyword check first (fast filter)
            if not any(keyword in sentence_lower for keyword in keywords):
                continue
            
            # Try each pattern only if keywords match
            for pattern in compiled_patterns:
                matches = pattern.finditer(sentence)
                for match in matches:
                    rule = {
                        'category': category,
                        'value': match.group(1),
                        'unit': config['unit'],
                        'context': sentence.strip()[:200],  # Limit context length for speed
                        'confidence': 0.9,
                        'extracted_at': datetime.now().isoformat()
                    }
                    
                    # Skip additional info extraction for speed
                    # if len(match.groups()) > 1:
                    #     rule['additional_info'] = match.groups()[1:]
                    
                    rules.append(rule)
                    
                    # Limit rules per category (speed optimization)
                    if len(rules) >= 20:
                        return rules
        
        return rules
    
    def _extract_table_rules(self, text):
        """Extract rules from tables (simplified approach)"""
        rules = []
        
        # Look for tabular patterns (rows with | or tabs)
        table_pattern = r'([^|\n]+\|[^|\n]+(?:\|[^|\n]+)*)'
        tables = re.findall(table_pattern, text)
        
        for table_row in tables:
            cells = [cell.strip() for cell in table_row.split('|')]
            
            # Try to extract numeric values with context
            for i, cell in enumerate(cells):
                if re.search(r'\d+\.?\d*', cell):
                    context = ' '.join(cells[:i+1])
                    rules.append({
                        'category': 'table_data',
                        'value': cell,
                        'context': context,
                        'confidence': 0.7,
                        'extracted_at': datetime.now().isoformat()
                    })
        
        return rules
    
    def _extract_conditional_rules(self, sentences):
        """Extract conditional/if-then rules"""
        rules = []
        
        conditional_patterns = [
            r'(?:if|when|where)\s+([^,]+),\s+(?:then\s+)?([^.]+)',
            r'(?:for|in case of)\s+([^,]+),\s+([^.]+)',
        ]
        
        for sentence in sentences:
            for pattern in conditional_patterns:
                matches = re.finditer(pattern, sentence, re.IGNORECASE)
                for match in matches:
                    rules.append({
                        'category': 'conditional',
                        'condition': match.group(1).strip(),
                        'consequence': match.group(2).strip(),
                        'context': sentence.strip(),
                        'confidence': 0.8,
                        'extracted_at': datetime.now().isoformat()
                    })
        
        return rules
    
    def _deduplicate_rules(self, rules):
        """Remove duplicate rules"""
        seen = set()
        unique_rules = []
        
        for rule in rules:
            # Create a key based on category and value
            key = f"{rule.get('category', '')}_{rule.get('value', '')}_{rule.get('context', '')[:50]}"
            if key not in seen:
                seen.add(key)
                unique_rules.append(rule)
        
        return unique_rules
    
    def _generate_summary(self, rules):
        """Generate a summary of extracted rules"""
        summary = {
            'total_rules': len(rules),
            'by_category': {}
        }
        
        for rule in rules:
            category = rule.get('category', 'other')
            if category not in summary['by_category']:
                summary['by_category'][category] = 0
            summary['by_category'][category] += 1
        
        return summary
    
    def get_documents(self, city=None):
        """Get documents, optionally filtered by city"""
        if city:
            return self.documents_by_city.get(city, [])
        return self.documents
    
    def delete_document(self, doc_id):
        """Delete a document and save changes"""
        self.documents = [d for d in self.documents if d['id'] != doc_id]
        
        # Rebuild documents_by_city
        self.documents_by_city = {}
        for doc in self.documents:
            city = doc.get('city', 'unknown')
            if city not in self.documents_by_city:
                self.documents_by_city[city] = []
            self.documents_by_city[city].append(doc)
        
        # Save changes
        self.save_rules_permanently()
