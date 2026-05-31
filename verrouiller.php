<?php
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
$user = requireRole(['admin','enseignant']);
$d    = json_decode(file_get_contents('php://input'), true);

if (empty($d['id_cours'])) { http_response_code(400); echo json_encode(['message' => 'id_cours requis.']); exit; }

$pdo = getDB();
// Verrouiller toutes les notes des évaluations du cours
$stmt = $pdo->prepare("UPDATE Note SET verrouille=1 WHERE id_type_eval IN (SELECT id_type_eval FROM TypeEvaluation WHERE id_cours=?)");
$stmt->execute([$d['id_cours']]);
echo json_encode(['message' => 'Notes verrouillées avec succès.', 'nb' => $stmt->rowCount()]);
