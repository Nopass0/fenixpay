# PowerShell script for automatic setup and building APK
# Automatically installs all required dependencies

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("debug", "release", "prod", "dev")]
    [string]$BuildType = "debug",
    
    [Parameter(Mandatory=$false)]
    [string]$EmulatorName = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipEmulatorStart = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$ForceReinstall = $false
)

# Require Administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script requires Administrator privileges to install dependencies." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    
    # Relaunch as admin
    $arguments = "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    if ($BuildType) { $arguments += " -BuildType $BuildType" }
    if ($EmulatorName) { $arguments += " -EmulatorName `"$EmulatorName`"" }
    if ($SkipBuild) { $arguments += " -SkipBuild" }
    if ($SkipEmulatorStart) { $arguments += " -SkipEmulatorStart" }
    if ($ForceReinstall) { $arguments += " -ForceReinstall" }
    
    Start-Process powershell.exe -Verb RunAs -ArgumentList $arguments
    exit
}

# Color output functions
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($message) {
    Write-ColorOutput Green "[OK] $message"
}

function Write-Info($message) {
    Write-ColorOutput Cyan "-> $message"
}

function Write-Warning($message) {
    Write-ColorOutput Yellow "[WARN] $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "[ERROR] $message"
}

# Function to check if a command exists
function Test-CommandExists($command) {
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Function to install Chocolatey
function Install-Chocolatey {
    if (Test-CommandExists choco) {
        Write-Success "Chocolatey is already installed"
        return
    }
    
    Write-Info "Installing Chocolatey package manager..."
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Success "Chocolatey installed successfully"
    } catch {
        Write-Error "Failed to install Chocolatey: $_"
        exit 1
    }
}

# Function to install Java
function Install-Java {
    Write-Info "Checking Java installation..."
    
    if ((Test-CommandExists java) -and (Test-CommandExists javac) -and -not $ForceReinstall) {
        $javaVersion = java -version 2>&1 | Select-String "version" | Out-String
        Write-Success "Java is already installed: $javaVersion"
        return
    }
    
    Write-Info "Installing Java JDK 17..."
    try {
        choco install openjdk17 -y --force
        
        # Set JAVA_HOME
        $javaPath = "C:\Program Files\OpenJDK\openjdk-17"
        if (Test-Path $javaPath) {
            [Environment]::SetEnvironmentVariable("JAVA_HOME", $javaPath, "Machine")
            $env:JAVA_HOME = $javaPath
            
            # Update PATH
            $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
            if ($machinePath -notlike "*$javaPath\bin*") {
                [Environment]::SetEnvironmentVariable("Path", "$machinePath;$javaPath\bin", "Machine")
            }
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            
            Write-Success "Java JDK 17 installed successfully"
        } else {
            Write-Warning "Java installed but path not found at expected location"
        }
    } catch {
        Write-Error "Failed to install Java: $_"
        exit 1
    }
}

# Function to install Android SDK
function Install-AndroidSDK {
    Write-Info "Checking Android SDK installation..."
    
    if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME) -and -not $ForceReinstall) {
        Write-Success "Android SDK is already installed at: $env:ANDROID_HOME"
        return
    }
    
    Write-Info "Installing Android SDK..."
    try {
        # Install Android Command Line Tools
        choco install android-sdk -y --force
        
        # Set ANDROID_HOME
        $androidPath = "C:\Android\android-sdk"
        if (-not (Test-Path $androidPath)) {
            # Try alternative paths
            $androidPath = "${env:LOCALAPPDATA}\Android\Sdk"
            if (-not (Test-Path $androidPath)) {
                $androidPath = "C:\tools\android-sdk"
            }
        }
        
        if (Test-Path $androidPath) {
            [Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidPath, "Machine")
            $env:ANDROID_HOME = $androidPath
            
            # Update PATH
            $pathsToAdd = @(
                "$androidPath\platform-tools",
                "$androidPath\tools",
                "$androidPath\tools\bin",
                "$androidPath\emulator"
            )
            
            $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
            foreach ($pathToAdd in $pathsToAdd) {
                if ($machinePath -notlike "*$pathToAdd*") {
                    $machinePath += ";$pathToAdd"
                }
            }
            [Environment]::SetEnvironmentVariable("Path", $machinePath, "Machine")
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            
            Write-Success "Android SDK installed successfully at: $androidPath"
        } else {
            Write-Error "Android SDK installed but path not found"
            exit 1
        }
    } catch {
        Write-Error "Failed to install Android SDK: $_"
        exit 1
    }
}

# Function to install Android SDK components
function Install-AndroidComponents {
    Write-Info "Installing required Android SDK components..."
    
    $sdkmanager = Join-Path $env:ANDROID_HOME "tools\bin\sdkmanager.bat"
    if (-not (Test-Path $sdkmanager)) {
        $sdkmanager = Join-Path $env:ANDROID_HOME "cmdline-tools\latest\bin\sdkmanager.bat"
    }
    
    if (-not (Test-Path $sdkmanager)) {
        Write-Warning "sdkmanager not found, trying to install command line tools..."
        
        # Download and install command line tools
        $cmdlineToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-9477386_latest.zip"
        $tempZip = "$env:TEMP\cmdline-tools.zip"
        $tempDir = "$env:TEMP\cmdline-tools-temp"
        
        try {
            Write-Info "Downloading Android command line tools..."
            Invoke-WebRequest -Uri $cmdlineToolsUrl -OutFile $tempZip
            
            Write-Info "Extracting command line tools..."
            Expand-Archive -Path $tempZip -DestinationPath $tempDir -Force
            
            # Create cmdline-tools directory structure
            $cmdlineToolsPath = Join-Path $env:ANDROID_HOME "cmdline-tools"
            New-Item -ItemType Directory -Force -Path $cmdlineToolsPath | Out-Null
            
            # Move to latest folder
            $latestPath = Join-Path $cmdlineToolsPath "latest"
            if (Test-Path $latestPath) {
                Remove-Item -Recurse -Force $latestPath
            }
            Move-Item -Path "$tempDir\cmdline-tools" -Destination $latestPath
            
            # Clean up
            Remove-Item -Path $tempZip -Force
            Remove-Item -Path $tempDir -Recurse -Force
            
            $sdkmanager = Join-Path $latestPath "bin\sdkmanager.bat"
            Write-Success "Command line tools installed"
        } catch {
            Write-Error "Failed to install command line tools: $_"
            exit 1
        }
    }
    
    if (Test-Path $sdkmanager) {
        try {
            Write-Info "Accepting Android SDK licenses..."
            # Create a yes file to auto-accept licenses
            "y`ny`ny`ny`ny`ny`ny`ny`ny`n" | & $sdkmanager --licenses
            
            Write-Info "Installing Android SDK components..."
            $components = @(
                "platform-tools",
                "platforms;android-33",
                "platforms;android-34",
                "build-tools;33.0.0",
                "build-tools;34.0.0",
                "emulator",
                "system-images;android-33;google_apis;x86_64"
            )
            
            foreach ($component in $components) {
                Write-Info "Installing $component..."
                & $sdkmanager $component
            }
            
            Write-Success "Android SDK components installed"
        } catch {
            Write-Warning "Some Android SDK components may have failed to install: $_"
        }
    } else {
        Write-Warning "Could not find sdkmanager, skipping component installation"
    }
}

