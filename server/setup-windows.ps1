# PowerShell setup script for nginx + PM2 load balancing on Windows
# Run this as Administrator from the server directory
# Usage: .\setup-windows.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Voting System Load Balancer Setup (Windows) ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Warning: Not running as Administrator. Some operations may fail." -ForegroundColor Yellow
    Write-Host "Consider re-running: Start-Process powershell -Verb RunAs -ArgumentList '-File', '$PSCommandPath'" -ForegroundColor Yellow
    Write-Host ""
}

# Define nginx paths
$nginxPath = "C:\nginx"
$nginxExe = "$nginxPath\nginx.exe"
$nginxConf = "$nginxPath\conf\nginx.conf"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if nginx is installed
if (Test-Path $nginxExe) {
    Write-Host "[OK] nginx found at $nginxPath" -ForegroundColor Green
} else {
    Write-Host "[!] nginx not found at $nginxPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To install nginx on Windows:" -ForegroundColor Cyan
    Write-Host "  1. Download from: https://nginx.org/en/download.html (Windows zip)"
    Write-Host "  2. Extract to C:\nginx"
    Write-Host "  3. Run this script again"
    Write-Host ""
    Write-Host "Or install via Chocolatey (if available):" -ForegroundColor Cyan
    Write-Host "  choco install nginx"
    Write-Host ""
    
    $response = Read-Host "Do you want to continue anyway? (y/n)"
    if ($response -ne 'y') {
        exit 1
    }
}

# Check if Node.js is installed
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Node.js not found. Please install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Copy nginx config
if (Test-Path $nginxPath) {
    Write-Host ""
    Write-Host "Installing nginx configuration..." -ForegroundColor Cyan
    
    # Backup existing config
    if (Test-Path $nginxConf) {
        $backupPath = "$nginxConf.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $nginxConf $backupPath
        Write-Host "  Backed up existing config to: $backupPath"
    }
    
    # Read our config and write to nginx conf directory
    $sourceConfig = Join-Path $scriptDir "nginx-windows.conf"
    if (Test-Path $sourceConfig) {
        # We need to wrap our upstream/server block in the http block
        # Read existing nginx.conf and add our config
        $ourConfig = Get-Content $sourceConfig -Raw
        
        # Create a new conf.d style setup
        $confDir = "$nginxPath\conf\conf.d"
        if (-not (Test-Path $confDir)) {
            New-Item -ItemType Directory -Path $confDir | Out-Null
        }
        
        # Copy our config to conf.d
        Copy-Item $sourceConfig "$confDir\voting-app.conf"
        Write-Host "  Config copied to: $confDir\voting-app.conf" -ForegroundColor Green
        
        # Check if main nginx.conf includes conf.d
        $mainConf = Get-Content $nginxConf -Raw
        if ($mainConf -notmatch "include\s+conf\.d") {
            Write-Host ""
            Write-Host "[ACTION REQUIRED] Add this line inside the 'http' block of $nginxConf`:" -ForegroundColor Yellow
            Write-Host "    include conf.d/*.conf;" -ForegroundColor White
            Write-Host ""
        }
    } else {
        Write-Host "  [WARNING] nginx-windows.conf not found in script directory" -ForegroundColor Yellow
    }
}

# Test nginx configuration
if (Test-Path $nginxExe) {
    Write-Host ""
    Write-Host "Testing nginx configuration..." -ForegroundColor Cyan
    & $nginxExe -t
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Quick Start Commands:" -ForegroundColor Cyan
Write-Host "  1. Install dependencies:     npm install" -ForegroundColor White
Write-Host "  2. Start PM2 instances:      npm run start:pm2" -ForegroundColor White
Write-Host "  3. Start nginx:              npm run start:nginx" -ForegroundColor White
Write-Host "  4. Test load balancing:      curl http://localhost:8081/health" -ForegroundColor White
Write-Host ""
Write-Host "Or start everything at once:   npm run start:all" -ForegroundColor Yellow
Write-Host ""
Write-Host "Other Commands:" -ForegroundColor Cyan
Write-Host "  - View PM2 logs:      npm run logs" -ForegroundColor White
Write-Host "  - PM2 status:         npm run status" -ForegroundColor White
Write-Host "  - Stop everything:    npm run stop:all" -ForegroundColor White
Write-Host "  - Restart PM2:        npm run restart:pm2" -ForegroundColor White
Write-Host ""
Write-Host "Manual nginx commands (run from C:\nginx):" -ForegroundColor Cyan
Write-Host "  - Start:    nginx.exe" -ForegroundColor White
Write-Host "  - Stop:     nginx.exe -s quit" -ForegroundColor White
Write-Host "  - Reload:   nginx.exe -s reload" -ForegroundColor White
Write-Host ""
