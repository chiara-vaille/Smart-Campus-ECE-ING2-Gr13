<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start(); //demarre session si pas active
}

/**
 * Vérifie que l'utilisateur est connecté.
 * Renvoie 401 si la session est absente.
 */
function requireAuth(): array {
    if (empty($_SESSION['user'])) {
        http_response_code(401);
        echo json_encode(['message' => 'Non authentifié. Veuillez vous connecter.']);
        exit;
    }
    return $_SESSION['user'];
}

/**
 * Vérifie que l'utilisateur a l'un des rôles autorisés.
 * @param string[] $roles 
 */
function requireRole(array $roles): array {
    $user = requireAuth();
    if (!in_array($user['role'], $roles)) {
        http_response_code(403);
        echo json_encode(['message' => 'Accès refusé. Permissions insuffisantes.']);
        exit;
    }
    return $user;
}
