# D4 Reader - Minimalistyczny Czytnik Przedmiotów Diablo 4

Edukacyjny fundament (starter / boilerplate) aplikacji webowej napisany w **100% czystym JavaScript (Vanilla JS)** oraz **czystym Node.js (zero zewnętrznych zależności npm)**. 

Aplikacja w czasie rzeczywistym przechwytuje tekst statystyk przedmiotów z gry **Diablo 4** za pośrednictwem czytnika ekranowego gry (TTS) i mechanizmu **Windows Named Pipe**, a następnie przekazuje go przez **Server-Sent Events (SSE)** i wypisuje w czytelnej formie w konsoli przeglądarki (`console.log`).

---

## Główne Cechy Projektu

- **Zero zewnętrznych bibliotek npm:** Używa wyłącznie wbudowanych w Node.js modułów standardowych (`net`, `http`, `fs`, `path`).
- **Natywny mechanizm Windows Named Pipe:** Serwer tworzy potok `\\.\pipe\d4lf`, pod który podłącza się biblioteka `saapi64.dll`.
- **Inteligentne rozpoznawanie kodowania (Brak krzaczków / Mojibake):** Skrypt automatycznie wykrywa strukturę bajtów w buforze (`UTF-8` vs `UTF-16LE`) i poprawnie dekoduje zarówno polskie, jak i angielskie znaki, eliminując problem chińskich symboli.
- **Server-Sent Events (SSE):** Lekki, jednokierunkowy strumień HTTP (`/stream`) z automatycznym wznawianiem połączenia przez natywny obiekt `EventSource` w przeglądarce.
- **Ciemny motyw (Dark Mode) i symulator:** Interfejs z dynamicznym wskaźnikiem połączenia oraz przyciskiem do testowania bez uruchomionej gry.
- **Gotowe miejsce pod parser:** Wyraźnie oznaczona sekcja `// TODO` w funkcji `handleItemData(rawText)` do łatwego podpięcia własnych wyrażeń regularnych (RegEx).

---

## Skąd wziąć i jak zainstalować plik saapi64.dll (Krok obowiązkowy)

Gra Diablo 4 przekazuje tekst podświetlonych przedmiotów do biblioteki ułatwień dostępu (Screen Reader API). Do przechwycenia tych danych wykorzystywana jest zmodyfikowana biblioteka `saapi64.dll` oraz automatyczny instalator z projektu **D4LF (Diablo 4 Loot Filter)**.

### Instrukcja instalacji krok po kroku:

1. **Pobierz pliki:**
   Przejdź do oficjalnego repozytorium projektu D4LF i pobierz zawartość katalogu `tts` (pliki `saapi64.dll` oraz `install_dll.cmd`):
   **[https://github.com/d4lfteam/d4lf/tree/main/tts](https://github.com/d4lfteam/d4lf/tree/main/tts)**

2. **Kopia zapasowa (Opcjonalnie):**
   Instalator automatycznie nadpisze plik `saapi64.dll` w folderze gry. Jeśli chcesz zachować oryginał, przed instalacją wejdź do katalogu z grą `Diablo IV` i zmień nazwę oryginalnego pliku `saapi64.dll` na `saapi64.dll.bak` (w razie potrzeby oryginalny plik można też w każdej chwili przywrócić opcją „Skanuj i napraw” w aplikacji Battle.net).

3. **Uruchom automatyczny instalator (`install_dll.cmd`):**
   - Wypakuj pobrane pliki (`saapi64.dll` i `install_dll.cmd`) do jednego folderu tymczasowego.
   - **Wskazówka:** Uruchom grę **Diablo 4** w tle — dzięki temu skrypt sam wykryje folder instalacyjny gry bezpośrednio z uruchomionego procesu.
   - Uruchom plik **`install_dll.cmd`** (skrypt sam poprosi o uprawnienia Administratora).
   - Jeśli gra nie była włączona, możesz ją uruchomić i nacisnąć `Enter` w oknie konsoli lub wkleić ścieżkę do folderu z plikiem `Diablo IV.exe` ręcznie.
   - **Co zrobi skrypt automatycznie:**
     * Wykryje katalog instalacyjny Diablo IV i bezpiecznie zamknie grę (jeśli była uruchomiona), aby odblokować podmianę pliku.
     * Sam skopiuje plik `saapi64.dll` prosto do głównego folderu gry `Diablo IV`.
     * Wygeneruje lokalny certyfikat (`CN=Cert for D4LF`) i doda go do zaufanych certyfikatów bieżącego użytkownika Windows.
     * Wyszuka narzędzie `signtool.exe` (a jeśli go nie masz w systemie, automatycznie pobierze oficjalną, lekką paczkę Microsoft SDK BuildTools do folderu `.tools`) i podpisze cyfrowo plik `saapi64.dll` bezpośrednio w katalogu gry.

---

## Ustawienia w grze Diablo 4

Aby gra zaczęła wysyłać teksty przedmiotów do zainstalowanej biblioteki `saapi64.dll`:

1. Uruchom grę **Diablo 4**.
2. Wejdź w **Opcje (Options)** -> zakładka **Dostępność (Accessibility)**.
3. Znajdź sekcję czytnika ekranu i włącz:
   - **Czytnik ekranowy (Screen Reader)** -> ustaw na **Włączony (Enabled)**.
   - **Zewnętrzny czytnik ekranowy (3rd Party Screen Reader)** -> upewnij się, że opcja korzystania z zewnętrznego oprogramowania jest **włączona**.
4. *(Opcjonalnie)*: W ustawieniach dźwięku ułatwień dostępu możesz wyciszyć głośność syntezatora mowy w samej grze, jeśli nie chcesz słyszeć czytanego na głos tekstu z głośników.

---

## Jak uruchomić projekt

### 1. Uruchomienie mikro-mostka Node.js
W folderze projektu otwórz terminal i wpisz:
```bash
node server.js
