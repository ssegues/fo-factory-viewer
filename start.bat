@echo off
rem Starts the local server (if it is not already running) and opens the viewer in the default browser.
rem   start.bat             opens the first real extract under data\local, or the sample if there is none
rem   start.bat sample      opens the sample data
rem   start.bat local/xyz   opens data\local\xyz
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22 or later is required: https://nodejs.org
  pause
  exit /b 1
)

set "DATASET=%~1"
if not defined DATASET for /d %%D in (data\local\*) do if exist "%%D\snapshot.json" if not defined DATASET set "DATASET=local/%%~nxD"
if not defined DATASET set "DATASET=sample"
set "URL=http://127.0.0.1:4174/viewer/?data=%DATASET%"

netstat -ano | findstr /c:":4174 " | findstr LISTENING >nul
if errorlevel 1 (
  echo Starting the FO Factory Viewer server...
  start "FO Factory Viewer server" /min node tools\serve.mjs
  ping -n 3 127.0.0.1 >nul
) else (
  echo The server is already running.
)

echo Opening %URL%
start "" "%URL%"
endlocal
