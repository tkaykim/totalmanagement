# Play 스토어 출시용 업로드 키(키스토어) 생성
# 참고: https://developer.android.com/studio/publish/app-signing?hl=ko#generate-key
# 실행 후 터미널에서 키스토어 비밀번호, 키 비밀번호, 이름 등 입력 프롬프트에 응답하세요.

$ErrorActionPreference = "Stop"
$projectRoot = Join-Path $env:USERPROFILE "Desktop\TotalManagements"
$androidPath = Join-Path $projectRoot "android"
$appPath = Join-Path $androidPath "app"
$keystorePath = Join-Path $appPath "totalmanagements-upload-key.jks"

if (-not (Test-Path $appPath)) {
    Write-Error "android/app 폴더를 찾을 수 없습니다: $appPath"
}

if (Test-Path $keystorePath) {
    Write-Host "이미 키스토어가 존재합니다: $keystorePath" -ForegroundColor Yellow
    $overwrite = Read-Host "덮어쓰시겠습니까? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "종료합니다. 기존 키스토어를 사용하려면 keystore.properties 만 설정하세요."
        exit 0
    }
}

if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
}
$keytool = Join-Path $env:JAVA_HOME "bin\keytool.exe"
if (-not (Test-Path $keytool)) {
    Write-Error "keytool을 찾을 수 없습니다: $keytool (JAVA_HOME 또는 Android Studio JBR 확인)"
}

# 유효기간 10000일(~27년) - Google Play 권장(2033년 10월 22일 이후 만료 필요)
# -dname: 인증서 정보를 한 번에 지정 → 마지막 '맞습니까? [no]:' 프롬프트 제거 (한글 환경에서 yes 인식 안 되는 문제 회피)
Write-Host "업로드 키를 생성합니다. 비밀번호만 입력하세요 (키 비밀번호는 같게 쓰려면 엔터)." -ForegroundColor Cyan
Write-Host ""

& $keytool -genkey -v `
    -keystore $keystorePath `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -alias totalmanagements-upload `
    -dname "CN=TotalManagements, OU=App, O=Grigo, L=Seoul, ST=Seoul, C=KR"

if ($LASTEXITCODE -ne 0) {
    Write-Error "키스토어 생성 실패"
}

Write-Host ""
Write-Host "키스토어 생성 완료: $keystorePath" -ForegroundColor Green
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "1. android 폴더에 keystore.properties 파일을 만드세요."
Write-Host "2. 아래 내용을 넣고, 비밀번호를 방금 입력한 값으로 바꾸세요."
Write-Host ""
Write-Host "--- keystore.properties ---"
Write-Host "storeFile=app/totalmanagements-upload-key.jks"
Write-Host "storePassword=방금_입력한_키스토어_비밀번호"
Write-Host "keyAlias=totalmanagements-upload"
Write-Host "keyPassword=방금_입력한_키_비밀번호"
Write-Host "---"
Write-Host ""
Write-Host "3. AAB 재빌드: .\build-aab.ps1"
