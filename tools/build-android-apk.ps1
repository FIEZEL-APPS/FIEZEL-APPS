<#
.SYNOPSIS
    FIEZEL Android APK Local Build and Packaging Script for Windows.
.DESCRIPTION
    Automates prerequisite validation (Node.js, JDK 17, Android SDK),
    synchronizes web assets into the Android native shell, builds the APK via Gradle,
    and packages the resulting binary into dist/apk/fiezel-debug.apk with deployment guidance.
.PARAMETER CheckOnly
    Validates developer toolchain and environment without building the APK.
.PARAMETER BuildType
    Target build variant: 'debug' (default) or 'release'.
.PARAMETER Clean
    Executes 'gradlew.bat clean' before building.
.PARAMETER SkipSync
    Skips the web asset synchronization step.
.PARAMETER Install
    Automatically deploys the built APK to a connected Android device via ADB.
.EXAMPLE
    .\tools\build-android-apk.ps1 -CheckOnly
.EXAMPLE
    .\tools\build-android-apk.ps1
.EXAMPLE
    .\tools\build-android-apk.ps1 -BuildType release
.EXAMPLE
    .\tools\build-android-apk.ps1 -Install
#>

[CmdletBinding()]
param (
    [switch]$CheckOnly,
    [ValidateSet("debug", "release")]
    [string]$BuildType = "debug",
    [switch]$Clean,
    [switch]$SkipSync,
    [switch]$Install,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# Define Root and Android Directories
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$AndroidDir = Join-Path $ProjectRoot "android"
$DistDir = Join-Path $ProjectRoot "dist\apk"

function Write-BrandHeader {
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "   FIEZEL Android APK Local Builder (Windows Native Tool)       " -ForegroundColor Green
    Write-Host "   Target Application: id.my.fiezel.app                          " -ForegroundColor DarkGray
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
}

if ($Help) {
    Write-BrandHeader
    Get-Help $MyInvocation.MyCommand.Definition -Full
    exit 0
}

Write-BrandHeader

$PrerequisitesMet = $true
$EnvReport = [ordered]@{}

# -----------------------------------------------------------------------------
# STEP 1: Check Node.js and Synchronize Web Assets
# -----------------------------------------------------------------------------
Write-Host "[1/5] Checking Node.js Runtime and Web Assets..." -ForegroundColor Yellow

$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCmd) {
    $NodeVer = & node -v
    Write-Host "  [OK] Node.js detected: $NodeVer ($($NodeCmd.Source))" -ForegroundColor Green
    $EnvReport["Node.js"] = "Detected ($NodeVer)"

    if (-not $SkipSync) {
        $SyncScript = Join-Path $ScriptDir "sync-android-assets.mjs"
        if (Test-Path $SyncScript) {
            Write-Host "  [*] Synchronizing web assets via sync-android-assets.mjs..." -ForegroundColor Cyan
            if ($CheckOnly) {
                & node $SyncScript --check
            } else {
                & node $SyncScript
            }
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  [!] Asset synchronization failed with code $LASTEXITCODE" -ForegroundColor Red
                $PrerequisitesMet = $false
            }
        } else {
            Write-Host "  [!] Warning: sync-android-assets.mjs not found at $SyncScript" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [-] Skipping asset sync (-SkipSync specified)." -ForegroundColor DarkGray
    }
} else {
    Write-Host "  [!] Warning: Node.js was not found in PATH." -ForegroundColor Yellow
    Write-Host "      Node.js is required to sync latest web assets into the APK." -ForegroundColor DarkYellow
    Write-Host "      Install via winget: winget install OpenJS.NodeJS.LTS" -ForegroundColor Cyan
    $EnvReport["Node.js"] = "Missing (winget install OpenJS.NodeJS.LTS)"
}

# -----------------------------------------------------------------------------
# STEP 2: Check Java Development Kit (JDK 17 Required)
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/5] Checking Java Development Kit (JDK 17 Required)..." -ForegroundColor Yellow

$JavaHomeFound = $null

