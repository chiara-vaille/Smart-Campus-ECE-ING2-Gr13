<?php
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();
$user   = requireRole(['admin','enseignant']);

if ($method === 'POST') {
    $d = json_decode(file_get_contents('php://input'), true);
    foreach (['id_cours','nom','coefficient'] as $f) {
        if (empty($d[$f])) { http_response_code(400); echo json_encode(['message' => "Champ requis : $f"]); exit; }
    }
    $coef = floatval($d['coefficient']);
    if ($coef <= 0 || $coef > 1) { http_response_code(400); echo json_encode(['message' => 'Le coefficient doit être entre 0 et 1.']); exit; }

    // Vérifier que la somme des coefficients ne dépasse pas 1
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(coefficient),0) AS total FROM TypeEvaluation WHERE id_cours=?");
    $stmt->execute([$d['id_cours']]);
    $total = floatval($stmt->fetchColumn());
    if ($total + $coef > 1.001) {
        http_response_code(409);
        echo json_encode(['message' => "La somme des coefficients dépasse 1 (actuel: $total, ajout: $coef)."]); exit;
    }

    $stmt = $pdo->prepare("INSERT INTO TypeEvaluation (id_cours,nom,coefficient) VALUES (?,?,?)");
    $stmt->execute([$d['id_cours'], $d['nom'], $coef]);
    http_response_code(201);
    echo json_encode(['message' => 'Évaluation ajoutée.', 'id' => $pdo->lastInsertId()]);
} else {
    http_response_code(405); echo json_encode(['message' => 'Méthode non autorisée.']);
}
