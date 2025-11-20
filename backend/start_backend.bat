@echo off
echo ==========================================
echo  Python ML Backend for Zoning Analysis
echo ==========================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate

REM Check if dependencies are installed
if not exist "venv\Lib\site-packages\flask\" (
    echo Installing dependencies...
    pip install -r requirements.txt
    echo.
)

echo.
echo Starting ML Backend Server...
echo Server will be available at http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py

pause
