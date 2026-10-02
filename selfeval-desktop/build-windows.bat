@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Please install Node.js LTS first: https://nodejs.org & pause & exit /b 1)
call npm install || (echo npm install failed & pause & exit /b 1)
call npm run dist:win || (echo build failed & pause & exit /b 1)
echo.
echo Done. The installer is inside the "dist" folder (SelfEvaluation Setup *.exe)
explorer dist
pause