# Function to create Android emulator
function Create-AndroidEmulator {
    Write-Info "Checking for Android emulators..."
    
    $avdmanager = Join-Path $env:ANDROID_HOME "tools\bin\avdmanager.bat"
    if (-not (Test-Path $avdmanager)) {
        $avdmanager = Join-Path $env:ANDROID_HOME "cmdline-tools\latest\bin\avdmanager.bat"
    }
    
    if (-not (Test-Path $avdmanager)) {
        Write-Warning "avdmanager not found, cannot create emulator automatically"
        return
    }
    
    $emulator = Join-Path $env:ANDROID_HOME "emulator\emulator.exe"
    if (Test-Path $emulator) {
        $existingAvds = & $emulator -list-avds 2>$null
        if ($existingAvds) {
            Write-Success "Android emulators already exist:"
            $existingAvds | ForEach-Object { Write-Host "  - $_" }
            return
        }
    }
    
    Write-Info "Creating default Android emulator..."
    try {
        $avdName = "Chase_Test_Device"
        Write-Info "Creating AVD: $avdName"
        
        # Create AVD with auto-accept
        echo "no" | & $avdmanager create avd -n $avdName -k "system-images;android-33;google_apis;x86_64" -d "pixel_5" --force
        
        Write-Success "Android emulator created: $avdName"
        
        # Set as default emulator name if not specified
        if (-not $EmulatorName) {
            $script:EmulatorName = $avdName
        }
    } catch {
        Write-Warning "Failed to create emulator: $_"
    }
}

# Main installation process
try {
    Write-Info "Chase APK Build Setup Script"
    Write-Info "=============================="
    
    # Change to script directory
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    Set-Location $scriptPath
    
    # Install dependencies
    Install-Chocolatey
    Install-Java
    Install-AndroidSDK
    Install-AndroidComponents
    Create-AndroidEmulator
    
    Write-Success "All dependencies installed successfully!"
    Write-Info ""
    Write-Info "Continuing with build process..."
    Write-Info ""
    
    # Now run the original build script logic
    . "$scriptPath\build-and-run.ps1" -BuildType $BuildType -EmulatorName $EmulatorName -SkipBuild:$SkipBuild -SkipEmulatorStart:$SkipEmulatorStart
    
} catch {
    Write-Error "Setup failed: $_"
    Write-Info ""
    Write-Info "You can try running this script again with -ForceReinstall flag to reinstall dependencies"
    exit 1
}