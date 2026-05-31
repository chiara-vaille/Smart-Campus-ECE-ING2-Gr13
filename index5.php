<?php
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

switch ($method) {

    case 'GET':
        $user = requireAuth();
        if ($user['role'] === 'admin') {
            $stmt = $pdo->query("
                SELECT e.*, u.nom, u.prenom, u.email, u.actif
                FROM Etudiant e
                JOIN Utilisateur u ON u.id_utilisateur = e.id_utilisateur
                ORDER BY u.nom, u.prenom
            ");
        } else {
            // Étudiant : son propre profil
            $stmt = $pdo->prepare("
                SELECT e.*, u.nom, u.prenom, u.email, u.actif
                FROM Etudiant e
                JOIN Utilisateur u ON u.id_utilisateur = e.id_utilisateur
                WHERE e.id_utilisateur = ?
            ");
            $stmt->execute([$user['id_utilisateur']]);
        }
        echo json_encode(['etudiants' => $stmt->fetchAll()]);
        break;

    case 'POST':
        requireRole(['admin']);
        $d = json_decode(file_get_contents('php://input'), true);

        // Validation
        foreach (['nom','prenom','email','mot_de_passe','numero_etudiant','niveau'] as $f) {
            if (empty($d[$f])) { http_response_code(400); echo json_encode(['message' => "Champ requis : $f"]); exit; }
        }
        // Unicité email
        $chk = $pdo->prepare("SELECT COUNT(*) FROM Utilisateur WHERE email = ?");
        $chk->execute([$d['email']]);
        if ($chk->fetchColumn() > 0) { http_response_code(409); echo json_encode(['message' => 'Cet email est déjà utilisé.']); exit; }
        // Unicité numéro étudiant
        $chk2 = $pdo->prepare("SELECT COUNT(*) FROM Etudiant WHERE numero_etudiant = ?");
        $chk2->execute([$d['numero_etudiant']]);
        if ($chk2->fetchColumn() > 0) { http_response_code(409); echo json_encode(['message' => 'Ce numéro étudiant est déjà utilisé.']); exit; }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO Utilisateur (nom,prenom,email,mot_de_passe,role) VALUES (?,?,?,?,?)");
            $stmt->execute([$d['nom'], $d['prenom'], $d['email'], password_hash($d['mot_de_passe'], PASSWORD_BCRYPT), 'etudiant']);
            $id_u = $pdo->lastInsertId();

            $stmt2 = $pdo->prepare("INSERT INTO Etudiant (id_utilisateur,numero_etudiant,date_naissance,filiere,niveau,annee_inscription) VALUES (?,?,?,?,?,?)");
            $stmt2->execute([$id_u, $d['numero_etudiant'], $d['date_naissance'] ?: null, $d['filiere'] ?? null, $d['niveau'], $d['annee_inscription'] ?? date('Y')]);
            $pdo->commit();
            http_response_code(201);
            echo json_encode(['message' => 'Étudiant créé avec succès.', 'id' => $pdo->lastInsertId()]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500); echo json_encode(['message' => 'Erreur lors de la création.']);
        }
        break;

    case 'PUT':
        requireRole(['admin']);
        $d = json_decode(file_get_contents('php://input'), true);
        if (empty($d['id_etudiant'])) { http_response_code(400); echo json_encode(['message' => 'id_etudiant requis.']); exit; }

        // Récupérer l'id_utilisateur
        $stmt = $pdo->prepare("SELECT id_utilisateur FROM Etudiant WHERE id_etudiant = ?");
        $stmt->execute([$d['id_etudiant']]);
        $et = $stmt->fetch();
        if (!$et) { http_response_code(404); echo json_encode(['message' => 'Étudiant non trouvé.']); exit; }

        $pdo->beginTransaction();
        try {
            // Mise à jour Utilisateur
            if (!empty($d['mot_de_passe'])) {
                $stmt = $pdo->prepare("UPDATE Utilisateur SET nom=?,prenom=?,email=?,mot_de_passe=? WHERE id_utilisateur=?");
                $stmt->execute([$d['nom'], $d['prenom'], $d['email'], password_hash($d['mot_de_passe'], PASSWORD_BCRYPT), $et['id_utilisateur']]);
            } else {
                $stmt = $pdo->prepare("UPDATE Utilisateur SET nom=?,prenom=?,email=? WHERE id_utilisateur=?");
                $stmt->execute([$d['nom'], $d['prenom'], $d['email'], $et['id_utilisateur']]);
            }
            // Mise à jour Etudiant
            $stmt2 = $pdo->prepare("UPDATE Etudiant SET numero_etudiant=?,date_naissance=?,filiere=?,niveau=?,annee_inscription=? WHERE id_etudiant=?");
            $stmt2->execute([$d['numero_etudiant'], $d['date_naissance'] ?: null, $d['filiere'] ?? null, $d['niveau'], $d['annee_inscription'] ?? date('Y'), $d['id_etudiant']]);
            $pdo->commit();
            echo json_encode(['message' => 'Étudiant modifié avec succès.']);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500); echo json_encode(['message' => 'Erreur lors de la modification.']);
        }
        break;

    case 'DELETE':
        requireRole(['admin']);
        $d = json_decode(file_get_contents('php://input'), true);
        if (empty($d['id_etudiant'])) { http_response_code(400); echo json_encode(['message' => 'id_etudiant requis.']); exit; }

        // Récupérer l'id_utilisateur (ON DELETE CASCADE supprimera Etudiant + inscriptions)
        $stmt = $pdo->prepare("SELECT id_utilisateur FROM Etudiant WHERE id_etudiant = ?");
        $stmt->execute([$d['id_etudiant']]);
        $et = $stmt->fetch();
        if (!$et) { http_response_code(404); echo json_encode(['message' => 'Étudiant non trouvé.']); exit; }

        $stmt = $pdo->prepare("DELETE FROM Utilisateur WHERE id_utilisateur = ?");
        $stmt->execute([$et['id_utilisateur']]);
        echo json_encode(['message' => 'Étudiant supprimé.']);
        break;

    default:
        http_response_code(405); echo json_encode(['message' => 'Méthode non autorisée.']);
}
