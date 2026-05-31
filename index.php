<?php
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();
$user   = requireAuth();

switch ($method) {

    case 'GET':
        if ($user['role'] === 'enseignant') {
            // Enseignant : seulement ses cours
            $stmt = $pdo->prepare("
                SELECT c.*,
                    u.nom AS enseignant_nom, u.prenom AS enseignant_prenom,
                    (SELECT COUNT(*) FROM Inscription i WHERE i.id_cours = c.id_cours AND i.statut = 'inscrit') AS nb_inscrits
                FROM Cours c
                LEFT JOIN Enseignant en ON en.id_enseignant = c.id_enseignant
                LEFT JOIN Utilisateur u ON u.id_utilisateur = en.id_utilisateur
                WHERE c.id_enseignant = ?
                ORDER BY c.niveau, c.code_cours
            ");
            $stmt->execute([$user['id_enseignant']]);
        } elseif ($user['role'] === 'etudiant') {
            // Étudiant : tous les cours actifs
            $stmt = $pdo->prepare("
                SELECT c.*,
                    u.nom AS enseignant_nom, u.prenom AS enseignant_prenom,
                    (SELECT COUNT(*) FROM Inscription i WHERE i.id_cours = c.id_cours AND i.statut = 'inscrit') AS nb_inscrits
                FROM Cours c
                LEFT JOIN Enseignant en ON en.id_enseignant = c.id_enseignant
                LEFT JOIN Utilisateur u ON u.id_utilisateur = en.id_utilisateur
                WHERE c.statut = 'actif'
                ORDER BY c.niveau, c.code_cours
            ");
            $stmt->execute();
        } else {
            // Admin : tous les cours
            $stmt = $pdo->query("
                SELECT c.*,
                    u.nom AS enseignant_nom, u.prenom AS enseignant_prenom,
                    (SELECT COUNT(*) FROM Inscription i WHERE i.id_cours = c.id_cours AND i.statut = 'inscrit') AS nb_inscrits
                FROM Cours c
                LEFT JOIN Enseignant en ON en.id_enseignant = c.id_enseignant
                LEFT JOIN Utilisateur u ON u.id_utilisateur = en.id_utilisateur
                ORDER BY c.niveau, c.code_cours
            ");
        }
        echo json_encode(['cours' => $stmt->fetchAll()]);
        break;

    case 'POST':
        requireRole(['admin']);
        $d = json_decode(file_get_contents('php://input'), true);
        foreach (['code_cours','nom'] as $f) {
            if (empty($d[$f])) { http_response_code(400); echo json_encode(['message' => "Champ requis : $f"]); exit; }
        }
        // Unicité code_cours
        $chk = $pdo->prepare("SELECT COUNT(*) FROM Cours WHERE code_cours = ?");
        $chk->execute([$d['code_cours']]);
        if ($chk->fetchColumn() > 0) { http_response_code(409); echo json_encode(['message' => 'Ce code cours est déjà utilisé.']); exit; }

        $stmt = $pdo->prepare("INSERT INTO Cours (code_cours,nom,description,credits,coefficient,capacite_max,semestre,niveau,departement,id_enseignant,annee_academique,statut)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,'actif')");
        $stmt->execute([
            $d['code_cours'], $d['nom'], $d['description'] ?? null,
            $d['credits'] ?? 0, $d['coefficient'] ?? 1.0, $d['capacite_max'] ?? 30,
            $d['semestre'] ?? 'S1', $d['niveau'] ?? 'L1', $d['departement'] ?? null,
            $d['id_enseignant'] ?: null, $d['annee_academique'] ?? '2025-2026'
        ]);
        http_response_code(201);
        echo json_encode(['message' => 'Cours créé.', 'id_cours' => $pdo->lastInsertId()]);
        break;

    case 'PUT':
        requireRole(['admin','enseignant']);
        $d = json_decode(file_get_contents('php://input'), true);
        if (empty($d['id_cours'])) { http_response_code(400); echo json_encode(['message' => 'id_cours requis.']); exit; }

        // Enseignant ne peut modifier que ses propres cours
        if ($user['role'] === 'enseignant') {
            $chk = $pdo->prepare("SELECT id_enseignant FROM Cours WHERE id_cours = ?");
            $chk->execute([$d['id_cours']]);
            $c = $chk->fetch();
            if (!$c || $c['id_enseignant'] != $user['id_enseignant']) {
                http_response_code(403); echo json_encode(['message' => 'Non autorisé.']); exit;
            }
        }

        $stmt = $pdo->prepare("UPDATE Cours SET code_cours=?,nom=?,description=?,credits=?,coefficient=?,capacite_max=?,semestre=?,niveau=?,departement=?,id_enseignant=?,annee_academique=? WHERE id_cours=?");
        $stmt->execute([
            $d['code_cours'], $d['nom'], $d['description'] ?? null,
            $d['credits'] ?? 0, $d['coefficient'] ?? 1.0, $d['capacite_max'] ?? 30,
            $d['semestre'] ?? 'S1', $d['niveau'] ?? 'L1', $d['departement'] ?? null,
            $d['id_enseignant'] ?: null, $d['annee_academique'] ?? '2025-2026',
            $d['id_cours']
        ]);
        echo json_encode(['message' => 'Cours modifié.']);
        break;

    case 'DELETE':
        requireRole(['admin']);
        $d = json_decode(file_get_contents('php://input'), true);
        if (empty($d['id_cours'])) { http_response_code(400); echo json_encode(['message' => 'id_cours requis.']); exit; }

        // Archiver plutôt que supprimer si des inscriptions existent
        $chk = $pdo->prepare("SELECT COUNT(*) FROM Inscription WHERE id_cours = ?");
        $chk->execute([$d['id_cours']]);
        if ($chk->fetchColumn() > 0) {
            $pdo->prepare("UPDATE Cours SET statut='archive' WHERE id_cours=?")->execute([$d['id_cours']]);
            echo json_encode(['message' => 'Cours archivé (des inscriptions existaient).']);
        } else {
            $pdo->prepare("DELETE FROM Cours WHERE id_cours=?")->execute([$d['id_cours']]);
            echo json_encode(['message' => 'Cours supprimé.']);
        }
        break;

    default:
        http_response_code(405); echo json_encode(['message' => 'Méthode non autorisée.']);
}
