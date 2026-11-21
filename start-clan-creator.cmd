@echo off
setlocal
set "CREATOR_ROOT=%~dp0"
cd /d "%~dp0"
echo Opening MT2 Clan Creator...
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $creatorRoot=$env:CREATOR_ROOT; $creatorNode=Join-Path $creatorRoot 'runtime/node.exe'; if(-not (Test-Path -LiteralPath $creatorNode)){ $creatorNode=(Get-Command node.exe -ErrorAction Stop).Source }; & $creatorNode (Join-Path $creatorRoot 'scripts/launch.mjs'); exit $LASTEXITCODE"
if errorlevel 1 (
  echo Could not open the creator. See the message above.
  echo Read README.txt or data\startup-errors.log.
  pause
  exit /b 1
)
endlocal
