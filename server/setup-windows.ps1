# PowerShell setup script for nginx + PM2 load balancing on Windows
# Run this as Administrator from the server directory
# Usage: .\setup-windows.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Voting System Load Balancer Setup (Windows) ===" -ForegroundColor Cyan
Write-Host ""

function Resolve-NginxExecutable {
    $candidateExes = @()

    if ($env:NGINX_EXE -and (Test-Path $env:NGINX_EXE)) {
        $candidateExes += (Resolve-Path $env:NGINX_EXE).Path
    }

    if ($env:NGINX_HOME) {
        $envExe = Join-Path $env:NGINX_HOME "nginx.exe"
        if (Test-Path $envExe) {
            $candidateExes += (Resolve-Path $envExe).Path
        }
    }

    $wherePath = Join-Path $env:SystemRoot "System32\where.exe"
    if (Test-Path $wherePath) {
        try {
            $whereHits = & $wherePath nginx 2>$null
            if ($whereHits) {
                $candidateExes += $whereHits
            }
        } catch {
            # Ignore lookup failures and continue with fallback paths.
        }
    }

    $userProfile = $env:USERPROFILE
    $candidateGlobs = @(
        "C:\nginx\nginx.exe",
        "C:\nginx\*\nginx.exe",
        "C:\tools\nginx\nginx.exe",
        "C:\Program Files\nginx\nginx.exe",
        "C:\Program Files (x86)\nginx\nginx.exe",
        "C:\ProgramData\chocolatey\lib\nginx\tools\nginx\nginx.exe"
    )

    if ($userProfile) {
        $candidateGlobs += (Join-Path $userProfile "Downloads\nginx*\nginx.exe")
        $candidateGlobs += (Join-Path $userProfile "Downloads\nginx*\*\nginx.exe")
    }

    foreach ($pattern in $candidateGlobs) {
        try {
            $matches = Get-ChildItem -Path $pattern -File -ErrorAction SilentlyContinue
            if ($matches) {
                $candidateExes += $matches.FullName
            }
        } catch {
            # Continue searching other patterns.
        }
    }

    $uniqueCandidates = $candidateExes | Where-Object { $_ -and (Test-Path $_) } | Sort-Object -Unique
    if (-not $uniqueCandidates) {
        return $null
    }

    $selectedExe = $uniqueCandidates |
        Sort-Object {
            if ($_ -like "*\Downloads\*") { 2 } else { 1 }
        }, @{ Expression = { (Get-Item $_).LastWriteTimeUtc }; Descending = $true } |
        Select-Object -First 1

    return $selectedExe
}

function Ensure-ConfDInclude {
    param(
        [Parameter(Mandatory = $true)][string]$NginxConfPath
    )

    $mainConf = Get-Content $NginxConfPath -Raw
    if ($mainConf -match "include\s+conf\.d[\\/]\*\.conf;") {
        Write-Host "  include conf.d/*.conf already present in nginx.conf" -ForegroundColor Green
        return
    }

    $lines = Get-Content $NginxConfPath
    $httpStart = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s*http\s*\{") {
            $httpStart = $i
            break
        }
    }

    if ($httpStart -lt 0) {
        throw "Could not locate 'http { ... }' block in $NginxConfPath"
    }

    $braceDepth = 0
    $httpEnd = -1
    for ($i = $httpStart; $i -lt $lines.Count; $i++) {
        $openCount = ([regex]::Matches($lines[$i], "\\{")).Count
        $closeCount = ([regex]::Matches($lines[$i], "\\}")).Count
        $braceDepth += ($openCount - $closeCount)
        if ($braceDepth -eq 0 -and $i -gt $httpStart) {
            $httpEnd = $i
            break
        }
    }

    if ($httpEnd -lt 0) {
        throw "Could not determine end of http block in $NginxConfPath"
    }

    $updatedLines = @()
    $updatedLines += $lines[0..($httpEnd - 1)]
    $updatedLines += "    include conf.d/*.conf;"
    $updatedLines += $lines[$httpEnd..($lines.Count - 1)]

    [System.IO.File]::WriteAllLines($NginxConfPath, $updatedLines)
    Write-Host "  Added include conf.d/*.conf to nginx.conf" -ForegroundColor Green
}

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Warning: Not running as Administrator. Some operations may fail." -ForegroundColor Yellow
    Write-Host "Consider re-running: Start-Process powershell -Verb RunAs -ArgumentList '-File', '$PSCommandPath'" -ForegroundColor Yellow
    Write-Host ""
}

