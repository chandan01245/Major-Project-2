"""
Environment variable validation.
Validates required environment variables on application startup.
"""

import os
import sys
from dotenv import load_dotenv


class EnvironmentValidationError(Exception):
    """Custom exception for environment validation errors."""
    pass


def validate_environment(required_vars=None, optional_vars=None, strict=False):
    """
    Validate environment variables.
    
    Args:
        required_vars: Dict of required variables {var_name: description}
        optional_vars: Dict of optional variables {var_name: (description, default_value)}
        strict: If True, raise exception on missing required vars. If False, warn only.
    
    Returns:
        Dict of validation results
    """
    # Load .env file explicitly
    current_dir = os.path.dirname(os.path.abspath(__file__)) # backend/validators
    backend_dir = os.path.dirname(current_dir) # backend
    project_root = os.path.dirname(backend_dir) # root

    load_dotenv(os.path.join(backend_dir, '.env'))
    load_dotenv(os.path.join(project_root, '.env'))
    
    results = {
        'valid': True,
        'missing_required': [],
        'missing_optional': [],
        'warnings': [],
        'errors': []
    }
    
    # Default required variables
    if required_vars is None:
        required_vars = {}
    
    # Default optional variables with defaults
    if optional_vars is None:
        optional_vars = {
            'WAQI_API_KEY': ('World Air Quality Index API key for AQI data', None),
            'MAPTILER_KEY': ('MapTiler API key for maps', None),
            'REACT_APP_MAPTILER_KEY': ('MapTiler API key for frontend', None),
        }
    
    # Check required variables
    for var_name, description in required_vars.items():
        value = os.getenv(var_name)
        if not value or value.strip() == '':
            results['valid'] = False
            results['missing_required'].append(var_name)
            error_msg = f'Required environment variable {var_name} is not set: {description}'
            results['errors'].append(error_msg)
            print(f'❌ {error_msg}')
    
    # Check optional variables
    for var_name, (description, default_value) in optional_vars.items():
        value = os.getenv(var_name)
        if not value or value.strip() == '':
            results['missing_optional'].append(var_name)
            warning_msg = f'Optional environment variable {var_name} is not set: {description}'
            results['warnings'].append(warning_msg)
            print(f'⚠️  {warning_msg}')
            
            if default_value is not None:
                os.environ[var_name] = str(default_value)
                print(f'   Using default value: {default_value}')
    
    # Raise exception if strict mode and missing required vars
    if strict and results['missing_required']:
        raise EnvironmentValidationError(
            f"Missing required environment variables: {', '.join(results['missing_required'])}"
        )
    
    return results


def validate_api_keys():
    """
    Validate API keys are present and have correct format.
    
    Returns:
        Dict of API key validation results
    """
    results = {
        'waqi': {'present': False, 'valid': False},
        'maptiler': {'present': False, 'valid': False}
    }
    
    # WAQI API Key
    waqi_key = os.getenv('WAQI_API_KEY', '')
    if waqi_key and waqi_key.strip():
        results['waqi']['present'] = True
        # WAQI keys are typically 40 character hex strings
        if len(waqi_key) >= 20:  # Relaxed validation
            results['waqi']['valid'] = True
            print('✅ WAQI API key configured')
        else:
            print('⚠️  WAQI API key seems invalid (too short)')
    else:
        print('⚠️  WAQI API key not configured - AQI features will use fallback data')
    
    # MapTiler API Key
    maptiler_key = os.getenv('MAPTILER_KEY') or os.getenv('REACT_APP_MAPTILER_KEY', '')
    if maptiler_key and maptiler_key.strip():
        results['maptiler']['present'] = True
        # MapTiler keys vary in length but should be alphanumeric
        if len(maptiler_key) >= 10 and maptiler_key.replace('-', '').isalnum():
            results['maptiler']['valid'] = True
            print('✅ MapTiler API key configured')
        else:
            print('⚠️  MapTiler API key seems invalid')
    else:
        print('⚠️  MapTiler API key not configured - map features may not work')
    
    return results


