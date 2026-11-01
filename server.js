/**
 * ==============================================================================
 * D4 READER - MIKRO-MOSTEK NODE.JS (server.js)
 * ==============================================================================
 * Ten skrypt pełni rolę mostka pomiędzy grą Diablo 4 (biblioteką saapi64.dll),
 * a Twoją przeglądarką internetową.
 *
 * Zasada działania:
 * 1. Tworzy serwer Windows Named Pipe (np. \\.\pipe\d4lf).
 * 2. Odbiera surowy strumień bajtów (Buffer) wysyłany przez saapi64.dll przy odczycie tekstu z gry.
 * 3. Inteligentnie rozpoznaje kodowanie (UTF-8 vs UTF-16LE), zapobiegając błędowi
 *    wyświetlania chińskich znaków (Mojibake).
 * 4. Przesyła odkodowany i oczyszczony tekst w czasie rzeczywistym do przeglądarki
 *    za pomocą Server-Sent Events (SSE) z kodowaniem UTF-8.
 *
 * 100% Czysty JavaScript / Node.js – ZERO bibliotek zewnętrznych (npm).
 * ==============================================================================
 */

// Import wbudowanego modułu 'http' do obsługi zapytań przeglądarki oraz SSE
const http = require("http");

// Import wbudowanego modułu 'net' do niskopoziomowej obsługi gniazd sieciowych i Windows Named Pipes
const net = require("net");

// Import modułów 'fs' i 'path' wyłącznie do wygodnego serwowania plików index.html i app.js
const fs = require("fs");
const path = require("path");

// ------------------------------------------------------------------------------
// KONFIGURACJA
// ------------------------------------------------------------------------------

/**
 * Nazwa potoku Windows Named Pipe.
 * Zapis w postaci '\\\\.\\pipe\\d4lf' wynika z konieczności ucieczki (escaping) ukośników:
 * W systemie Windows rzeczywista ścieżka to: \\.\pipe\d4lf
 * To pod tę nazwę podłącza się biblioteka saapi64.dll (d4lf / D4TTS).
 */
const PIPE_NAME = "\\\\.\\pipe\\d4lf";

/**
 * Port HTTP, na którym serwer nasłuchuje połączeń z przeglądarki.
 */
const HTTP_PORT = 3000;

// Zbiór aktywnych połączeń SSE (otwarte strumienie przeglądarek)
const sseClients = new Set();

// ------------------------------------------------------------------------------
// FUNKCJE POMOCNICZE
// ------------------------------------------------------------------------------

/**
 * Rozsyła odebrany tekst do wszystkich podłączonych do SSE przeglądarek.
 *
 * @param {string} text - Odkodowany, surowy tekst przedmiotu z gry
 */
function broadcastToClients(text) {
  if (sseClients.size === 0) {
    console.log("[SSE] Brak połączonych przeglądarek. Wiadomość oczekuje.");
    return;
  }

  /**
   * Standard Server-Sent Events (SSE):
   * Format wiadomości wymaga przedrostka 'data: ' oraz podwójnego znaku nowej linii '\n\n' na końcu.
   *
   * Dlaczego JSON.stringify?
   * Teksty przedmiotów w Diablo 4 zawierają wiele linijek (afiksy, moc przedmiotu itp.).
   * Bezpośrednie wstawienie wielu linii zepsułoby format protokołu SSE (każda linia wymagałaby 'data: ').
   * Spakowanie tekstu do obiektu JSON { text: "..." } gwarantuje bezpieczny i bezbłędny transport.
   */
  const payload = JSON.stringify({ text: text, timestamp: Date.now() });
  const sseMessage = `data: ${payload}\n\n`;

  for (const clientResponse of sseClients) {
    clientResponse.write(sseMessage);
  }

  console.log(`[SSE] Wysłano tekst przedmiotu do ${sseClients.size} klientów.`);
}

// ------------------------------------------------------------------------------
// 1. OBSŁUGA WINDOWS NAMED PIPE (moduł 'net')
// ------------------------------------------------------------------------------

/**
 * Tworzymy serwer gniazda za pomocą modułu 'net'.
 * W systemie Windows, gdy jako cel nasłuchiwania podamy ścieżkę potoku '\\.\pipe\...',
 * Node.js automatycznie używa mechanizmu Windows Named Pipes zamiast tradycyjnego portu TCP.
 */
