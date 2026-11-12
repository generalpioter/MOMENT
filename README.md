# Moment

Mobilny dziennik wspomnień z lokalnym zapisem, kapsułami czasu, przypomnieniami i kopiami JSON. Aplikacja jest przygotowana jako instalowalna PWA.

## Uruchomienie lokalne

```bash
npm ci
npm run dev
```

## GitHub Pages

Wypchnij projekt na gałąź `main` lub `master`, a workflow `.github/workflows/deploy.yml` zbuduje i opublikuje aplikację. W ustawieniach repozytorium w sekcji Pages wybierz źródło **GitHub Actions**. Adres pojawi się po zakończeniu workflow.

## Instalacja na telefonie

- Android: otwórz adres Pages w Chrome i wybierz **Zainstaluj aplikację** lub **Dodaj do ekranu głównego**.
- iPhone: otwórz adres Pages w Safari, wybierz **Udostępnij**, a następnie **Dodaj do ekranu początkowego**.

## APK dla Androida

Projekt zawiera natywną obudowę Androida opartą na Capacitorze. Aby lokalnie wygenerować instalowalny APK, zainstaluj Android Studio z Android SDK oraz JDK 21, a następnie:

```bash
npm ci
npm run android:sync
cd android
./gradlew assembleDebug
```

W Windows PowerShell uruchom zamiast ostatnich dwóch poleceń:

```powershell
Set-Location android
.\gradlew.bat assembleDebug
```

Gotowy plik APK znajdziesz w `android/app/build/outputs/apk/debug/app-debug.apk`. Można go pobrać i zainstalować na urządzeniu z Androidem (może być konieczne zezwolenie na instalację z tego źródła). APK debug służy do testów i ręcznej instalacji, nie do publikacji w Google Play. Workflow **Build Android APK** tworzy taki plik jako artefakt do pobrania w GitHub Actions. Publikacja w Google Play wymaga skonfigurowania podpisanego pakietu AAB.

Capacitor nie dodaje natywnych powiadomień push. Obecna integracja OneSignal działa w wersji PWA w obsługiwanej przeglądarce; powiadomienia z natywnego APK wymagałyby osobnej integracji Android SDK.

## Powiadomienia push

1. Utwórz aplikację Web Push w OneSignal, wybierz integrację **Custom Code** i ustaw Site URL na `https://generalpioter.github.io`.
2. Skopiuj OneSignal App ID do zmiennej repozytorium `VITE_ONESIGNAL_APP_ID` w **Settings → Secrets and variables → Actions → Variables**. App ID jest publiczny, nie umieszczaj tam REST API key.
3. Wypchnij zmianę na `main`; workflow zbuduje PWA z integracją. W Ustawieniach Moment włącz powiadomienia push i zaakceptuj zgodę przeglądarki.
4. W OneSignal dodaj urządzenie jako testowego subskrybenta i wyślij testową wiadomość.

Na iPhonie wymagany jest iOS/iPadOS 16.4 lub nowszy oraz dodanie aplikacji do ekranu początkowego. Serwis worker OneSignal działa w podkatalogu i nie koliduje z workerem cache PWA.

Pliki aplikacji są buforowane do użycia offline. Wspomnienia pozostają lokalne dla przeglądarki/urządzenia; przenoś je przez eksport i import kopii JSON.