# 2.1 Check explicit JAVA_HOME
if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    $JavaHomeFound = $env:JAVA_HOME
} else {
    # 2.2 Probe common JDK 17 paths on Windows
    $CommonJdkPaths = @(
        "C:\Program Files\Eclipse Adoptium\jdk-17*",
        "C:\Program Files\Microsoft\jdk-17*",
        "C:\Program Files\Java\jdk-17*",
        "C:\Program Files\Android\Android Studio\jbr",
        "$env:LOCALAPPDATA\Programs\Eclipse Adoptium\jdk-17*"
    )
    foreach ($pattern in $CommonJdkPaths) {
        $resolved = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($resolved -and (Test-Path (Join-Path $resolved.FullName "bin\java.exe"))) {
            $JavaHomeFound = $resolved.FullName
            $env:JAVA_HOME = $JavaHomeFound
            $env:PATH = "$JavaHomeFound\bin;" + $env:PATH
            Write-Host "  [*] Auto-configured JAVA_HOME from detected location: $JavaHomeFound" -ForegroundColor Cyan
            break
        }
    }
}

if ($JavaHomeFound) {
    try {
        $JavaExe = Join-Path $JavaHomeFound "bin\java.exe"
        $JavaVerOutput = & "$JavaExe" -version 2>&1 | Out-String
        $JavaFirstLine = ($JavaVerOutput -split "`n")[0].Trim()
        Write-Host "  [OK] JDK detected: $JavaFirstLine" -ForegroundColor Green
        Write-Host "       JAVA_HOME: $JavaHomeFound" -ForegroundColor DarkGray
        $EnvReport["JDK"] = "Detected ($JavaFirstLine)"
    } catch {
        Write-Host "  [!] Found JAVA_HOME but failed executing java.exe" -ForegroundColor Red
        $PrerequisitesMet = $false
        $EnvReport["JDK"] = "Invalid Path"
    }
} else {
    # 2.3 Check if 'java' is in PATH directly
    $JavaCmd = Get-Command java -ErrorAction SilentlyContinue
    if ($JavaCmd) {
        $JavaVerOutput = & java -version 2>&1 | Out-String
        $JavaFirstLine = ($JavaVerOutput -split "`n")[0].Trim()
        Write-Host "  [OK] Java found in PATH: $JavaFirstLine" -ForegroundColor Green
        $EnvReport["JDK"] = "In PATH ($JavaFirstLine)"
    } else {
        Write-Host "  [X] Java (JDK 17) is NOT installed or not detected." -ForegroundColor Red
        Write-Host ""
        Write-Host "  >> HOW TO FIX (Choose either winget command):" -ForegroundColor White
        Write-Host "     Option A: winget install Microsoft.OpenJDK.17" -ForegroundColor Cyan
        Write-Host "     Option B: winget install EclipseAdoptium.Temurin.17.JDK" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "     Note: After installing, reopen PowerShell so JAVA_HOME takes effect." -ForegroundColor DarkYellow
        Write-Host ""
        $PrerequisitesMet = $false
        $EnvReport["JDK"] = "Missing (Requires JDK 17)"
    }
}

# -----------------------------------------------------------------------------
# STEP 3: Check Android SDK and Tools
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/5] Checking Android SDK and Command Line Tools..." -ForegroundColor Yellow

$AndroidHomeFound = $null

# 3.1 Check ANDROID_HOME or ANDROID_SDK_ROOT
if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
    $AndroidHomeFound = $env:ANDROID_HOME
} elseif ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) {
    $AndroidHomeFound = $env:ANDROID_SDK_ROOT
    $env:ANDROID_HOME = $AndroidHomeFound
} else {
    # 3.2 Probe common Android SDK paths on Windows
    $CommonSdkPaths = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "C:\Android\Sdk",
        "C:\Program Files (x86)\Android\android-sdk"
    )
    foreach ($path in $CommonSdkPaths) {
        if (Test-Path $path) {
            $AndroidHomeFound = $path
            $env:ANDROID_HOME = $AndroidHomeFound
            Write-Host "  [*] Auto-configured ANDROID_HOME from detected location: $AndroidHomeFound" -ForegroundColor Cyan
            break
        }
    }
}

