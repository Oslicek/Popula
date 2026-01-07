# Start NATS Server for Popula development
# Prerequisites: Download nats-server.exe from https://github.com/nats-io/nats-server/releases

param(
    [string]$NatsPath = "",
    [switch]$Install
)

$ErrorActionPreference = "Stop"

# Determine NATS server path
if ($NatsPath -eq "") {
    # Check common locations
    $possiblePaths = @(
        "$env:USERPROFILE\.nats\nats-server.exe",
        "$env:LOCALAPPDATA\nats\nats-server.exe",
        "C:\Tools\nats\nats-server.exe",
        "nats-server.exe"  # In PATH
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path -ErrorAction SilentlyContinue) {
            $NatsPath = $path
            break
        }
        # Check if in PATH
        $inPath = Get-Command "nats-server.exe" -ErrorAction SilentlyContinue
        if ($inPath) {
            $NatsPath = $inPath.Source
            break
        }
    }
}

# Install NATS if requested and not found
if ($Install -and $NatsPath -eq "") {
    Write-Host "Installing NATS server..." -ForegroundColor Cyan
    
    $installDir = "$env:USERPROFILE\.nats"
    $version = "v2.10.24"
    $arch = if ([Environment]::Is64BitOperatingSystem) { "amd64" } else { "386" }
    $zipUrl = "https://github.com/nats-io/nats-server/releases/download/$version/nats-server-$version-windows-$arch.zip"
    $zipFile = "$env:TEMP\nats-server.zip"
    
    # Download
    Write-Host "Downloading from $zipUrl..."
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile
    
    # Extract
    Write-Host "Extracting to $installDir..."
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Expand-Archive -Path $zipFile -DestinationPath $env:TEMP -Force
    
    # Move executable
    $extractedDir = Get-ChildItem -Path $env:TEMP -Directory -Filter "nats-server-*" | Select-Object -First 1
    Move-Item "$($extractedDir.FullName)\nats-server.exe" "$installDir\nats-server.exe" -Force
    
    # Cleanup
    Remove-Item $zipFile -Force
    Remove-Item $extractedDir.FullName -Recurse -Force
    
    $NatsPath = "$installDir\nats-server.exe"
    Write-Host "NATS server installed to $NatsPath" -ForegroundColor Green
}

if ($NatsPath -eq "" -or !(Test-Path $NatsPath -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: NATS server not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install NATS server:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://github.com/nats-io/nats-server/releases"
    Write-Host "  2. Extract nats-server.exe to one of:"
    Write-Host "     - $env:USERPROFILE\.nats\"
    Write-Host "     - C:\Tools\nats\"
    Write-Host "     - Or add to PATH"
    Write-Host ""
    Write-Host "Or run this script with -Install flag:"
    Write-Host "  .\start-nats.ps1 -Install"
    exit 1
}

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$infraDir = Split-Path -Parent $scriptDir
$configPath = Join-Path $infraDir "nats-server.conf"

# Create data directory
$dataDir = Join-Path $infraDir "nats-data"
if (!(Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    POPULA - NATS Server                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  NATS Path:    $NatsPath" -ForegroundColor Gray
Write-Host "  Config:       $configPath" -ForegroundColor Gray
Write-Host "  Data Dir:     $dataDir" -ForegroundColor Gray
Write-Host ""
Write-Host "  Endpoints:" -ForegroundColor Yellow
Write-Host "    Client:     nats://localhost:4222" -ForegroundColor White
Write-Host "    WebSocket:  ws://localhost:8080" -ForegroundColor White
Write-Host "    Monitor:    http://localhost:8222" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start NATS server
& $NatsPath -c $configPath
