# Popula Development Environment Launcher
# Starts all services needed for local development

param(
    [switch]$NatsOnly,
    [switch]$WorkerOnly,
    [switch]$FrontendOnly,
    [switch]$Install
)

$ErrorActionPreference = "Stop"

# Get project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$infraDir = Split-Path -Parent $scriptDir
$projectRoot = Split-Path -Parent $infraDir

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║              POPULA - Development Environment                ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Project Root: $projectRoot" -ForegroundColor Gray
Write-Host ""

# Function to start a process in a new terminal
function Start-InNewTerminal {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDirectory = $projectRoot
    )
    
    $wtCommand = "wt --title `"$Title`" -d `"$WorkingDirectory`" cmd /k `"$Command`""
    
    # Try Windows Terminal first
    $wt = Get-Command "wt.exe" -ErrorAction SilentlyContinue
    if ($wt) {
        Start-Process "wt.exe" -ArgumentList "--title", "`"$Title`"", "-d", "`"$WorkingDirectory`"", "cmd", "/k", "`"$Command`""
    } else {
        # Fall back to regular cmd
        Start-Process "cmd.exe" -ArgumentList "/k", "title $Title && cd /d `"$WorkingDirectory`" && $Command"
    }
}

# Install dependencies if requested
if ($Install) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    
    # Install pnpm packages
    Write-Host "  Installing Node.js packages..." -ForegroundColor Gray
    Push-Location $projectRoot
    pnpm install
    Pop-Location
    
    # Install NATS
    Write-Host "  Installing NATS server..." -ForegroundColor Gray
    & "$scriptDir\start-nats.ps1" -Install
    
    Write-Host "Dependencies installed!" -ForegroundColor Green
    Write-Host ""
}

# Start services based on flags
$services = @()

if ($NatsOnly) {
    $services = @("nats")
} elseif ($WorkerOnly) {
    $services = @("worker")
} elseif ($FrontendOnly) {
    $services = @("frontend")
} else {
    $services = @("nats", "worker", "frontend")
}

foreach ($service in $services) {
    switch ($service) {
        "nats" {
            Write-Host "  Starting NATS server..." -ForegroundColor Yellow
            Start-InNewTerminal -Title "Popula - NATS" -Command "powershell -File `"$scriptDir\start-nats.ps1`""
            Start-Sleep -Seconds 2  # Wait for NATS to start
        }
        "worker" {
            Write-Host "  Starting Rust worker..." -ForegroundColor Yellow
            Start-InNewTerminal -Title "Popula - Worker" -Command "cd worker && cargo run" -WorkingDirectory $projectRoot
        }
        "frontend" {
            Write-Host "  Starting React frontend..." -ForegroundColor Yellow
            Start-InNewTerminal -Title "Popula - Frontend" -Command "cd apps\web && pnpm dev" -WorkingDirectory $projectRoot
        }
    }
}

Write-Host ""
Write-Host "Services started in separate terminals!" -ForegroundColor Green
Write-Host ""
Write-Host "  Endpoints:" -ForegroundColor Yellow
Write-Host "    Frontend:   http://localhost:5173" -ForegroundColor White
Write-Host "    NATS:       nats://localhost:4222" -ForegroundColor White
Write-Host "    WebSocket:  ws://localhost:8080" -ForegroundColor White
Write-Host "    Monitor:    http://localhost:8222" -ForegroundColor White
Write-Host ""
