@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   BreezeDock Build Script
echo ========================================
echo.

:: Get the project root directory
set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

:: Set environment
set "NODE_ENV=production"

echo [1/5] Cleaning previous builds...
echo.

:: Clean dist folder
if exist "dist" rmdir /s /q "dist"
echo Dist folder cleaned.

:: Clean Tauri target folder
if exist "src-tauri\target" rmdir /s /q "src-tauri\target"
echo Tauri target folder cleaned.
echo.

echo [2/5] Installing dependencies...
echo.
call pnpm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)
echo.

echo [3/5] Running TypeScript type checking...
echo.
call pnpm run type-check
if errorlevel 1 (
    echo ERROR: Type checking failed
    exit /b 1
)
echo.

echo [4/5] Building frontend (production)...
echo.
call pnpm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed
    exit /b 1
)
echo.

echo [5/5] Building Tauri application...
echo.
call pnpm run tauri:build
if errorlevel 1 (
    echo ERROR: Tauri build failed
    exit /b 1
)
echo.

echo ========================================
echo   Build completed successfully!
echo ========================================
echo.
echo Output location: src-tauri\target\release\bundle\
echo.

pause
