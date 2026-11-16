@echo off
setlocal
set "CREATOR_ROOT=%~dp0"
cd /d "%~dp0"
echo Abriendo Clan Creator...
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $creatorRoot=$env:CREATOR_ROOT; $creatorNode=Join-Path $creatorRoot 'runtime/node.exe'; if(-not (Test-Path -LiteralPath $creatorNode)){ $creatorNode=(Get-Command node.exe -ErrorAction Stop).Source }; & $creatorNode (Join-Path $creatorRoot 'scripts/launch.mjs'); exit $LASTEXITCODE"
if errorlevel 1 (
  echo No se pudo abrir el creador. Revisa el mensaje anterior.
  echo Consulta data\startup-errors.log o LEEME.txt.
  pause
  exit /b 1
)
endlocal