if ($AndroidHomeFound) {
    Write-Host "  [OK] Android SDK detected: $AndroidHomeFound" -ForegroundColor Green
    $EnvReport["Android SDK"] = "Detected ($AndroidHomeFound)"

    # Check platforms / build-tools
    $BuildToolsDir = Join-Path $AndroidHomeFound "build-tools"
    if (Test-Path $BuildToolsDir) {
        $BuildTools = Get-ChildItem $BuildToolsDir | Select-Object -ExpandProperty Name
        Write-Host "       Installed Build-Tools: $($BuildTools -join ', ')" -ForegroundColor DarkGray
    }

    # Check ADB
    $AdbExe = Join-Path $AndroidHomeFound "platform-tools\adb.exe"
    if (Test-Path $AdbExe) {
        $env:PATH = "$AndroidHomeFound\platform-tools;" + $env:PATH
        $EnvReport["ADB"] = "Available"
    } else {
        $EnvReport["ADB"] = "Platform-tools missing"
    }
} else {
    Write-Host "  [X] ANDROID_HOME is NOT set and Android SDK was not detected in standard locations." -ForegroundColor Red
    Write-Host ""
    Write-Host "  >> HOW TO FIX:" -ForegroundColor White
    Write-Host "     1. Install Android Studio (includes complete SDK and tools):" -ForegroundColor DarkGray
    Write-Host "        winget install Google.AndroidStudio" -ForegroundColor Cyan
    Write-Host "     2. Or set ANDROID_HOME if already installed at another location:" -ForegroundColor DarkGray
    Write-Host "        `$env:ANDROID_HOME = 'C:\Path\To\Android\Sdk'" -ForegroundColor Cyan
    Write-Host ""
    $PrerequisitesMet = $false
    $EnvReport["Android SDK"] = "Missing (Install Android Studio or Command-line tools)"
}

# -----------------------------------------------------------------------------
# STEP 4: Check Gradle Wrapper and Dependencies
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/5] Checking Gradle Wrapper and Build Scripts..." -ForegroundColor Yellow

$GradlewBat = Join-Path $AndroidDir "gradlew.bat"
$WrapperJar = Join-Path $AndroidDir "gradle\wrapper\gradle-wrapper.jar"

if (Test-Path $GradlewBat) {
    Write-Host "  [OK] Gradle wrapper script found: $GradlewBat" -ForegroundColor Green
    $EnvReport["Gradle Wrapper"] = "Present"
} else {
    Write-Host "  [X] gradlew.bat not found in $AndroidDir" -ForegroundColor Red
    $PrerequisitesMet = $false
    $EnvReport["Gradle Wrapper"] = "Missing ($GradlewBat)"
}

# Auto-download gradle-wrapper.jar if missing
if (-not (Test-Path $WrapperJar)) {
    Write-Host "  [!] gradle-wrapper.jar is missing from gradle/wrapper directory." -ForegroundColor Yellow
    Write-Host "  [*] Attempting auto-download of official Gradle 8.5 wrapper jar..." -ForegroundColor Cyan
    try {
        $WrapperDir = Split-Path -Parent $WrapperJar
        if (-not (Test-Path $WrapperDir)) {
            New-Item -ItemType Directory -Path $WrapperDir -Force | Out-Null
        }
        $DownloadUrl = "https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar"
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $WrapperJar -UseBasicParsing -TimeoutSec 30
        Write-Host "  [OK] Downloaded gradle-wrapper.jar successfully." -ForegroundColor Green
    } catch {
        Write-Host "  [!] Could not download gradle-wrapper.jar automatically." -ForegroundColor Yellow
        Write-Host "      Gradle wrapper will require an existing global Gradle or internet access during first launch." -ForegroundColor DarkGray
    }
}

# -----------------------------------------------------------------------------
# CHECK-ONLY REPORT SUMMARY
# -----------------------------------------------------------------------------
if ($CheckOnly) {
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "              TOOLCHAIN ENVIRONMENT SUMMARY                      " -ForegroundColor White
    Write-Host "=================================================================" -ForegroundColor Cyan
    foreach ($key in $EnvReport.Keys) {
        $status = $EnvReport[$key]
        $color = if ($status -like "*Detected*" -or $status -like "*Present*" -or $status -like "*Available*") { "Green" } else { "Yellow" }
        Write-Host ("  {0,-18} : " -f $key) -NoNewline
        Write-Host $status -ForegroundColor $color
    }
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""

    if ($PrerequisitesMet) {
        Write-Host "[SUCCESS] All build prerequisites are met! You can now run:" -ForegroundColor Green
        Write-Host "   .\tools\build-android-apk.ps1" -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host "[INFO] Some build prerequisites are missing. Follow the steps above to complete setup." -ForegroundColor Yellow
        exit 0
    }
}

if (-not $PrerequisitesMet) {
    Write-Host ""
    Write-Host "[HALTED] Build halted because mandatory prerequisites are missing." -ForegroundColor Red
    Write-Host "   Run: .\tools\build-android-apk.ps1 -CheckOnly to review required tools." -ForegroundColor Yellow
    exit 1
}

