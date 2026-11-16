@echo off
title GPU Node Scheduling Dashboard (React + FastAPI)
echo ======================================================================
echo Launching Modern GPU Node Scheduling Dashboard...
echo ======================================================================

set PY_EXE=""

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PY_EXE=python
) else (
    where py >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set PY_EXE=py -3
    ) else (
        if exist "C:\Users\nilak\AppData\Local\Python\pythoncore-3.11-64\python.exe" (
            set PY_EXE="C:\Users\nilak\AppData\Local\Python\pythoncore-3.11-64\python.exe"
        )
    )
)

if %PY_EXE%=="" (
    echo [ERROR] Python not found on PATH or in standard directory.
    echo Please install Python 3.11+ and ensure it is added to PATH.
    pause
    exit /b 1
)

%PY_EXE% "%~dp0ui_modern\run_dashboard.py"
pause
