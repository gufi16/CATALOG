<?php
require 'config.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error"   => "Invalid JSON"
    ]);
    exit;
}

$json = json_encode($data, JSON_UNESCAPED_UNICODE);

try {
    // încercăm update pe rândul 1
    $stmt = $pdo->prepare("UPDATE catalog_state SET state = :state, updated_at = NOW() WHERE id = 1");
    $stmt->execute([':state' => $json]);

    // dacă nu a existat rândul, îl inserăm
    if ($stmt->rowCount() === 0) {
        $stmt = $pdo->prepare("INSERT INTO catalog_state (id, state) VALUES (1, :state)");
        $stmt->execute([':state' => $json]);
    }

    echo json_encode(["success" => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error"   => $e->getMessage()
    ]);
}
