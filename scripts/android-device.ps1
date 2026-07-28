$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$devices = @(adb devices | Select-String "`tdevice$" | ForEach-Object {
  ($_ -split "`t")[0]
})

if ($devices.Count -eq 0) {
  throw 'No authorized Android device found. Connect a device and enable USB debugging, then run adb devices.'
}

$deviceId = $devices[0]
$metroListener = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $metroListener) {
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', "cd /d `"$projectRoot`" && npx --yes node@22 node_modules/react-native/cli.js start" -WorkingDirectory $projectRoot
  Write-Host 'Starting Metro with Node.js 22 in a separate terminal...'
  Start-Sleep -Seconds 5
}

adb -s $deviceId reverse tcp:8081 tcp:8081

Push-Location (Join-Path $projectRoot 'android')
try {
  $env:CMAKE_BUILD_PARALLEL_LEVEL = '2'
  $buildLogPath = Join-Path $env:TEMP 'uichat-mira-mobile-android-build.log'
  $buildSucceeded = $false

  for ($attempt = 1; $attempt -le 3; $attempt++) {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & .\gradlew.bat :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2 --console=plain *>&1 |
      Tee-Object -FilePath $buildLogPath
    $gradleExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorActionPreference

    if ($gradleExitCode -eq 0) {
      $buildSucceeded = $true
      break
    }

    $clangCrashed = Select-String -Path $buildLogPath -SimpleMatch 'clang frontend command failed due to signal' -Quiet
    if (-not $clangCrashed -or $attempt -eq 3) {
      throw "Android debug build failed. See $buildLogPath for details."
    }

    Write-Warning "clang crashed during native compilation. Retrying with cached outputs ($attempt/3)..."
  }

  if (-not $buildSucceeded) {
    throw "Android debug build failed. See $buildLogPath for details."
  }
} finally {
  Pop-Location
}

adb -s $deviceId install -r (Join-Path $projectRoot 'android/app/build/outputs/apk/debug/app-debug.apk')
if ($LASTEXITCODE -ne 0) {
  throw 'APK installation failed. Unlock the device, allow USB installation, and try again.'
}

adb -s $deviceId shell monkey -p com.myapp 1 | Out-Null
Write-Host "Installed and opened on $deviceId. Metro is available at localhost:8081."
