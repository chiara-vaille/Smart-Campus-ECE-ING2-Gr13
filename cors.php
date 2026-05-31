<?php
// Autoriser React dev server (port 5173) à appeler le backend
$allowed_origins = ['http://localhost:5173', 'http://127.0.0.1:5173']; // def origine autorisé
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';//recup origine de la requete envoyée par le nav 

if (in_array($origin, $allowed_origins)) { //verification 
    header("Access-Control-Allow-Origin: $origin"); 
}
header('Access-Control-Allow-Credentials: true'); //autorisation envoi des cookies et sessions
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization'); // permet envoyer JSON
header('Content-Type: application/json; charset=utf-8');

// Répondre aux pré-vols CORS (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