const pipeServer = net.createServer((socket) => {
  console.log(
    "\n[Named Pipe] Nawiązano połączenie z klientem potoku (np. saapi64.dll z Diablo 4).",
  );

  /**
   * Zdarzenie 'data' jest wywoływane za każdym razem, gdy gra przesyła porcję danych.
   * Argument 'buffer' to surowy obiekt Buffer (strumień bajtów).
   * NIE używamy socket.setEncoding(), dzięki czemu mamy bezpośredni dostęp do bajtów
   * i możemy przeanalizować ich strukturę przed dekodowaniem.
   */
  socket.on("data", (buffer) => {
    /**
     * INTELIGENTNE ROZPOZNAWANIE KODOWANIA (UTF-16LE vs UTF-8):
     *
     * Dlaczego wcześniej pojawiały się chińskie znaki (Mojibake)?
     * Standardowy tekst łaciński w kodowaniu UTF-8 zajmuje 1 bajt na znak (np. 'D' = 0x44, 'o' = 0x6F).
     * W kodowaniu UTF-16LE każdy znak zajmuje co najmniej 2 bajty, gdzie dla znaków ASCII
     * starszy bajt to zawsze 0x00 (np. 'D' = [0x44, 0x00], 'o' = [0x6F, 0x00]).
     *
     * Jeśli biblioteka saapi64.dll wysyła bajty w UTF-8, a my zinterpretujemy je na sztywno jako UTF-16LE,
     * dwa kolejne bajty ASCII (np. 0x44 i 0x6F) zostaną sklejone w pojedynczą 16-bitową liczbę 0x6F44,
     * która w tablicy Unicode wskazuje na chiński ideogram (np. 潄).
     *
     * Badamy strukturę bufora:
     * Jeśli bufor ma długość większą niż 1 bajt i drugi bajt (buffer[1] === 0)
     * lub czwarty bajt (buffer[3] === 0) to bajt zerowy, mamy do czynienia z UTF-16LE (wchar_t z Windows/C++).
     * W przeciwnym razie tekst jest przesyłany jako czysty UTF-8.
     */
    const isUtf16Le =
      buffer.length > 1 &&
      (buffer[1] === 0 || (buffer.length > 3 && buffer[3] === 0));
    const detectedEncoding = isUtf16Le ? "utf16le" : "utf8";

    // Dekodujemy tekst właściwym kodowaniem
    const rawString = buffer.toString(detectedEncoding);

    /**
     * Oczyszczanie tekstu:
     * Usuwamy znaki null (\0), którymi biblioteki C/C++ kończą stringi w pamięci,
     * oraz zbędne białe znaki na początku i końcu.
     */
    const cleanText = rawString.replace(/\0/g, "").trim();

    // Jeśli po oczyszczeniu tekst jest pusty, ignorujemy go i nie wysyłamy dalej
    if (!cleanText) {
      return;
    }

    console.log("----------------------------------------------------");
    console.log(
      `[Named Pipe] Odebrano pakiet danych (${detectedEncoding.toUpperCase()}):`,
    );
    console.log(cleanText);
    console.log("----------------------------------------------------");

    // Przekazujemy oczyszczony tekst do przeglądarki przez SSE
    broadcastToClients(cleanText);
  });

  // Obsługa zamknięcia połączenia przez bibliotekę saapi64.dll
  socket.on("close", () => {
    console.log("[Named Pipe] Klient potoku rozłączył się.");
  });

  // Obsługa błędów gniazda (np. niespodziewane zerwanie połączenia)
  socket.on("error", (err) => {
    console.error("[Named Pipe] Błąd gniazda:", err.message);
  });
});

/**
 * Rozpoczynamy nasłuchiwanie na Windows Named Pipe.
 */
pipeServer.listen(PIPE_NAME, () => {
  console.log(
    `[Named Pipe] Serwer potoku Windows aktywny pod ścieżką: ${PIPE_NAME}`,
  );
});

