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

        if ($user['role'] === 'etudiant') {
            // Étudiant : ses propres inscriptions
            $stmt = $pdo->prepare("
                SELECT i.*, c.nom AS cours_nom, c.code_cours AS cours_code, c.id_cours
                FROM Inscription i
                JOIN Cours c ON c.id_cours = i.id_cours
                WHERE i.id_etudiant = ?
                ORDER BY i.date_inscription DESC
            ");
            $stmt->execute([$user['id_etudiant']]);
            echo json_encode(['inscriptions' => $stmt->fetchAll()]);

        } elseif ($id_cours) {
            // Enseignant/Admin : étudiants inscrits à un cours
            $stmt = $pdo->prepare("
                SELECT i.*, u.nom AS etudiant_nom, u.prenom AS etudiant_prenom, e.numero_etudiant, e.id_etudiant
                FROM Inscription i
                JOIN Etudiant e ON e.id_etudiant = i.id_etudiant
                JOIN Utilisateur u ON u.id_utilisateur = e.id_utilisateur
                WHERE i.id_cours = ?
                ORDER BY u.nom, u.prenom
            ");
            $stmt->execute([$id_cours]);
            echo json_encode(['inscriptions' => $stmt->fetchAll()]);

        } else {
            // Admin : toutes les inscriptions
            requireRole(['admin']);
            $stmt = $pdo->query("
                SELECT i.*,
                    u.nom AS etudiant_nom, u.prenom AS etudiant_prenom,
                    c.nom AS cours_nom, c.code_cours AS cours_code, c.id_cours
                FROM Inscription i
                JOIN Etudiant e ON e.id_etudiant = i.id_etudiant
                JOIN Utilisateur u ON u.id_utilisateur = e.id_utilisateur
                JOIN Cours c ON c.id_cours = i.id_cours
                ORDER BY i.date_inscription DESC
            ");
            echo json_encode(['inscriptions' => $stmt->fetchAll()]);
        }
        break;

    case 'POST':
        $d = json_decode(file_get_contents('php://input'), true);
        $id_cours = $d['id_cours'] ?? null;

        // Déterminer l'id_etudiant
        if ($user['role'] === 'etudiant') {
            $id_etudiant = $user['id_etudiant'];
        } elseif ($user['role'] === 'admin') {
            $id_etudiant = $d['id_etudiant'] ?? null;
            if (!$id_etudiant) { http_response_code(400); echo json_encode(['message' => 'id_etudiant requis.']); exit; }
        } else {
            http_response_code(403); echo json_encode(['message' => 'Non autorisé.']); exit;
        }

        if (!$id_cours) { http_response_code(400); echo json_encode(['message' => 'id_cours requis.']); exit; }

        // ── Règle métier 1 : pas de double inscription ──
        $chk = $pdo->prepare("SELECT COUNT(*) FROM Inscription WHERE id_etudiant=? AND id_cours=?");
        $chk->execute([$id_etudiant, $id_cours]);
        if ($chk->fetchColumn() > 0) {
            http_response_code(409); echo json_encode(['message' => 'L\'étudiant est déjà inscrit à ce cours.']); exit;
        }

        // ── Règle métier 2 : capacité maximale ──
        $cap = $pdo->prepare("SELECT capacite_max, (SELECT COUNT(*) FROM Inscription WHERE id_cours=c.id_cours AND statut='inscrit') AS nb FROM Cours c WHERE id_cours=?");
        $cap->execute([$id_cours]);
        $cours = $cap->fetch();
        if (!$cours) { http_response_code(404); echo json_encode(['message' => 'Cours non trouvé.']); exit; }
        if ($cours['nb'] >= $cours['capacite_max']) {
            http_response_code(409); echo json_encode(['message' => 'Ce cours est complet (capacité maximale atteinte).']); exit;
        }

        // ── Règle métier 3 : vérifier les prérequis ──
        $prereqs = $pdo->prepare("SELECT p.id_cours_prerequis, c.nom FROM Prerequis p JOIN Cours c ON c.id_cours=p.id_cours_prerequis WHERE p.id_cours=?");
        $prereqs->execute([$id_cours]);
        $liste_prereqs = $prereqs->fetchAll();
        foreach ($liste_prereqs as $prereq) {
            $ok = $pdo->prepare("SELECT COUNT(*) FROM Inscription WHERE id_etudiant=? AND id_cours=? AND statut='valide'");
            $ok->execute([$id_etudiant, $prereq['id_cours_prerequis']]);
            if ($ok->fetchColumn() == 0) {
                http_response_code(409);
                echo json_encode(['message' => "Prérequis non validé : " . $prereq['nom']]); exit;
            }
        }

        // Inscription
        $stmt = $pdo->prepare("INSERT INTO Inscription (id_etudiant, id_cours, statut) VALUES (?,?,'inscrit')");
        $stmt->execute([$id_etudiant, $id_cours]);
        http_response_code(201);
        echo json_encode(['message' => 'Inscription réussie.']);
        break;

    case 'DELETE':
        $d = json_decode(file_get_contents('php://input'), true);
        if (empty($d['id_inscription'])) { http_response_code(400); echo json_encode(['message' => 'id_inscription requis.']); exit; }

        // Vérifier que l'étudiant supprime sa propre inscription OU que c'est un admin
        if ($user['role'] === 'etudiant') {
            $chk = $pdo->prepare("SELECT id_etudiant FROM Inscription WHERE id_inscription=?");
            $chk->execute([$d['id_inscription']]);
            $ins = $chk->fetch();
            if (!$ins || $ins['id_etudiant'] != $user['id_etudiant']) {
                http_response_code(403); echo json_encode(['message' => 'Non autorisé.']); exit;
            }
        } else {
            requireRole(['admin']);
        }

        $pdo->prepare("DELETE FROM Inscription WHERE id_inscription=?")->execute([$d['id_inscription']]);
        echo json_encode(['message' => 'Inscription supprimée.']);
        break;

    default:
        http_response_code(405); echo json_encode(['message' => 'Méthode non autorisée.']);
}
