@echo off
title Push Sports Club IIM Raipur to GitHub
echo ========================================================
echo   Uploading Sports Club IIM Raipur to your GitHub!
echo ========================================================
echo.
set "PATH=%USERPROFILE%\.git-bin\cmd;%PATH%"

echo Connecting to your repository: https://github.com/Tripat81200/sports-club-iim-raipur.git
git remote set-url origin https://github.com/Tripat81200/sports-club-iim-raipur.git
echo Preparing latest changes...
git add .
git commit -m "Update Sports Club IIM Raipur portal" >nul 2>&1

echo.
echo Pushing your code to GitHub...
echo (If a browser window opens, please click 'Sign in with your browser')
echo.
git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   SUCCESS! All code has been uploaded to GitHub!
    echo ========================================================
    echo You can now go to https://render.com and connect your repo.
) else (
    echo.
    echo Something went wrong. Please check your GitHub login or internet connection.
)
echo.
pause
