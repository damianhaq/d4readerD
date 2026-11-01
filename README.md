# D4 Reader - Minimalistyczny Czytnik Przedmiotów Diablo 4

Edukacyjny fundament (starter / boilerplate) aplikacji webowej napisany w **100% czystym JavaScript (Vanilla JS)** oraz **czystym Node.js (zero zewnętrznych zależności npm)**.

Aplikacja w czasie rzeczywistym przechwytuje tekst statystyk przedmiotów z gry **Diablo 4** za pośrednictwem czytnika ekranowego gry (TTS) i mechanizmu **Windows Named Pipe**, a następnie przekazuje go przez **Server-Sent Events (SSE)** i wypisuje w czytelnej formie w konsoli przeglądarki (`console.log`).

## Główne Cechy Projektu

- **Zero zewnętrznych bibliotek npm:** Używa wyłącznie wbudowanych w Node.js modułów standardowych (`net`, `http`, `fs`, `path`).
- **Natywny mechanizm Windows Named Pipe:** Serwer tworzy potok `\\.\pipe\d4lf`, pod który podłącza się biblioteka `saapi64.dll`.
- **Inteligentne rozpoznawanie kodowania (Brak krzaczków / Mojibake):** Skrypt automatycznie wykrywa strukturę bajtów w buforze (`UTF-8` vs `UTF-16LE`) i poprawnie dekoduje zarówno polskie, jak i angielskie znaki, eliminując problem chińskich symboli.
- **Server-Sent Events (SSE):** Lekki, jednokierunkowy strumień HTTP (`/stream`) z automatycznym wznawianiem połączenia przez natywny obiekt `EventSource` w przeglądarce.
- **Ciemny motyw (Dark Mode) i symulator:** Interfejs z dynamicznym wskaźnikiem połączenia oraz przyciskiem do testowania bez uruchomionej gry.
- **Gotowe miejsce pod parser:** Wyraźnie oznaczona sekcja `// TODO` w funkcji `handleItemData(rawText)` do łatwego podpięcia własnych wyrażeń regularnych (RegEx).

## Skąd wziąć i jak zainstalować plik saapi64.dll (Krok obowiązkowy)

Gra Diablo 4 przekazuje tekst podświetlonych przedmiotów do biblioteki ułatwień dostępu (Screen Reader API). Do przechwycenia tych danych wykorzystywana jest zmodyfikowana biblioteka `saapi64.dll` oraz automatyczny instalator z projektu **D4LF (Diablo 4 Loot Filter)**.

### Instrukcja instalacji krok po kroku:

