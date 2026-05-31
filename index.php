<?php
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); exit; }
$user = requireAuth();
$pdo  = getDB();

if ($user['role'] === 'admin') {
    // Statistiques globales
    $stats = [];
    $stats['etudiants']    = $pdo->query("SELECT COUNT(*) FROM Etudiant")->fetchColumn();
    $stats['enseignants']  = $pdo->query("SELECT COUNT(*) FROM Enseignant")->fetchColumn();
    $stats['cours']        = $pdo->query("SELECT COUNT(*) FROM Cours WHERE statut='actif'")->fetchColumn();
    $stats['inscriptions'] = $pdo->query("SELECT COUNT(*) FROM Inscription WHERE statut='inscrit'")->fetchColumn();

    // Répartition par niveau
    $stmt = $pdo->query("SELECT niveau, COUNT(*) AS count FROM Etudiant GROUP BY niveau ORDER BY niveau");
    $stats['niveaux'] = $stmt->fetchAll();

    // Activité récente (inscriptions récentes)
    $stmt = $pdo->query("
        SELECT CONCAT(u.prenom, ' ', u.nom, ' inscrit à ', c.nom) AS description,
               DATE_FORMAT(i.date_inscription, '%d/%m %H:%i') AS date
        FROM Inscription i
        JOIN Etudiant e ON e.id_etudiant = i.id_etudiant
        JOIN Utilisateur u ON u.id_utilisateur = e.id_utilisateur
        JOIN Cours c ON c.id_cours = i.id_cours
        ORDER BY i.date_inscription DESC LIMIT 8
    ");
    $stats['activite'] = $stmt->fetchAll();

    echo json_encode($stats);

} elseif ($user['role'] === 'enseignant') {
    $id_e = $user['id_enseignant'];
    $stats = [];
    $stats['cours']     = $pdo->prepare("SELECT COUNT(*) FROM Cours WHERE id_enseignant=? AND statut='actif'")->execute([$id_e]) ? $pdo->query("SELECT COUNT(*) FROM Cours WHERE id_enseignant=$id_e AND statut='actif'")->fetchColumn() : 0;
    $stats['etudiants'] = $pdo->query("SELECT COUNT(DISTINCT i.id_etudiant) FROM Inscription i JOIN Cours c ON c.id_cours=i.id_cours WHERE c.id_enseignant=$id_e")->fetchColumn();

    // Notes manquantes (inscriptions sans notes pour une éval)
    $stats['notes_manquantes'] = $pdo->query("
        SELECT COUNT(*) FROM Inscription i
        JOIN Cours c ON c.id_cours=i.id_cours
        JOIN TypeEvaluation te ON te.id_cours=c.id_cours
        WHERE c.id_enseignant=$id_e
        AND NOT EXISTS (SELECT 1 FROM Note n WHERE n.id_etudiant=i.id_etudiant AND n.id_type_eval=te.id_type_eval)
    ")->fetchColumn();

    // Séances cette semaine
    $stats['seances'] = $pdo->query("SELECT COUNT(*) FROM Seance s JOIN Cours c ON c.id_cours=s.id_cours WHERE c.id_enseignant=$id_e")->fetchColumn();

    // Liste des cours
    $stmt = $pdo->prepare("
        SELECT c.*, (SELECT COUNT(*) FROM Inscription i WHERE i.id_cours=c.id_cours AND i.statut='inscrit') AS nb_inscrits
        FROM Cours c WHERE c.id_enseignant=? ORDER BY c.code_cours
    ");
    $stmt->execute([$id_e]);
    $stats['liste_cours'] = $stmt->fetchAll();

    echo json_encode($stats);

} else {
    // Étudiant
    $id_etudiant = $user['id_etudiant'];
    $stats = [];
    $stats['cours']   = $pdo->query("SELECT COUNT(*) FROM Inscription WHERE id_etudiant=$id_etudiant AND statut='inscrit'")->fetchColumn();
    $stats['absences'] = $pdo->query("SELECT COUNT(*) FROM Presence WHERE id_etudiant=$id_etudiant AND statut='absent'")->fetchColumn();
    $stats['credits'] = $pdo->query("
        SELECT COALESCE(SUM(c.credits),0) FROM Inscription i JOIN Cours c ON c.id_cours=i.id_cours
        WHERE i.id_etudiant=$id_etudiant AND i.statut='valide'
    ")->fetchColumn();

    // Moyenne générale
    $stmt = $pdo->query("
        SELECT AVG(n.valeur * te.coefficient / (SELECT SUM(te2.coefficient) FROM TypeEvaluation te2 WHERE te2.id_cours=te.id_cours))
        FROM Note n JOIN TypeEvaluation te ON te.id_type_eval=n.id_type_eval
        WHERE n.id_etudiant=$id_etudiant
    ");
    $moy = $stmt->fetchColumn();
    $stats['moyenne'] = $moy !== null ? round($moy * 20, 2) : null;

    // Notes récentes
    $stmt = $pdo->query("
        SELECT c.nom AS cours, te.nom AS type_eval, n.valeur
        FROM Note n
        JOIN TypeEvaluation te ON te.id_type_eval=n.id_type_eval
        JOIN Cours c ON c.id_cours=te.id_cours
        WHERE n.id_etudiant=$id_etudiant
        ORDER BY n.date_saisie DESC LIMIT 5
    ");
    $stats['notes'] = $stmt->fetchAll();

    // Prochaines séances
    $stmt = $pdo->query("
        SELECT c.nom AS cours, s.jour_semaine AS jour, s.heure_debut, s.heure_fin, s.salle
        FROM Seance s JOIN Cours c ON c.id_cours=s.id_cours
        JOIN Inscription i ON i.id_cours=c.id_cours
        WHERE i.id_etudiant=$id_etudiant AND i.statut='inscrit'
        ORDER BY FIELD(s.jour_semaine,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'), s.heure_debut
        LIMIT 5
    ");
    $stats['prochaines_seances'] = $stmt->fetchAll();

    echo json_encode($stats);
}
