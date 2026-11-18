@echo off
cd /d "%~dp0"
node scripts/init-local.mjs
if not exist .next\BUILD_ID call npm run build
start "" http://localhost:3000
call npm run start -- --port 3000