1. **Pobierz pliki:**
   Przejdź do oficjalnego repozytorium projektu D4LF i pobierz zawartość katalogu `tts` (pliki `saapi64.dll` oraz `install_dll.cmd`):
   **[https://github.com/d4lfteam/d4lf/tree/main/tts](https://github.com/d4lfteam/d4lf/tree/main/tts)**

2. **Kopia zapasowa (Opcjonalnie):**
   Instalator automatycznie nadpisze plik `saapi64.dll` w folderze gry. Jeśli chcesz zachować oryginał, przed instalacją wejdź do katalogu z grą `Diablo IV` i zmień nazwę oryginalnego pliku `saapi64.dll` na `saapi64.dll.bak` (w razie potrzeby oryginalny plik można też w każdej chwili przywrócić opcją „Skanuj i napraw” w aplikacji Battle.net).

3. **Uruchom automatyczny instalator (`install_dll.cmd`):**
   - Wypakuj pobrane pliki (`saapi64.dll` oraz `install_dll.cmd`) do wspólnego folderu tymczasowego.
   - **Wskazówka:** Uruchom grę **Diablo 4** w tle — dzięki temu instalator sam wykryje folder instalacyjny gry bezpośrednio z uruchomionego procesu `Diablo IV.exe`.
   - Uruchom plik **`install_dll.cmd`** (skrypt sam poprosi o uprawnienia Administratora).
   - Jeśli gra nie była włączona, możesz ją uruchomić i nacisnąć `Enter` w oknie konsoli lub wkleić ścieżkę do folderu z plikiem `Diablo IV.exe` ręcznie.
   - **Co zrobi skrypt automatycznie (nie musisz kopiować pliku ręcznie):**
     * Wykryje katalog instalacyjny Diablo IV i bezpiecznie zamknie grę (jeśli była uruchomiona), aby odblokować podmianę pliku.
     * Sam skopiuje plik `saapi64.dll` bezpośrednio do głównego folderu gry `Diablo IV`.
     * Wygeneruje lokalny certyfikat (`CN=Cert for D4LF`) i doda go do zaufanych certyfikatów bieżącego użytkownika Windows.
     * Wyszuka narzędzie `signtool.exe` (a jeśli go nie masz w systemie, automatycznie pobierze oficjalną, lekką paczkę Microsoft SDK BuildTools do folderu `.tools`) i podpisze cyfrowo plik `saapi64.dll` bezpośrednio w katalogu gry.

## Ustawienia w grze Diablo 4

Aby gra zaczęła wysyłać teksty przedmiotów do zainstalowanej biblioteki `saapi64.dll`:

1. Uruchom grę **Diablo 4**.
2. Wejdź w **Opcje (Options)** -> zakładka **Dostępność (Accessibility)**.
3. Znajdź sekcję czytnika ekranu i włącz:
   - **Czytnik ekranowy (Screen Reader)** -> ustaw na **Włączony (Enabled)**.
   - **Zewnętrzny czytnik ekranowy (3rd Party Screen Reader)** -> upewnij się, że opcja korzystania z zewnętrznego oprogramowania jest **włączona**.
4. *(Opcjonalnie)*: W ustawieniach dźwięku ułatwień dostępu możesz wyciszyć głośność syntezatora mowy w samej grze, jeśli nie chcesz słyszeć czytanego na głos tekstu z głośników.

## Jak uruchomić projekt

### 1. Uruchomienie mikro-mostka Node.js
W folderze projektu otwórz terminal i wpisz:

~~~bash
node server.js
~~~

*(lub `npm start`)*

W terminalu pojawi się informacja:

~~~text
[Named Pipe] Serwer potoku Windows aktywny pod ścieżką: \\.\pipe\d4lf
[HTTP] Serwer webowy działa na: http://localhost:3000
[HTTP] Strumień SSE dostępny pod: http://localhost:3000/stream
~~~

### 2. Otwarcie aplikacji w przeglądarce
1. Otwórz w przeglądarce adres: **[http://localhost:3000](http://localhost:3000)**.
2. Dioda statusu zmieni kolor na zielony (**„Połączono z serwerem (SSE)”**).
3. Otwórz konsolę deweloperską: naciśnij **`F12`** (lub `Ctrl + Shift + I`) i przejdź do zakładki **Console**.

### 3. Testowanie i użytkowanie
- **Bez włączania gry (w oknie przeglądarki):** Kliknij przycisk **„Symuluj przedmiot z D4”**. W konsoli F12 natychmiast zobaczysz przykładowy pakiet danych przedmiotu.
- **Bez włączania gry (test pełnego potoku Named Pipe):** W drugim oknie terminala wpisz:

~~~bash
node test_pipe.js
~~~

*(Domyślnie wysyła UTF-8. Możesz też przetestować UTF-16 wpisując `node test_pipe.js utf16`)*.
- **Na żywo z grą:** Uruchom Diablo 4, wejdź do gry i najedź kursorem myszy na dowolny przedmiot w ekwipunku lub na ziemi. Tekst przedmiotu w ułamku sekundy pojawi się w Twojej konsoli przeglądarki!

## Struktura Projektu

~~~text
d4readerD/
├── server.js          # Mikro-mostek: Named Pipe (\\.\pipe\d4lf) + Serwer HTTP / SSE
├── index.html         # Interfejs Dark Mode ze wskaźnikiem stanu połączenia
├── app.js             # Klient Vanilla JS (EventSource SSE + funkcja handleItemData)
├── test_pipe.js       # Narzędzie testowe do wysyłania pakietów bezpośrednio do potoku
├── package.json       # Podstawowy manifest projektu (scripts: start, test-pipe)
├── .gitignore         # Ignorowanie plików logów, binarek .dll i certyfikatów
└── README.md          # Dokumentacja projektu
~~~

## Pomysły na przyszłą rozbudowę (TODO)

Kod został zaprojektowany tak, aby cała logika parsowania trafiała do jednej funkcji: `handleItemData(rawText)` w pliku [`app.js`](./app.js).

Oto kilka sugerowanych kierunków dalszego rozwoju:
1. **Parser RegEx -> JSON:**
   - Wyciąganie nazwy przedmiotu, rzadkości (Zwykły, Święty, Starożytny, Legendarny, Unikatowy).
   - Ekstrakcja liczbowej wartości **Mocy Przedmiotu (Item Power)**.
   - Odczyt podstawowych statystyk broni / pancerza (obrażenia na sekundę, pancerz).
   - Parsowanie poszczególnych afiksów oraz oznaczeń **Większego Afiksu (Greater Affix / GA)**.
2. **Filtrowanie duplikatów i Debounce:**
   - Gdy kursor pozostaje na przedmiocie, czytnik ekranu może wysyłać ten sam tekst wielokrotnie. Warto dodać prosty mechanizm zapamiętujący ostatni odebrany hash/tekst i ignorujący powtórzenia w odstępie np. 500 ms.
3. **Wizualne karty przedmiotów (UI):**
   - Renderowanie ładnych kafelków przedmiotów w interfejsie HTML w kolorach odpowiadających rzadkości (pomarańczowy dla legendarnych, unikalny brąz dla unikatów).
4. **Alerty dźwiękowe i integracje:**
   - Odtwarzanie dźwięku (np. Loot Filter drop sound) przy wykryciu poszukiwanego afiksu lub 2x/3x GA.
   - Eksport danych lub wysyłanie powiadomień webhookiem na Discord.

## Licencja
Projekt o charakterze edukacyjnym i otwartoźródłowym (MIT).
Diablo 4 jest zastrzeżonym znakiem towarowym firmy Blizzard Entertainment.
Projekt bazuje na idei przechwytywania ułatwień dostępu spopularyzowanej przez społeczność skupioną wokół narzędzia D4LF.
