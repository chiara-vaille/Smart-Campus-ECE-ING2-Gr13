<?php
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

switch ($method) {

    case 'GET':
        requireAuth();
        $stmt = $pdo->query("
            SELECT en.*, u.nom, u.prenom, u.email, u.actif,
                   (SELECT COUNT(*) FROM Cours c WHERE c.id_enseignant = en.id_enseignant) AS nb_cours
            FROM Enseignant en
            JOIN Utilisateur u ON u.id_utilisateur = en.id_utilisateur
            ORDER BY u.nom, u.prenom
        ");
        echo json_encode(['enseignants' => $stmt->fetchAll()]);
        break;

    case 'POST':
        requireRole(['admin']);
        $d = json_decode(file_get_contents('php://input'), true);
        foreach (['nom','prenom','email','mot_de_passe'] as $f) {
            if (empty($d[$f])) { http_response_code(400); echo json_encode(['message' => "Champ requis : $f"]); exit; }
        }
        $chk = $pdo->prepare("SELECT COUNT(*) FROM Utilisateur WHERE email = ?");
        $chk->execute([$d['email']]);
        if ($chk->fetchColumn() > 0) { http_response_code(409); echo json_encode(['message' => 'Email déjà utilisé.']); exit; }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO Utilisateur (nom,prenom,email,mot_de_passe,role) VALUES (?,?,?,?,?)");
            $stmt->execute([$d['nom'], $d['prenom'], $d['email'], password_hash($d['mot_de_passe'], PASSWORD_BCRYPT), 'enseignant']);
            $id_u = $pdo->lastInsertId();
            $stmt2 = $pdo->prepare("INSERT INTO Enseignant (id_utilisateur,departement,grade,telephone) VALUES (?,?,?,?)");
            $stmt2->execute([$id_u, $d['departement'] ?? null, $d['grade'] ?? 'Maitre_assistant', $d['telephone'] ?? null]);
            $pdo->commit();
            http_response_code(201);
            echo json_encode(['message' => 'Enseignant créé.']);
        } catch (Exception $e) {
            $pdo->rollBack(); http_response_code(500); echo json_encode(['message' => 'Erreur.']);
        }
        break;

    case 'PUT':
        requireRole(['admin']);
        $d = json_decode(file_get_contents('php://input'), true);
        if (empty($d['id_enseignant'])) { http_response_code(400); echo json_encode(['message' => 'id_enseignant requis.']); exit; }

        $stmt = $pdo->prepare("SELECT id_utilisateur FROM Enseignant WHERE id_enseignant = ?");
        $stmt->execute([$d['id_enseignant']]); $en = $stmt->fetch();
        if (!$en) { http_response_code(404); echo json_encode(['message' => 'Enseignant non trouvé.']); exit; }

        $pdo->beginTransaction();
        try {
            if (!empty($d['mot_de_passe'])) {
                $stmt = $pdo->prepare("UPDATE Utilisateur SET nom=?,prenom=?,email=?,mot_de_passe=? WHERE id_utilisateur=?");
                $stmt->execute([$d['nom'], $d['prenom'], $d['email'], password_hash($d['mot_de_passe'], PASSWORD_BCRYPT), $en['id_utilisateur']]);
            } else {
                $stmt = $pdo->prepare("UPDATE Utilisateur SET nom=?,prenom=?,email=? WHERE id_utilisateur=?");
                $stmt->execute([$d['nom'], $d['prenom'], $d['email'], $en['id_utilisateur']]);
            }
            $stmt2 = $pdo->prepare("UPDATE Enseignant SET departement=?,grade=?,telephone=? WHERE id_enseignant=?");
            $stmt2->execute([$d['departement'] ?? null, $d['grade'] ?? 'Maitre_assistant', $d['telephone'] ?? null, $d['id_enseignant']]);
            $pdo->commit();
            echo json_encode(['message' => 'Enseignant modifié.']);
        } catch (Exception $e) {
            $pdo->rollBack(); http_response_code(500); echo json_encode(['message' => 'Erreur.']);
        }
        break;

    case 'DELETE':
        requireRole(['admin']);
        $d = json_decode(file_get_contents('php://input'), true);
        if (empty($d['id_enseignant'])) { http_response_code(400); echo json_encode(['message' => 'id_enseignant requis.']); exit; }
        $stmt = $pdo->prepare("SELECT id_utilisateur FROM Enseignant WHERE id_enseignant = ?");
        $stmt->execute([$d['id_enseignant']]); $en = $stmt->fetch();
        if (!$en) { http_response_code(404); echo json_encode(['message' => 'Non trouvé.']); exit; }
        $pdo->prepare("DELETE FROM Utilisateur WHERE id_utilisateur = ?")->execute([$en['id_utilisateur']]);
        echo json_encode(['message' => 'Enseignant supprimé.']);
        break;

    default:
        http_response_code(405); echo json_encode(['message' => 'Méthode non autorisée.']);
}