def validate_paths():
    """
    Validate required directories exist and are writable.
    
    Returns:
        Dict of path validation results
    """
    required_dirs = [
        'data',
        'uploads',
        'zoning-documents',
        'models'
    ]
    
    results = {
        'valid': True,
        'missing_dirs': [],
        'unwritable_dirs': []
    }
    
    for dir_name in required_dirs:
        dir_path = os.path.join(os.getcwd(), dir_name)
        
        if not os.path.exists(dir_path):
            print(f'📁 Creating directory: {dir_path}')
            try:
                os.makedirs(dir_path, exist_ok=True)
            except Exception as e:
                results['valid'] = False
                results['missing_dirs'].append(dir_name)
                print(f'❌ Failed to create directory {dir_name}: {e}')
                continue
        
        # Check if writable
        if not os.access(dir_path, os.W_OK):
            results['valid'] = False
            results['unwritable_dirs'].append(dir_name)
            print(f'❌ Directory {dir_name} is not writable')
        else:
            print(f'✅ Directory {dir_name} is accessible')
    
    return results


def validate_python_version(min_version=(3, 7)):
    """
    Validate Python version meets minimum requirements.
    
    Args:
        min_version: Tuple of (major, minor) version
    
    Returns:
        (is_valid, current_version, message)
    """
    current_version = sys.version_info[:2]
    
    if current_version < min_version:
        message = f'Python {min_version[0]}.{min_version[1]}+ required, but {current_version[0]}.{current_version[1]} found'
        print(f'❌ {message}')
        return False, current_version, message
    
    print(f'✅ Python version {current_version[0]}.{current_version[1]} meets requirements')
    return True, current_version, 'OK'


def validate_nltk_data():
    """
    Check if required NLTK data is downloaded.
    
    Returns:
        (is_valid, missing_data)
    """
    try:
        import nltk
        required_data = ['punkt', 'stopwords', 'wordnet']
        missing_data = []
        
        for data_name in required_data:
            try:
                nltk.data.find(f'tokenizers/{data_name}' if data_name == 'punkt' else f'corpora/{data_name}')
            except LookupError:
                missing_data.append(data_name)
        
        if missing_data:
            print(f'⚠️  NLTK data missing: {", ".join(missing_data)}')
            print('   Attempting to download...')
            for data_name in missing_data:
                try:
                    nltk.download(data_name, quiet=True)
                    print(f'   ✅ Downloaded {data_name}')
                except Exception as e:
                    print(f'   ❌ Failed to download {data_name}: {e}')
            return False, missing_data
        
        print('✅ NLTK data is available')
        return True, []
        
    except ImportError:
        print('⚠️  NLTK not installed')
        return False, ['nltk package']


def startup_validation(strict=False):
    """
    Run all startup validations.
    
    Args:
        strict: If True, exit on critical errors
    
    Returns:
        Overall validation results
    """
    print('\n' + '='*60)
    print('🔍 ENVIRONMENT VALIDATION')
    print('='*60 + '\n')
    
    all_valid = True
    
    # Python version
    python_valid, _, _ = validate_python_version()
    all_valid = all_valid and python_valid
    
    # Environment variables
    env_results = validate_environment(strict=False)
    all_valid = all_valid and env_results['valid']
    
    # API keys
    api_results = validate_api_keys()
    
    # Paths
    path_results = validate_paths()
    all_valid = all_valid and path_results['valid']
    
    # NLTK data
    nltk_valid, _ = validate_nltk_data()
    
    print('\n' + '='*60)
    if all_valid:
        print('✅ ENVIRONMENT VALIDATION PASSED')
    else:
        print('⚠️  ENVIRONMENT VALIDATION COMPLETED WITH WARNINGS')
        if strict:
            print('❌ Exiting due to validation errors (strict mode)')
            sys.exit(1)
    print('='*60 + '\n')
    
    return {
        'valid': all_valid,
        'python': python_valid,
        'environment': env_results,
        'api_keys': api_results,
        'paths': path_results,
        'nltk': nltk_valid
    }
