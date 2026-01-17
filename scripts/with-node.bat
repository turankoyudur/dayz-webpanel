@echo off
setlocal EnableExtensions

REM =============================================================
REM scripts\with-node.bat
REM
REM Runs a command using the project's portable Node.js if present.
REM Usage:
REM   call scripts\with-node.bat npm install
REM =============================================================

cd /d "%~dp0\.."

set "LOCAL_NODE_DIR=%CD%\tools\node\current"
if exist "%LOCAL_NODE_DIR%\node.exe" (
  set "PATH=%LOCAL_NODE_DIR%;%PATH%"
)

%*
exit /b %errorlevel%
