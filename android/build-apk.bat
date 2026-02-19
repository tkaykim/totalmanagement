@echo off
chcp 65001 >nul
setlocal

if defined JAVA_HOME (
  echo Using JAVA_HOME=%JAVA_HOME%
) else (
  if exist "C:\Program Files\Android\Android Studio\jbr" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    echo Using Android Studio JBR for JAVA_HOME
  ) else if exist "C:\Program Files\Java\jdk-21" (
    set "JAVA_HOME=C:\Program Files\Java\jdk-21"
    echo Using JDK 21 for JAVA_HOME
  ) else if exist "C:\Program Files\Java\jdk-17" (
    set "JAVA_HOME=C:\Program Files\Java\jdk-17"
    echo Using JDK 17 for JAVA_HOME
  ) else (
    echo ERROR: JAVA_HOME not set and no Java found in common locations.
    echo Set JAVA_HOME or install Android Studio / JDK.
    exit /b 1
  )
)

cd /d "%~dp0"
call gradlew.bat assembleDebug
set BUILD_RESULT=%ERRORLEVEL%
echo.
if %BUILD_RESULT% equ 0 (
  echo APK: app\build\outputs\apk\debug\app-debug.apk
) else (
  echo Build failed with exit code %BUILD_RESULT%
)
exit /b %BUILD_RESULT%
