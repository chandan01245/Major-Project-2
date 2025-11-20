@echo off
echo Setting up Python Virtual Environment...

if not exist "venv" (
    echo Creating venv...
    python -m venv venv
) else (
    echo venv already exists.
)

echo Activating venv...
call venv\Scripts\activate

echo Installing requirements...
pip install -r requirements.txt

echo Setup complete!
pause