# -----------------------------------------------------------------------------
# STEP 5: Compile and Assemble APK via Gradle
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[5/5] Building Android APK ($BuildType mode)..." -ForegroundColor Yellow

Push-Location $AndroidDir
try {
    if ($Clean) {
        Write-Host "  [*] Running clean task..." -ForegroundColor Cyan
        & ".\gradlew.bat" clean
        if ($LASTEXITCODE -ne 0) {
            throw "Gradle clean task failed with exit code $LASTEXITCODE"
        }
    }

    $GradleTask = if ($BuildType -eq "release") { "assembleRelease" } else { "assembleDebug" }
    Write-Host "  [*] Executing: .\gradlew.bat $GradleTask --stacktrace" -ForegroundColor Cyan

    & ".\gradlew.bat" $GradleTask --stacktrace
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle build task '$GradleTask' failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

# -----------------------------------------------------------------------------
# STEP 6: Package and Deliver Output APK
# -----------------------------------------------------------------------------
$SearchPath = Join-Path $AndroidDir "app\build\outputs\apk\$BuildType"
$BuiltApk = Get-ChildItem -Path $SearchPath -Filter "*.apk" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $BuiltApk -or -not (Test-Path $BuiltApk.FullName)) {
    Write-Host "[ERROR] Could not find output APK in $SearchPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
}

$FinalApkName = if ($BuildType -eq "release") { "fiezel-release.apk" } else { "fiezel-debug.apk" }
$DestApk = Join-Path $DistDir $FinalApkName

Copy-Item -Path $BuiltApk.FullName -Destination $DestApk -Force

# Calculate checksum and size
$ApkSizeMB = [math]::Round((Get-Item $DestApk).Length / 1MB, 2)
$ApkHash = (Get-FileHash -Path $DestApk -Algorithm SHA256).Hash

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL! Android APK Ready for Distribution           " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  Output Location: $DestApk" -ForegroundColor White
Write-Host "  Package Size   : $ApkSizeMB MB" -ForegroundColor Cyan
Write-Host "  SHA-256 Hash   : $ApkHash" -ForegroundColor DarkGray
Write-Host "=================================================================" -ForegroundColor Green
Write-Host ""

# -----------------------------------------------------------------------------
# STEP 7: Installation and Phone Deployment Instructions
# -----------------------------------------------------------------------------
Write-Host "HOW TO INSTALL ON YOUR ANDROID PHONE:" -ForegroundColor White
Write-Host ""
Write-Host "  METHOD 1: Direct USB Cable (via ADB Debugging - Fastest)" -ForegroundColor Cyan
Write-Host "  ---------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  1. Connect your phone via USB and enable 'USB Debugging' in Developer Options." -ForegroundColor White
Write-Host "  2. Run the install command:" -ForegroundColor White
Write-Host "     adb install -r $DestApk" -ForegroundColor Green
Write-Host ""

Write-Host "  METHOD 2: Wireless Transfer (WhatsApp / Google Drive / Telegram)" -ForegroundColor Cyan
Write-Host "  ---------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  1. Send '$DestApk' to your phone via WhatsApp Document, Google Drive, or USB MTP." -ForegroundColor White
Write-Host "  2. On your phone, tap the file to open and select 'Install'." -ForegroundColor White
Write-Host "  3. If prompted, toggle 'Allow from this source' for Files or WhatsApp." -ForegroundColor White
Write-Host "  4. Launch FIEZEL and enjoy high-performance native learning!" -ForegroundColor White
Write-Host ""

# Optional: Auto-install if requested
if ($Install) {
    Write-Host "[*] Attempting automatic deployment via ADB..." -ForegroundColor Yellow
    $AdbCmd = Get-Command adb -ErrorAction SilentlyContinue
    if ($AdbCmd) {
        $Devices = & adb devices | Select-String -Pattern "\bdevice\b"
        if ($Devices) {
            Write-Host "  [*] Device detected! Installing $FinalApkName..." -ForegroundColor Cyan
            & adb install -r $DestApk
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] Installed successfully on connected Android device!" -ForegroundColor Green
            } else {
                Write-Host "  [!] ADB installation returned exit code $LASTEXITCODE" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  [!] No Android devices connected via ADB. Please connect phone and enable USB debugging." -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [!] 'adb' command not found in PATH. Ensure Android platform-tools is installed." -ForegroundColor Yellow
    }
}
