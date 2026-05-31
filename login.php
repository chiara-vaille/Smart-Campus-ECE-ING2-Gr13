<?php
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../config/database.php';

if (session_status() === PHP_SESSION_NONE) session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['message' => 'Méthode non autorisée']); exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$email    = trim($data['email']    ?? '');
$password = trim($data['password'] ?? '');

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['message' => 'Email et mot de passe requis.']);
    exit;
}

$pdo = getDB();
$stmt = $pdo->prepare("SELECT u.*, e.id_etudiant, en.id_enseignant FROM Utilisateur u
    LEFT JOIN Etudiant  e  ON e.id_utilisateur = u.id_utilisateur
    LEFT JOIN Enseignant en ON en.id_utilisateur = u.id_utilisateur
    WHERE u.email = ? AND u.actif = 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['mot_de_passe'])) {
    http_response_code(401);
    echo json_encode(['message' => 'Email ou mot de passe incorrect.']);
    exit;
}

// Stocker en session
$_SESSION['user'] = [
    'id_utilisateur' => $user['id_utilisateur'],
    'id_etudiant'    => $user['id_etudiant'],
    'id_enseignant'  => $user['id_enseignant'],
    'nom'            => $user['nom'],
    'prenom'         => $user['prenom'],
    'email'          => $user['email'],
    'role'           => $user['role'],
];

echo json_encode([
    'message' => 'Connexion réussie.',
    'user'    => $_SESSION['user']
]);
