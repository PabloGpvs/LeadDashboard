@echo off
title LeadDashboard
cd /d "%~dp0"
echo Encerrando servidor anterior (se houver)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":3000 "') do taskkill /PID %%p /T /F >nul 2>&1
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'nodemon' -and $_.CommandLine -match 'LeadDashboard' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
timeout /t 2 >nul
echo Abrindo o VS Code...
call code .
if not exist node_modules (
  echo Instalando dependencias...
  call npm install
)
echo Atualizando o banco de dados...
call npx prisma db push
if errorlevel 1 (
  echo.
  echo Erro ao atualizar o banco. Veja a mensagem acima.
  pause
  exit /b 1
)
echo Abrindo o navegador em alguns segundos...
start "" cmd /c "timeout /t 6 >nul & start http://localhost:3000"
echo Iniciando o servidor (feche esta janela para parar)...
call npm run dev
pause
