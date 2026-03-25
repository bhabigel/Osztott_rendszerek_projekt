param(
    [ValidateSet('start', 'stop', 'reload', 'test')]
    [string]$Action = 'start'
)

$ErrorActionPreference = 'Stop'

function Resolve-NginxExecutable {
    $candidateExes = @()

    if ($env:NGINX_EXE -and (Test-Path $env:NGINX_EXE)) {
        $candidateExes += (Resolve-Path $env:NGINX_EXE).Path
    }

    if ($env:NGINX_HOME) {
        $envExe = Join-Path $env:NGINX_HOME 'nginx.exe'
        if (Test-Path $envExe) {
            $candidateExes += (Resolve-Path $envExe).Path
        }
    }

    $wherePath = Join-Path $env:SystemRoot 'System32\where.exe'
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
        'C:\nginx\nginx.exe',
        'C:\nginx\*\nginx.exe',
        'C:\tools\nginx\nginx.exe',
        'C:\Program Files\nginx\nginx.exe',
        'C:\Program Files (x86)\nginx\nginx.exe',
        'C:\ProgramData\chocolatey\lib\nginx\tools\nginx\nginx.exe'
    )

    if ($userProfile) {
        $candidateGlobs += (Join-Path $userProfile 'Downloads\nginx*\nginx.exe')
        $candidateGlobs += (Join-Path $userProfile 'Downloads\nginx*\*\nginx.exe')
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
            if ($_ -like '*\Downloads\*') { 2 } else { 1 }
        }, @{ Expression = { (Get-Item $_).LastWriteTimeUtc }; Descending = $true } |
        Select-Object -First 1

    return $selectedExe
}

$nginxExe = Resolve-NginxExecutable
if (-not $nginxExe) {
    Write-Host '[ERROR] nginx executable not found.' -ForegroundColor Red
    Write-Host 'Set NGINX_HOME or NGINX_EXE env variable, or install nginx.' -ForegroundColor Yellow
    exit 1
}

$nginxRoot = Split-Path -Parent $nginxExe
Write-Host "Using nginx executable: $nginxExe" -ForegroundColor Cyan

switch ($Action) {
    'start' {
        Start-Process -FilePath $nginxExe -WorkingDirectory $nginxRoot
        Write-Host 'Nginx start command issued.' -ForegroundColor Green
    }
    'stop' {
        & $nginxExe -s quit -p "$nginxRoot\"
        Write-Host 'Nginx stop signal sent.' -ForegroundColor Green
    }
    'reload' {
        & $nginxExe -s reload -p "$nginxRoot\"
        Write-Host 'Nginx reload signal sent.' -ForegroundColor Green
    }
    'test' {
        & $nginxExe -t -p "$nginxRoot\"
    }
}