# Define script path
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Resolve nginx installation dynamically
$nginxExe = Resolve-NginxExecutable
if (-not $nginxExe) {
    Write-Host "[ERROR] nginx executable not found." -ForegroundColor Red
    Write-Host "Install nginx and retry, or set one of these env vars:" -ForegroundColor Yellow
    Write-Host "  NGINX_HOME=C:\path\to\nginx-root" -ForegroundColor White
    Write-Host "  NGINX_EXE=C:\path\to\nginx.exe" -ForegroundColor White
    exit 1
}

$nginxPath = Split-Path -Parent $nginxExe
$nginxConf = Join-Path $nginxPath "conf\nginx.conf"

Write-Host "[OK] nginx found at $nginxPath" -ForegroundColor Green

# Check if Node.js is installed
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion found" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Node.js not found. Please install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Copy nginx config
Write-Host ""
Write-Host "Installing nginx configuration..." -ForegroundColor Cyan

if (-not (Test-Path $nginxConf)) {
    Write-Host "[ERROR] nginx.conf not found at $nginxConf" -ForegroundColor Red
    exit 1
}

# Backup existing config
$backupPath = "$nginxConf.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $nginxConf $backupPath
Write-Host "  Backed up existing config to: $backupPath"

# Read our config and write to nginx conf directory
$sourceConfig = Join-Path $scriptDir "nginx-windows.conf"
if (Test-Path $sourceConfig) {
    $confDir = Join-Path $nginxPath "conf\conf.d"
    if (-not (Test-Path $confDir)) {
        New-Item -ItemType Directory -Path $confDir | Out-Null
    }

    Copy-Item $sourceConfig (Join-Path $confDir "voting-app.conf") -Force
    Write-Host "  Config copied to: $(Join-Path $confDir 'voting-app.conf')" -ForegroundColor Green

    Ensure-ConfDInclude -NginxConfPath $nginxConf
} else {
    Write-Host "[ERROR] nginx-windows.conf not found in script directory" -ForegroundColor Red
    exit 1
}

# Test nginx configuration
Write-Host ""
Write-Host "Testing nginx configuration..." -ForegroundColor Cyan
& $nginxExe -t -p "$nginxPath\"

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Quick Start Commands:" -ForegroundColor Cyan
Write-Host "  1. Install dependencies:     npm install" -ForegroundColor White
Write-Host "  2. Start PM2 instances:      npm run start:pm2" -ForegroundColor White
Write-Host "  3. Start nginx:              npm run start:nginx:win" -ForegroundColor White
Write-Host "  4. Test load balancing:      curl http://localhost:8081/health" -ForegroundColor White
Write-Host ""
Write-Host "Or start everything at once:   npm run start:all:win" -ForegroundColor Yellow
Write-Host ""
Write-Host "Other Commands:" -ForegroundColor Cyan
Write-Host "  - View PM2 logs:      npm run logs" -ForegroundColor White
Write-Host "  - PM2 status:         npm run status" -ForegroundColor White
Write-Host "  - Stop everything:    npm run stop:all:win" -ForegroundColor White
Write-Host "  - Restart PM2:        npm run restart:pm2" -ForegroundColor White
Write-Host ""
Write-Host "Detected nginx root: $nginxPath" -ForegroundColor Cyan
Write-Host "Manual nginx commands:" -ForegroundColor Cyan
Write-Host "  - Start:    $nginxExe" -ForegroundColor White
Write-Host "  - Stop:     $nginxExe -s quit -p $nginxPath\" -ForegroundColor White
Write-Host "  - Reload:   $nginxExe -s reload -p $nginxPath\" -ForegroundColor White
Write-Host ""
