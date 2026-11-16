@echo off
title GPU Node Scheduling Dashboard (React + FastAPI)
echo ======================================================================
echo Launching Modern GPU Node Scheduling Dashboard...
echo ======================================================================

set PYTHON_PATH="C:\Users\nilak\AppData\Local\Python\pythoncore-3.11-64\python.exe"

if exist %PYTHON_PATH% (
    %PYTHON_PATH% "%~dp0ui_modern\run_dashboard.py"
) else (
    python "%~dp0ui_modern\run_dashboard.py"
)

pause
