# AAB(Android App Bundle) 빌드 - 한글 경로 대응
# 사용: PowerShell에서 .\build-aab.ps1
# keystore.properties 없으면 debug 서명으로 AAB 생성 (테스트용). 스토어 제출용은 keystore 설정 후 재빌드.

$ErrorActionPreference = "Stop"
$projectRoot = Join-Path $env:USERPROFILE "Desktop\TotalManagements"
$androidPath = Join-Path $projectRoot "android"

if (-not (Test-Path $androidPath)) {
    Write-Error "android 폴더를 찾을 수 없습니다: $androidPath"
}

if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
    Write-Host "JAVA_HOME 설정: $env:JAVA_HOME"
}

Set-Location $androidPath
& .\gradlew.bat bundleRelease

if ($LASTEXITCODE -ne 0) {
    Write-Error "bundleRelease 실패 (exit code $LASTEXITCODE)"
}

$aabPath = Join-Path $androidPath "app\build\outputs\bundle\release\app-release.aab"
if (Test-Path $aabPath) {
    Write-Host ""
    Write-Host "AAB 생성 완료: $aabPath" -ForegroundColor Green
} else {
    Write-Error "AAB 파일을 찾을 수 없습니다: $aabPath"
}
