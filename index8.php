<?php
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();
$user   = requireAuth();

switch ($method) {

    case 'GET':
        if ($user['role'] === 'etudiant') {
            // Séances des cours auxquels l'étudiant est inscrit
            $stmt = $pdo->prepare("
                SELECT s.*, c.code_cours, c.nom AS cours_nom
                FROM Seance s
                JOIN Cours c ON c.id_cours = s.id_cours
                WHERE c.id_cours IN (
                    SELECT id_cours FROM Inscription WHERE id_etudiant=? AND statut='inscrit'
                )
                ORDER BY FIELD(s.jour_semaine,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'), s.heure_debut
            ");
            $stmt->execute([$user['id_etudiant']]);
        } elseif ($user['role'] === 'enseignant') {
            // Séances des cours de l'enseignant
            $stmt = $pdo->prepare("
                SELECT s.*, c.code_cours, c.nom AS cours_nom
                FROM Seance s
                JOIN Cours c ON c.id_cours = s.id_cours
                WHERE c.id_enseignant = ?
                ORDER BY FIELD(s.jour_semaine,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'), s.heure_debut
            ");
            $stmt->execute([$user['id_enseignant']]);
        } else {
            // Admin : toutes les séances
            $stmt = $pdo->query("
                SELECT s.*, c.code_cours, c.nom AS cours_nom
                FROM Seance s
                JOIN Cours c ON c.id_cours = s.id_cours
                ORDER BY FIELD(s.jour_semaine,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'), s.heure_debut
            ");
        }
        echo json_encode(['seances' => $stmt->fetchAll()]);
        break;

    case 'POST':
        requireRole(['admin']);
        $d = json_decode(file_get_contents('php://input'), true);
        foreach (['id_cours','jour_semaine','heure_debut','heure_fin'] as $f) {
            if (empty($d[$f])) { http_response_code(400); echo json_encode(['message' => "Champ requis : $f"]); exit; }
        }
        if ($d['heure_fin'] <= $d['heure_debut']) {
            http_response_code(400); echo json_encode(['message' => 'L\'heure de fin doit être après l\'heure de début.']); exit;
        }

        // ── Règle métier : détection de conflit de salle ──
        if (!empty($d['salle'])) {
            $conflit = $pdo->prepare("
                SELECT COUNT(*) FROM Seance
                WHERE salle=? AND jour_semaine=?
                AND id_seance != ?
                AND NOT (heure_fin <= ? OR heure_debut >= ?)
            ");
            $conflit->execute([$d['salle'], $d['jour_semaine'], 0, $d['heure_debut'], $d['heure_fin']]);
            if ($conflit->fetchColumn() > 0) {
                http_response_code(409);
                echo json_encode(['message' => "Conflit : la salle {$d['salle']} est déjà occupée à ce créneau."]); exit;
            }
        }

        $stmt = $pdo->prepare("INSERT INTO Seance (id_cours,jour_semaine,heure_debut,heure_fin,salle,type_seance,date_debut,date_fin) VALUES (?,?,?,?,?,?,?,?)");
        $stmt->execute([$d['id_cours'], $d['jour_semaine'], $d['heure_debut'], $d['heure_fin'],
                        $d['salle'] ?? null, $d['type_seance'] ?? 'CM', $d['date_debut'] ?: null, $d['date_fin'] ?: null]);
        http_response_code(201);
        echo json_encode(['message' => 'Séance créée.', 'id_seance' => $pdo->lastInsertId()]);
        break;

    case 'PUT':
        requireRole(['admin']);
        $d = json_decode(file_get_contents('php://input'), true);
        if (empty($d['id_seance'])) { http_response_code(400); echo json_encode(['message' => 'id_seance requis.']); exit; }
        if ($d['heure_fin'] <= $d['heure_debut']) {
            http_response_code(400); echo json_encode(['message' => 'Heure de fin invalide.']); exit;
        }
        // Détection conflit (hors la séance elle-même)
        if (!empty($d['salle'])) {
            $conflit = $pdo->prepare("
                SELECT COUNT(*) FROM Seance
                WHERE salle=? AND jour_semaine=? AND id_seance != ?
                AND NOT (heure_fin <= ? OR heure_debut >= ?)
            ");
            $conflit->execute([$d['salle'], $d['jour_semaine'], $d['id_seance'], $d['heure_debut'], $d['heure_fin']]);
            if ($conflit->fetchColumn() > 0) {
                http_response_code(409); echo json_encode(['message' => "Conflit de salle détecté."]); exit;
            }
        }
        $stmt = $pdo->prepare("UPDATE Seance SET id_cours=?,jour_semaine=?,heure_debut=?,heure_fin=?,salle=?,type_seance=?,date_debut=?,date_fin=? WHERE id_seance=?");
        $stmt->execute([$d['id_cours'], $d['jour_semaine'], $d['heure_debut'], $d['heure_fin'],
                        $d['salle'] ?? null, $d['type_seance'] ?? 'CM', $d['date_debut'] ?: null, $d['date_fin'] ?: null, $d['id_seance']]);
        echo json_encode(['message' => 'Séance modifiée.']);
        break;

    case 'DELETE':
        requireRole(['admin']);
        $d = json_decode(file_get_contents('php://input'), true);
        if (empty($d['id_seance'])) { http_response_code(400); echo json_encode(['message' => 'id_seance requis.']); exit; }
        $pdo->prepare("DELETE FROM Seance WHERE id_seance=?")->execute([$d['id_seance']]);
        echo json_encode(['message' => 'Séance supprimée.']);
        break;

    default:
        http_response_code(405); echo json_encode(['message' => 'Méthode non autorisée.']);
}
