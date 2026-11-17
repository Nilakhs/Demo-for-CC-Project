@echo off
setlocal enabledelayedexpansion
title GPU Node Scheduling Dashboard (React + FastAPI)
echo ======================================================================
echo Launching Modern GPU Node Scheduling Dashboard...
echo ======================================================================

set "PY_EXE="

:: 1. Try py -3 (Python Launcher for Windows)
py -3 -c "import sys; sys.exit(0)" >nul 2>nul
if !ERRORLEVEL! EQU 0 (
    set "PY_EXE=py -3"
    goto :found_python
)

:: 2. Try python, but verify it actually runs (rejects WindowsApps stub)
python -c "import sys; sys.exit(0)" >nul 2>nul
if !ERRORLEVEL! EQU 0 (
    set "PY_EXE=python"
    goto :found_python
)

:: 3. Try pythoncore / Microsoft Python local paths
if exist "%LOCALAPPDATA%\Python\pythoncore-3.11-64\python.exe" (
    "%LOCALAPPDATA%\Python\pythoncore-3.11-64\python.exe" -c "import sys; sys.exit(0)" >nul 2>nul
    if !ERRORLEVEL! EQU 0 (
        set "PY_EXE=%LOCALAPPDATA%\Python\pythoncore-3.11-64\python.exe"
        goto :found_python
    )
)

:: 4. Try standard Python installations
for %%P in (
    "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "%ProgramFiles%\Python313\python.exe"
    "%ProgramFiles%\Python312\python.exe"
    "%ProgramFiles%\Python311\python.exe"
    "%ProgramFiles%\Python310\python.exe"
    "C:\Python312\python.exe"
    "C:\Python311\python.exe"
) do (
    if exist "%%~P" (
        "%%~P" -c "import sys; sys.exit(0)" >nul 2>nul
        if !ERRORLEVEL! EQU 0 (
            set "PY_EXE=%%~P"
            goto :found_python
        )
    )
)

:found_python
if "%PY_EXE%"=="" (
    echo [ERROR] No functional Python interpreter found on PATH or standard directories.
    echo.
    echo If Python is installed, the Windows Microsoft Store execution alias may be
    echo shadowing it. You can resolve this by:
    echo   1. Opening Windows Settings ^> Apps ^> Advanced app settings ^> App execution aliases
    echo   2. Turning OFF "App Installer" for python.exe and python3.exe
    echo   3. Or ensuring Python is installed and added to your System PATH.
    echo.
    pause
    exit /b 1
)

echo [*] Using Python: %PY_EXE%

if not exist "%~dp0ui_modern\frontend\node_modules\" (
    echo [*] Initial setup: Installing frontend dependencies...
    pushd "%~dp0ui_modern\frontend"
    call npm install
    popd
)

%PY_EXE% "%~dp0ui_modern\run_dashboard.py"
pause
