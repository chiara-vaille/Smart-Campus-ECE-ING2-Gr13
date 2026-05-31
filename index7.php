<?php
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();
$user   = requireAuth();

switch ($method) {

    case 'GET':
        $id_cours = $_GET['id_cours'] ?? null;
        if (!$id_cours) { http_response_code(400); echo json_encode(['message' => 'id_cours requis.']); exit; }

        // Types d'éval
        $evals = $pdo->prepare("SELECT * FROM TypeEvaluation WHERE id_cours=? ORDER BY id_type_eval");
        $evals->execute([$id_cours]);
        $evaluations = $evals->fetchAll();

        // Notes selon le rôle
        if ($user['role'] === 'etudiant') {
            $stmt = $pdo->prepare("SELECT n.* FROM Note n
                JOIN TypeEvaluation te ON te.id_type_eval = n.id_type_eval
                WHERE te.id_cours=? AND n.id_etudiant=?");
            $stmt->execute([$id_cours, $user['id_etudiant']]);
        } else {
            $stmt = $pdo->prepare("SELECT n.* FROM Note n
                JOIN TypeEvaluation te ON te.id_type_eval = n.id_type_eval
                WHERE te.id_cours=?");
            $stmt->execute([$id_cours]);
        }
        $notes = $stmt->fetchAll();

        echo json_encode(['evaluations' => $evaluations, 'notes' => $notes]);
        break;

    case 'POST':
        requireRole(['admin','enseignant']);
        $d = json_decode(file_get_contents('php://input'), true);

        foreach (['id_etudiant','id_type_eval','valeur'] as $f) {
            if (!isset($d[$f]) || $d[$f] === '') { http_response_code(400); echo json_encode(['message' => "Champ requis : $f"]); exit; }
        }

        $valeur = floatval($d['valeur']);
        if ($valeur < 0 || $valeur > 20) { http_response_code(400); echo json_encode(['message' => 'La note doit être entre 0 et 20.']); exit; }

        // ── Règle métier : note verrouillée = non modifiable ──
        $chk = $pdo->prepare("SELECT verrouille FROM Note WHERE id_etudiant=? AND id_type_eval=?");
        $chk->execute([$d['id_etudiant'], $d['id_type_eval']]);
        $existing = $chk->fetch();
        if ($existing && $existing['verrouille']) {
            http_response_code(409); echo json_encode(['message' => 'Cette note est verrouillée et ne peut plus être modifiée.']); exit;
        }

        // Vérifier que l'enseignant est bien responsable du cours (si rôle enseignant)
        if ($user['role'] === 'enseignant') {
            $chk2 = $pdo->prepare("SELECT c.id_enseignant FROM TypeEvaluation te JOIN Cours c ON c.id_cours=te.id_cours WHERE te.id_type_eval=?");
            $chk2->execute([$d['id_type_eval']]);
            $c = $chk2->fetch();
            if (!$c || $c['id_enseignant'] != $user['id_enseignant']) {
                http_response_code(403); echo json_encode(['message' => 'Vous n\'êtes pas responsable de ce cours.']); exit;
            }
        }

        // INSERT ou UPDATE (upsert)
        if ($existing) {
            $stmt = $pdo->prepare("UPDATE Note SET valeur=?, date_saisie=NOW(), id_enseignant=? WHERE id_etudiant=? AND id_type_eval=?");
            $stmt->execute([$valeur, $user['id_enseignant'] ?? null, $d['id_etudiant'], $d['id_type_eval']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO Note (id_etudiant,id_type_eval,valeur,id_enseignant) VALUES (?,?,?,?)");
            $stmt->execute([$d['id_etudiant'], $d['id_type_eval'], $valeur, $user['id_enseignant'] ?? null]);
        }
        echo json_encode(['message' => 'Note enregistrée.']);
        break;

    default:
        http_response_code(405); echo json_encode(['message' => 'Méthode non autorisée.']);
}
