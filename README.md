# Moment

Prywatny dziennik wspomnień. Dane i zdjęcia są przechowywane lokalnie na urządzeniu. W aplikacji Android możesz dodatkowo włączyć automatyczne kopie w wybranym folderze Dysku Google.

## Pobierz aplikację na Androida

[**Pobierz Moment dla Androida (.apk)**](https://github.com/generalpioter/MOMENT/releases/latest/download/Moment.apk)

Link pobiera APK bezpośrednio. Po pobraniu otwórz plik na telefonie i zezwól na instalację aplikacji z tego źródła, jeśli Android o to poprosi. Link będzie dostępny po opublikowaniu pierwszej wersji.

## Używanie aplikacji

- Przypomnienia wewnątrz aplikacji są dostępne. Powiadomienia push są tymczasowo wyłączone.
- W APK otwórz **Ustawienia → Automatyczna kopia Google Drive → Wybierz folder Google Drive** i wskaż folder na Dysku Google. Moment zapisuje tam kopie po zmianach i zachowuje do 5 ostatnich wersji.
- Jeśli aplikacja znajdzie kopię na Dysku Google, gdy lokalne dane są puste, zaproponuje jej przywrócenie. Przywracanie zawsze wymaga potwierdzenia.
- **Zapisz kopię teraz** tworzy dodatkową kopię w połączonym folderze. **Przywróć kopię** otwiera systemowy wybór pliku, z którego można wybrać JSON na Dysku Google lub urządzeniu.
- W PWA kopie nadal pobiera się i przywraca ręcznie w **Ustawienia → Kopie zapasowe**.
- Nie odinstalowuj aplikacji, dopóki nie sprawdzisz, że kopia jest widoczna na Dysku Google albo nie masz pobranego pliku JSON. Dane lokalne mogą zostać usunięte przy odinstalowaniu.
- APK jest przeznaczony do ręcznej instalacji. Publikacja w Google Play wymaga osobnego, podpisanego pakietu AAB.

## Instalacja jako PWA

- Android: otwórz [Moment](https://generalpioter.github.io/MOMENT/) w Chrome i wybierz **Zainstaluj aplikację**.
- iPhone: otwórz [Moment](https://generalpioter.github.io/MOMENT/) w Safari, wybierz **Udostępnij → Dodaj do ekranu początkowego**.

## Publikacja nowej wersji APK

Wydania z tagów są podpisywane stałym kluczem Androida. Przed pierwszym tagiem skonfiguruj go raz:

1. W PowerShell wygeneruj klucz i zachowaj plik `.jks` w bezpiecznym miejscu. Nie wysyłaj go do repozytorium:

   ```powershell
   keytool -genkeypair -v -keystore moment-release.jks -alias moment -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Skopiuj jego kod Base64 do schowka:

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\moment-release.jks")) | Set-Clipboard
   ```

3. W repozytorium GitHub otwórz **Settings → Secrets and variables → Actions** i dodaj sekrety:
   - `ANDROID_KEYSTORE_BASE64` — zawartość schowka
   - `ANDROID_KEYSTORE_PASSWORD` — hasło magazynu kluczy
   - `ANDROID_KEY_ALIAS` — alias, np. `moment`
   - `ANDROID_KEY_PASSWORD` — hasło klucza

   Zachowaj plik keystore i hasła. Bez nich nie będzie można podpisać aktualizacji tym samym kluczem; tag wydania zakończy się błędem, jeśli któregokolwiek sekretu zabraknie.

Następnie wypchnij tag wersji, aby GitHub Actions zbudował podpisany APK i opublikował go w GitHub Releases. Link pobierania powyżej zawsze wskazuje najnowszą wersję.

```bash
git tag v1.0.0
git push origin v1.0.0
```

Przy kolejnych wydaniach użyj nowego numeru wersji, np. `v1.0.1`.
Wydania z głównej gałęzi nadal tworzą testowy APK jako artefakt Actions, ale nie publikują go jako wersji. Przed przejściem z obecnego APK debug na pierwsze wydanie podpisane kluczem trzeba mieć sprawdzoną kopię danych; Android może wymagać jednorazowego odinstalowania aplikacji ze względu na zmianę podpisu.

## Uruchomienie lokalne

```bash
npm ci
npm run dev
```
