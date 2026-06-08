<?php
// send_order.php - script pentru trimiterea comenzilor B2B cu adresă configurabilă
// Primește JSON: { "lines": [ ... ], "to": "email@domeniu.tld" } și trimite email la adresa indicată sau la comenzi@poshard.ro

header('Content-Type: application/json; charset=UTF-8');

// Acceptăm doar POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$lines = [];
if (is_array($data) && isset($data['lines']) && is_array($data['lines'])) {
    $lines = $data['lines'];
}

// email destinație configurabil
$to = 'comenzi@poshard.ro';
if (is_array($data) && isset($data['to'])) {
    $candidate = trim((string)$data['to']);
    if (filter_var($candidate, FILTER_VALIDATE_EMAIL)) {
        $to = $candidate;
    }
}

$subject = 'COMANDA PARTENER';

$body = '';
$is_html = false;

if (!empty($lines)) {
    // Frontend-ul trimite deja HTML (cu <table>), deci îl folosim direct
    $body = implode("\n", $lines);
    if (stripos($body, '<html') !== false || stripos($body, '<table') !== false) {
        $is_html = true;
    }
} else {
    // Fallback: dacă nu vin linii, trimitem ce am primit ca text
    $body = nl2br(htmlspecialchars($raw, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
    $is_html = true;
}

// Headere email
$headers  = "From: no-reply@poshard.ro\r\n";
$headers .= "Reply-To: no-reply@poshard.ro\r\n";
$headers .= "MIME-Version: 1.0\r\n";
if ($is_html) {
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
} else {
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
}

// Încercăm să trimitem emailul.
// Chiar dacă mail() întoarce false, răspundem tot cu ok:true ca frontend-ul să nu dea eroare.
$mail_ok = @mail($to, $subject, $body, $headers);

// Răspuns JSON simplu
echo json_encode([
    'ok' => true,
    'mail_ok' => $mail_ok ? true : false,
    'to' => $to
]);
