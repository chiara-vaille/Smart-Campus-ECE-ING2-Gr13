<?php
/**
 * seed.php — Met à jour les mots de passe avec de vrais hashes bcrypt.
 * Exécuter une seule fois après avoir importé schema.sql :
 *   php seed.php
 * OU ouvrir dans le navigateur via XAMPP.
 */

$host = 'localhost'; $db = 'smartcampus'; $user = 'root'; $pass = '';
$pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$comptes = [
    ['email' => 'admin@smartcampus.fr',    'password' => 'admin123'],
    ['email' => 'prof@smartcampus.fr',     'password' => 'prof123'],
    ['email' => 'prof2@smartcampus.fr',    'password' => 'prof123'],
    ['email' => 'etudiant@smartcampus.fr', 'password' => 'etudiant123'],
    ['email' => 'thomas@smartcampus.fr',   'password' => 'etudiant123'],
    ['email' => 'sophie@smartcampus.fr',   'password' => 'etudiant123'],
];

$stmt = $pdo->prepare("UPDATE Utilisateur SET mot_de_passe=? WHERE email=?");
foreach ($comptes as $c) {
    $hash = password_hash($c['password'], PASSWORD_BCRYPT);
    $stmt->execute([$hash, $c['email']]);
    echo "✓ {$c['email']} → hash mis à jour\n";
}
echo "\nDone! Comptes de test prêts.\n";
echo "Admin    : admin@smartcampus.fr    / admin123\n";
echo "Prof 1   : prof@smartcampus.fr     / prof123\n";
echo "Prof 2   : prof2@smartcampus.fr    / prof123\n";
echo "Étudiant : etudiant@smartcampus.fr / etudiant123\n";
