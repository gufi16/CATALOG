<?php
require 'config.php';

try {
    $stmt = $pdo->query("SELECT state FROM catalog_state WHERE id = 1");
    $row = $stmt->fetch();

    if (!$row) {
        echo json_encode(new stdClass());
        exit;
    }

    $state = json_decode($row['state'], true);
    if (!is_array($state)) {
        $state = [];
    }

    echo json_encode($state, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error"   => $e->getMessage()
    ]);
}
