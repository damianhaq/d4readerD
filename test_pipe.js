/**
 * ==============================================================================
 * D4 READER - SKRYPT TESTOWY POTOKU (test_pipe.js)
 * ==============================================================================
 * Opcjonalny skrypt pomocniczy, który symuluje działanie biblioteki saapi64.dll
 * z gry Diablo 4 bez konieczności uruchamiania samej gry.
 * 
 * Sposób użycia:
 * 1. Uruchom serwer główny: node server.js
 * 2. Otwórz w przeglądarce: http://localhost:3000 i włącz konsolę (F12)
 * 3. W osobnym oknie terminala wpisz: node test_pipe.js
 * ==============================================================================
 */

const net = require('net');

// Ścieżka do tego samego potoku, na którym nasłuchuje server.js
const PIPE_NAME = '\\\\.\\pipe\\d4lf';

// Przykładowy tekst przedmiotu z gry
const SAMPLE_ITEM_TEXT = `Zwiastun Zagłady
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
Wymaga poziomu 80`;

// Wybór kodowania: domyślnie UTF-8 (jak nowe wersje saapi64.dll), opcjonalnie UTF-16LE: node test_pipe.js utf16
const selectedEncoding = process.argv[2] === 'utf16' ? 'utf16le' : 'utf8';

console.log(`[Klient Testowy] Próba połączenia z potokiem: ${PIPE_NAME}...`);

// Łączymy się z serwerem potoku utworzonym w server.js
const client = net.connect(PIPE_NAME, () => {
    console.log('[Klient Testowy] Połączono z potokiem!');
    console.log(`[Klient Testowy] Kodowanie tekstu jako: ${selectedEncoding.toUpperCase()}...`);

    // Zamiana tekstu JavaScript na bufor bajtów
    const buffer = Buffer.from(SAMPLE_ITEM_TEXT, selectedEncoding);

    // Wysłanie bufora do potoku
    client.write(buffer, () => {
        console.log('[Klient Testowy] Pakiet przedmiotu został pomyślnie wysłany do potoku!');
        // Zamykamy połączenie po wysłaniu danych
        client.end();
    });
});

client.on('close', () => {
    console.log('[Klient Testowy] Rozłączono. Sprawdź konsolę przeglądarki!');
    process.exit(0);
});

client.on('error', (err) => {
    console.error('\n[BŁĄD] Nie udało się połączyć z potokiem Named Pipe:');
    console.error(err.message);
    console.error('\nUpewnij się, że w osobnym terminalu działa: node server.js');
    process.exit(1);
});
