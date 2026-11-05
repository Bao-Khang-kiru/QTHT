@echo off
title Local Server - He Thong Thi Trac Nghiem ELSE
echo ================================================================
echo   DANG KHOI CHAY LOCAL HTTP SERVER (PORT 8080)
echo ================================================================
echo.
echo Dang mo dia chi http://localhost:8080 tren trinh duyet...
start http://localhost:8080/
echo.
echo Server dang lang nghe tai cong 8080. Nhan Ctrl + C de dung server.
python -m http.server 8080
pause
