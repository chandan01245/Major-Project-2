@echo off
REM Docker Quick Start Script for UrbanForm Pro
REM This script helps you get started with Docker deployment

echo ============================================
echo  UrbanForm Pro - Docker Quick Start
echo ============================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

echo [OK] Docker is installed
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Check if .env file exists
if not exist ".env" (
    echo [SETUP] Creating .env file from template...
    copy .env.example .env
    echo.
    echo [ACTION REQUIRED] Please edit .env file and add your MapTiler API key
    echo Get your free API key from: https://www.maptiler.com/cloud/
    echo.
    echo After adding your API key, run this script again.
    pause
    exit /b 0
)

echo [OK] .env file found
echo.

REM Check if MAPTILER_KEY is set
findstr /C:"MAPTILER_KEY=your_maptiler_api_key_here" .env >nul
if not errorlevel 1 (
    echo [WARNING] MapTiler API key not configured in .env
    echo Please edit .env file and replace 'your_maptiler_api_key_here' with your actual API key
    echo Get your free API key from: https://www.maptiler.com/cloud/
    echo.
    set /p continue="Continue anyway? (y/N): "
    if /i not "%continue%"=="y" (
        exit /b 0
    )
)

echo.
echo ============================================
echo  Building and Starting Services
echo ============================================
echo.
echo This may take several minutes on first run...
echo.

REM Build and start services
docker-compose up --build

REM If user pressed Ctrl+C, clean up
echo.
echo ============================================
echo  Shutting Down
echo ============================================
echo.
docker-compose down

echo.
echo Services stopped. Run this script again to restart.
pause
