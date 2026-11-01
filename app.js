/**
 * ==============================================================================
 * D4 READER - SKRYPT KLIENTA PRZEGLĄDARKI (app.js)
 * ==============================================================================
 * Czysty JavaScript (Vanilla JS), bez żadnych bibliotek zewnętrznych i bundlerów.
 * 
 * Zasada działania:
 * 1. Nawiązuje jednokierunkowe, trwałe połączenie z serwerem lokalnym server.js
 *    przy użyciu natywnego interfejsu przeglądarki: EventSource (Server-Sent Events).
 * 2. Aktualizuje wizualny status połączenia w interfejsie użytkownika.
 * 3. Po odebraniu pakietu danych (z gry lub symulatora) przekazuje surowy tekst
 *    do dedykowanej funkcji handleItemData(rawText).
 * 4. Funkcja handleItemData(rawText) wypisuje tekst w konsoli (console.log)
 *    i zawiera przygotowane miejsce (TODO) na przyszłe parsowanie i wyrażenia regularne.
 * ==============================================================================
 */

// Adres URL endpointu SSE wystawionego przez nasz mikro-mostek server.js
const SSE_URL = 'http://localhost:3000/stream';

// Pobranie kluczowych elementów interfejsu z drzewa DOM
const statusContainer = document.getElementById('status-container');
const statusText = document.getElementById('status-text');
const simulateBtn = document.getElementById('simulate-btn');
const rawItemDisplay = document.getElementById('raw-item-display');
const itemsCounter = document.getElementById('items-counter');

// Licznik odebranych pakietów przedmiotów w bieżącej sesji przeglądarki
let receivedCount = 0;

// ------------------------------------------------------------------------------
// GŁÓWNA FUNKCJA OBSŁUGI PRZEDMIOTU
// ------------------------------------------------------------------------------

/**
 * Główna funkcja, do której trafia KAŻDY surowy tekst przedmiotu:
 * zarówno przechwycony na żywo z gry Diablo 4 przez potok,
 * jak i wygenerowany przyciskiem symulacji.
 * 
 * @param {string} rawText - Surowy, wielowierszowy tekst odczytany przez czytnik ekranu gry
 */
function handleItemData(rawText) {
    // 1. Zgodnie z wymaganiami wypisujemy surowy tekst w konsoli deweloperskiej
    console.group(`[D4 Reader] Pakiet przedmiotu #${++receivedCount} (${new Date().toLocaleTimeString()})`);
    console.log(rawText);
    console.groupEnd();

    // 2. Aktualizacja pomocniczego podglądu w interfejsie graficznym
    if (rawItemDisplay) {
        rawItemDisplay.classList.remove('empty-placeholder');
        rawItemDisplay.textContent = rawText;
    }
    if (itemsCounter) {
        itemsCounter.textContent = `Odebrano: ${receivedCount}`;
    }

    // ==========================================================================
    // TODO: MIEJSCE NA TWOJE WŁASNE WYRAŻENIA REGULARNE (RegEx) I DALSZĄ LOGIKĘ:
    // ==========================================================================
    // Tutaj możesz w przyszłości analizować ciąg znaków 'rawText'.
    //
    // Przykłady, od czego możesz zacząć:
    // 
    // a) Wyciągnięcie nazwy przedmiotu (zwykle pierwsza linijka):
    //    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    //    const itemName = lines[0];
    //
    // b) Wyszukanie Mocy Przedmiotu za pomocą prostego RegEx:
    //    const powerMatch = rawText.match(/(?:Moc przedmiotu|Item Power)\s*(\d+)/i);
    //    const itemPower = powerMatch ? parseInt(powerMatch[1], 10) : null;
    //
    // c) Wykrycie rzadkości (Legendarny, Unikatowy / Ancestral Legendary):
    //    const isUnique = /unikatowy|unique/i.test(rawText);
    //    const isAncestral = /starożytny|ancestral/i.test(rawText);
    //
    // d) Filtrowanie interesujących Cię afiksów (np. Prędkość Ataku, Szansa na Trafienie Krytyczne):
    //    const hasCrit = /(?:trafienie krytyczne|critical strike chance)/i.test(rawText);
    // ==========================================================================
}

// ------------------------------------------------------------------------------
// OBSŁUGA POŁĄCZENIA SERVER-SENT EVENTS (EventSource)
// ------------------------------------------------------------------------------

/**
 * Aktualizuje wygląd etykiety połączenia w interfejsie (zielony/żółty/czerwony).
 * 
 * @param {'connected'|'connecting'|'disconnected'} state - Stan połączenia
 * @param {string} message - Tekst wyświetlany obok kropki
 */
function updateConnectionStatus(state, message) {
    statusContainer.className = `status-badge status-${state}`;
    statusText.textContent = message;
}

/**
 * Inicjalizuje natywne połączenie EventSource z naszym serwerem server.js.
 * 
 * EventSource to wbudowany w przeglądarkę mechanizm standardu W3C Server-Sent Events (SSE).
 * W przeciwieństwie do WebSockets, SSE jest:
 * - Bardzo lekkie (oparte na czystym protokole HTTP/1.1 i HTTP/2)
 * - Jednokierunkowe (serwer -> klient), co idealnie pasuje do odbierania zdarzeń z gry
 * - Posiada automatyczną retransmisję: jeśli serwer zostanie zrestartowany,
 *   przeglądarka sama bez pisania ani jednej linijki kodu podejmie próby ponownego połączenia!
 */