// Obsługa błędu uruchomienia serwera potoku (np. gdy inny program już zajął ten potok)
pipeServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n[BŁĄD] Potok ${PIPE_NAME} jest już zajęty!`);
    console.error(
      "Upewnij się, że oryginalna aplikacja d4lf lub inna instancja server.js nie jest uruchomiona.\n",
    );
  } else {
    console.error("[Named Pipe] Błąd serwera:", err.message);
  }
});

// ------------------------------------------------------------------------------
// 2. SERWER HTTP & SERVER-SENT EVENTS (moduł 'http')
// ------------------------------------------------------------------------------

/**
 * Tworzymy serwer HTTP, który:
 * - Obsługuje endpoint SSE pod adresem /stream
 * - Serwuje statyczne pliki index.html i app.js, aby można było otworzyć aplikację
 *   bezpośrednio pod adresem http://localhost:3000
 */
const httpServer = http.createServer((req, res) => {
  // 1. ENDPOINT SSE: /stream
  if (req.url === "/stream") {
    /**
     * Nagłówki standardu Server-Sent Events (SSE):
     * - 'Content-Type': 'text/event-stream; charset=utf-8' informuje przeglądarkę, że połączenie nie zostanie
     *   zamknięte, lecz będzie nieprzerwanym strumieniem zdarzeń tekstowych w kodowaniu UTF-8.
     * - 'Cache-Control': 'no-cache' zapobiega buforowaniu danych przez przeglądarkę lub proxy.
     * - 'Connection': 'keep-alive' utrzymuje aktywne, otwarte połączenie TCP.
     * - 'Access-Control-Allow-Origin': '*' pozwala na połączenie z dowolnego pochodzenia (CORS),
     *   co umożliwia otwarcie pliku index.html np. z dysku (file://) lub innego serwera.
     */
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Origin, X-Requested-With, Content-Type, Accept",
    });

    // Wysłanie początkowego komentarza SSE, aby natychmiast zatwierdzić połączenie w przeglądarce
    res.write(": polaczono z serwerem sse d4reader\n\n");

    // Dodajemy odpowiedź klienta do zbioru aktywnych połączeń
    sseClients.add(res);
    console.log(
      `[HTTP/SSE] Przeglądarka połączona. Aktywnych klientów: ${sseClients.size}`,
    );

    // Gdy przeglądarka zamknie kartę lub zerwie połączenie:
    req.on("close", () => {
      sseClients.delete(res);
      console.log(
        `[HTTP/SSE] Przeglądarka rozłączona. Aktywnych klientów: ${sseClients.size}`,
      );
    });

    return;
  }

  // 2. SERWOWANIE PLIKU app.js
  if (req.url === "/app.js") {
    const scriptPath = path.join(__dirname, "app.js");
    fs.readFile(scriptPath, (err, content) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Błąd odczytu app.js");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8",
      });
      res.end(content);
    });
    return;
  }

  // 3. SERWOWANIE PLIKU index.html (główna strona)
  if (req.url === "/" || req.url === "/index.html") {
    const htmlPath = path.join(__dirname, "index.html");
    fs.readFile(htmlPath, (err, content) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Błąd odczytu index.html");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(content);
    });
    return;
  }

  // Domyślna odpowiedź 404 dla pozostałych ścieżek
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Nie znaleziono ścieżki (404)");
});

// Obsługa błędów serwera HTTP (np. zajęty port 3000)
httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n[BŁĄD] Port ${HTTP_PORT} jest już zajęty przez inną aplikację!`,
    );
    console.error(
      `Zmień zmienną HTTP_PORT na inny port lub zamknij proces zajmujący port ${HTTP_PORT}.\n`,
    );
  } else {
    console.error("[HTTP] Błąd serwera:", err.message);
  }
});

// Uruchomienie serwera HTTP
httpServer.listen(HTTP_PORT, () => {
  console.log(`[HTTP] Serwer webowy działa na: http://localhost:${HTTP_PORT}`);
  console.log(
    `[HTTP] Strumień SSE dostępny pod: http://localhost:${HTTP_PORT}/stream\n`,
  );
  console.log("Gotowy do nasłuchiwania danych z gry lub symulatora!");
});

// Sprzątanie przy zamykaniu procesu (Ctrl + C)
process.on("SIGINT", () => {
  console.log("\nZamykanie serwera D4 Reader...");
  pipeServer.close();
  httpServer.close(() => {
    process.exit(0);
  });
});
