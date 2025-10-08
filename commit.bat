@echo off
cd /d "%~dp0"
set /p msg=Nhập nội dung commit: 
git add .
git commit -m "%msg%"
git push
pause