function initEventSource() {
    updateConnectionStatus('connecting', 'Łączenie z serwerem SSE...');

    // Utworzenie natywnego obiektu EventSource wskazującego na endpoint /stream
    const eventSource = new EventSource(SSE_URL);

    /**
     * Zdarzenie 'onopen':
     * Wywoływane w momencie pomyślnego nawiązania strumienia HTTP z serwerem.
     */
    eventSource.onopen = function () {
        console.log('[SSE] Połączono ze strumieniem server.js pod adresem:', SSE_URL);
        updateConnectionStatus('connected', 'Połączono z serwerem (SSE)');
    };

    /**
     * Zdarzenie 'onmessage':
     * Wywoływane za każdym razem, gdy serwer Node.js wyśle zdarzenie 'data: ...\n\n'.
     */
    eventSource.onmessage = function (event) {
        try {
            /**
             * Nasz serwer pakuje wiadomość w format JSON: { text: "...", timestamp: 12345 }
             * Bezpiecznie odpakowujemy dane za pomocą JSON.parse.
             */
            const payload = JSON.parse(event.data);

            if (payload && typeof payload.text === 'string') {
                // Przekazujemy odkodowany tekst przedmiotu do głównej funkcji
                handleItemData(payload.text);
            }
        } catch (error) {
            /**
             * Gdyby serwer wysłał surowy ciąg zamiast JSON-a,
             * fallback obsłuży bezpośrednio event.data.
             */
            if (event.data && !event.data.startsWith(':')) {
                handleItemData(event.data);
            }
        }
    };

    /**
     * Zdarzenie 'onerror':
     * Wywoływane, gdy serwer padnie, zostanie zatrzymany lub wystąpi problem z siecią.
     * Przeglądarka przechodzi w stan oczekiwania i automatycznie ponawia próbę połączenia co kilka sekund.
     */
    eventSource.onerror = function () {
        console.warn('[SSE] Utracono połączenie z serwerem. Przeglądarka automatycznie ponawia próbę...');
        updateConnectionStatus('disconnected', 'Brak połączenia z server.js (ponawianie...)');
    };
}

// ------------------------------------------------------------------------------
// SYMULATOR DANYCH Z DIABLO 4 (DO TESTÓW BEZ WŁĄCZANIA GRY)
// ------------------------------------------------------------------------------

/**
 * Zestaw realistycznych, przykładowych tekstów przedmiotów z Diablo 4
 * (odpowiadających temu, co czytnik ekranu / saapi64.dll wysyła do potoku).
 */
const SAMPLE_D4_ITEMS = [
    // Przykład 1: Starożytny miecz unikatowy (wersja PL)
    `Zwiastun Zagłady
Starożytny unikatowy miecz
Moc przedmiotu 925
1 894 obrażeń na sekundę
[1 421 - 2 131] pkt. obrażeń na trafienie
1,10 ataku na sekundę (Szybka broń)

+19,5% do obrażeń od umiejętności podstawowych
+17,5% do obrażeń ogólnych
+26,0% do maksymalnego zdrowia
Szczęśliwy traf: do 5% szansy na uleczenie +1 048 pkt. zdrowia

Szczęśliwy traf: do 25% szansy na zadanie 12 852 pkt. obrażeń od cienia pobliskim wrogom i zmniejszenie zadawanych przez nich obrażeń o 20% na 5 sek.
Wymaga poziomu 80`,

    // Przykład 2: Hełm legendarny (wersja PL)
    `Czapka Harlekina
Starożytny unikatowy hełm
Moc przedmiotu 925
Pancerz: 1 520

+20% do redukcji obrażeń
+4 do wszystkich umiejętności
+1 250 do maksymalnego zdrowia
+18,0% do redukcji czasu odnowienia
+10,0% do generowania zasobów
Wymaga poziomu 35`,

    // Przykład 3: Pierścień legendarny z afiksami (wersja EN)
    `Ring of the Starless Skies
Ancestral Unique Ring
Item Power 925

+12.5% Critical Strike Chance
+10.5% Attack Speed
+12.5% Lucky Hit Chance
+2 to Core Skills

Spending your primary resource reduces the resource cost of your skills and increases your damage by 10% for 3 seconds, up to 50%.
Requires Level 80`
];

let sampleIndex = 0;

/**
 * Obsługa kliknięcia przycisku "Symuluj przedmiot z D4".
 * Pozwala przetestować działanie konsoli i funkcji handleItemData
 * w 100% lokalnie w samej przeglądarce, bez potrzeby uruchamiania gry.
 */
simulateBtn.addEventListener('click', () => {
    // Wybieramy kolejny przykładowy przedmiot z listy
    const sampleText = SAMPLE_D4_ITEMS[sampleIndex % SAMPLE_D4_ITEMS.length];
    sampleIndex++;

    console.log('[Symulator] Ręczne wywołanie symulacji przedmiotu...');
    // Przekazujemy tekst do tej samej głównej funkcji, która obsługuje dane z potoku
    handleItemData(sampleText);
});

// ------------------------------------------------------------------------------
// START APLIKACJI
// ------------------------------------------------------------------------------

// Uruchamiamy nasłuchiwanie na strumień SSE po załadowaniu skryptu
initEventSource();
