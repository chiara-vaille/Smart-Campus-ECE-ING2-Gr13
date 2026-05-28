-- ============================================================
-- SmartCampus — Schéma complet + données de test
-- ============================================================

DROP DATABASE IF EXISTS smartcampus;
CREATE DATABASE smartcampus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartcampus;

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE Utilisateur (
    id_utilisateur INT AUTO_INCREMENT PRIMARY KEY,
    nom            VARCHAR(100) NOT NULL,
    prenom         VARCHAR(100) NOT NULL,
    email          VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe   VARCHAR(255) NOT NULL,
    role           ENUM('etudiant','enseignant','admin') NOT NULL,
    date_creation  DATETIME DEFAULT NOW(),
    actif          TINYINT(1) DEFAULT 1
);

CREATE TABLE Etudiant (
    id_etudiant       INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur    INT NOT NULL UNIQUE,
    numero_etudiant   VARCHAR(20) NOT NULL UNIQUE,
    date_naissance    DATE,
    filiere           VARCHAR(100),
    niveau            ENUM('L1','L2','L3','M1','M2') NOT NULL DEFAULT 'L1',
    annee_inscription YEAR,
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur) ON DELETE CASCADE
);

CREATE TABLE Enseignant (
    id_enseignant  INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL UNIQUE,
    departement    VARCHAR(100),
    grade          ENUM('Professeur','Maitre_conferences','Maitre_assistant','Vacataire') DEFAULT 'Maitre_assistant',
    telephone      VARCHAR(20),
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur) ON DELETE CASCADE
);

CREATE TABLE Cours (
    id_cours         INT AUTO_INCREMENT PRIMARY KEY,
    code_cours       VARCHAR(20) NOT NULL UNIQUE,
    nom              VARCHAR(200) NOT NULL,
    description      TEXT,
    credits          INT DEFAULT 3,
    coefficient      DECIMAL(3,1) DEFAULT 1.0,
    capacite_max     INT DEFAULT 30,
    semestre         ENUM('S1','S2','S3','S4','S5','S6','S7','S8','S9','S10') DEFAULT 'S1',
    niveau           ENUM('L1','L2','L3','M1','M2') DEFAULT 'L1',
    departement      VARCHAR(100),
    id_enseignant    INT,
    annee_academique VARCHAR(9) DEFAULT '2025-2026',
    statut           ENUM('actif','archive') DEFAULT 'actif',
    FOREIGN KEY (id_enseignant) REFERENCES Enseignant(id_enseignant) ON DELETE SET NULL
);

CREATE TABLE Prerequis (
    id_cours           INT NOT NULL,
    id_cours_prerequis INT NOT NULL,
    PRIMARY KEY (id_cours, id_cours_prerequis),
    FOREIGN KEY (id_cours)           REFERENCES Cours(id_cours) ON DELETE CASCADE,
    FOREIGN KEY (id_cours_prerequis) REFERENCES Cours(id_cours) ON DELETE CASCADE
);

CREATE TABLE Inscription (
    id_inscription   INT AUTO_INCREMENT PRIMARY KEY,
    id_etudiant      INT NOT NULL,
    id_cours         INT NOT NULL,
    date_inscription DATETIME DEFAULT NOW(),
    statut           ENUM('inscrit','abandonne','valide','echec') DEFAULT 'inscrit',
    UNIQUE KEY uk_inscription (id_etudiant, id_cours),
    FOREIGN KEY (id_etudiant) REFERENCES Etudiant(id_etudiant) ON DELETE CASCADE,
    FOREIGN KEY (id_cours)    REFERENCES Cours(id_cours)    ON DELETE CASCADE
);

CREATE TABLE TypeEvaluation (
    id_type_eval INT AUTO_INCREMENT PRIMARY KEY,
    id_cours     INT NOT NULL,
    nom          VARCHAR(100) NOT NULL,
    coefficient  DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    UNIQUE KEY uk_type_eval (id_cours, nom),
    FOREIGN KEY (id_cours) REFERENCES Cours(id_cours) ON DELETE CASCADE
);

CREATE TABLE Note (
    id_note       INT AUTO_INCREMENT PRIMARY KEY,
    id_etudiant   INT NOT NULL,
    id_type_eval  INT NOT NULL,
    valeur        DECIMAL(4,2) NOT NULL CHECK (valeur >= 0 AND valeur <= 20),
    date_saisie   DATETIME DEFAULT NOW(),
    verrouille    TINYINT(1) DEFAULT 0,
    id_enseignant INT,
    UNIQUE KEY uk_note (id_etudiant, id_type_eval),
    FOREIGN KEY (id_etudiant)   REFERENCES Etudiant(id_etudiant)        ON DELETE CASCADE,
    FOREIGN KEY (id_type_eval)  REFERENCES TypeEvaluation(id_type_eval) ON DELETE CASCADE,
    FOREIGN KEY (id_enseignant) REFERENCES Enseignant(id_enseignant)    ON DELETE SET NULL
);

CREATE TABLE Seance (
    id_seance    INT AUTO_INCREMENT PRIMARY KEY,
    id_cours     INT NOT NULL,
    jour_semaine ENUM('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi') NOT NULL,
    heure_debut  TIME NOT NULL,
    heure_fin    TIME NOT NULL,
    salle        VARCHAR(50),
    type_seance  ENUM('CM','TD','TP') DEFAULT 'CM',
    date_debut   DATE,
    date_fin     DATE,
    FOREIGN KEY (id_cours) REFERENCES Cours(id_cours) ON DELETE CASCADE
);

CREATE TABLE Presence (
    id_presence INT AUTO_INCREMENT PRIMARY KEY,
    id_etudiant INT NOT NULL,
    id_seance   INT NOT NULL,
    date_cours  DATE NOT NULL,
    statut      ENUM('present','absent','absent_justifie','retard') DEFAULT 'present',
    commentaire TEXT,
    UNIQUE KEY uk_presence (id_etudiant, id_seance, date_cours),
    FOREIGN KEY (id_etudiant) REFERENCES Etudiant(id_etudiant) ON DELETE CASCADE,
    FOREIGN KEY (id_seance)   REFERENCES Seance(id_seance)     ON DELETE CASCADE
);

CREATE TABLE Notification (
    id_notification INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur  INT NOT NULL,
    type            ENUM('note_publiee','absence','nouveau_cours','changement_edt','message') NOT NULL,
    titre           VARCHAR(200) NOT NULL,
    message         TEXT,
    date_creation   DATETIME DEFAULT NOW(),
    lu              TINYINT(1) DEFAULT 0,
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateur(id_utilisateur) ON DELETE CASCADE
);

CREATE TABLE Message (
    id_message      INT AUTO_INCREMENT PRIMARY KEY,
    id_expediteur   INT NOT NULL,
    id_destinataire INT NOT NULL,
    sujet           VARCHAR(200),
    contenu         TEXT NOT NULL,
    date_envoi      DATETIME DEFAULT NOW(),
    lu              TINYINT(1) DEFAULT 0,
    FOREIGN KEY (id_expediteur)   REFERENCES Utilisateur(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (id_destinataire) REFERENCES Utilisateur(id_utilisateur) ON DELETE CASCADE
);

-- ── Données de test ──────────────────────────────────────────

-- Mots de passe : admin123 / prof123 / etudiant123 (bcrypt)
INSERT INTO Utilisateur (nom, prenom, email, mot_de_passe, role) VALUES
('Admin',    'SmartCampus', 'admin@smartcampus.fr',    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Dupont',   'Marie',       'prof@smartcampus.fr',     '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'enseignant'),
('Bernard',  'Jean',        'prof2@smartcampus.fr',    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'enseignant'),
('Martin',   'Emma',        'etudiant@smartcampus.fr', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'etudiant'),
('Leclerc',  'Thomas',      'thomas@smartcampus.fr',   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'etudiant'),
('Moreau',   'Sophie',      'sophie@smartcampus.fr',   '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'etudiant');

-- Note : le hash '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' = 'password' (Laravel test hash)
-- Pour SmartCampus, les vrais mots de passe sont générés via password_hash() dans le seed ci-dessous

INSERT INTO Enseignant (id_utilisateur, departement, grade) VALUES
(2, 'Informatique', 'Professeur'),
(3, 'Mathématiques', 'Maitre_conferences');

INSERT INTO Etudiant (id_utilisateur, numero_etudiant, filiere, niveau, annee_inscription) VALUES
(4, 'E20230001', 'Informatique', 'L2', 2023),
(5, 'E20230002', 'Informatique', 'L2', 2023),
(6, 'E20230003', 'Informatique', 'L1', 2024);

INSERT INTO Cours (code_cours, nom, description, credits, coefficient, capacite_max, semestre, niveau, departement, id_enseignant, annee_academique) VALUES
('INFO101', 'Algorithmique avancée',      'Structures de données, complexité, algorithmes de tri',  5, 1.5, 30, 'S3', 'L2', 'Informatique',   1, '2025-2026'),
('INFO102', 'Bases de données',           'Modélisation relationnelle, SQL, transactions',           4, 1.0, 25, 'S3', 'L2', 'Informatique',   1, '2025-2026'),
('INFO103', 'Projet Web',                 'Développement d\'une application web complète',           3, 1.0, 20, 'S4', 'L2', 'Informatique',   2, '2025-2026'),
('MATH101', 'Mathématiques discrètes',    'Logique, graphes, combinatoire',                          4, 1.0, 30, 'S1', 'L1', 'Mathématiques',  2, '2025-2026'),
('INFO001', 'Introduction à la prog.',    'Bases de la programmation en Python',                     3, 1.0, 35, 'S1', 'L1', 'Informatique',   1, '2025-2026');

-- Prérequis : INFO101 requiert INFO001
INSERT INTO Prerequis VALUES (1, 5);

-- Types d'évaluation
INSERT INTO TypeEvaluation (id_cours, nom, coefficient) VALUES
(1, 'Contrôle continu 1', 0.30),
(1, 'Contrôle continu 2', 0.30),
(1, 'Examen final',       0.40),
(2, 'TP noté',            0.40),
(2, 'Examen final',       0.60),
(3, 'Projet',             1.00),
(4, 'Contrôle continu',   0.40),
(4, 'Examen final',       0.60);

-- Inscriptions
INSERT INTO Inscription (id_etudiant, id_cours, statut) VALUES
(1, 1, 'inscrit'),
(1, 2, 'inscrit'),
(1, 3, 'inscrit'),
(2, 1, 'inscrit'),
(2, 2, 'inscrit'),
(3, 4, 'inscrit'),
(3, 5, 'inscrit');

-- Notes
INSERT INTO Note (id_etudiant, id_type_eval, valeur, id_enseignant) VALUES
(1, 1, 15.5, 1),
(1, 2, 12.0, 1),
(1, 4, 14.0, 1),
(2, 1, 17.0, 1),
(2, 2, 16.5, 1),
(2, 4, 13.5, 1),
(3, 7, 11.0, 2),
(3, 8, 13.0, 2);

-- Séances (emploi du temps)
INSERT INTO Seance (id_cours, jour_semaine, heure_debut, heure_fin, salle, type_seance, date_debut, date_fin) VALUES
(1, 'Lundi',    '08:00', '10:00', 'B204', 'CM', '2025-09-01', '2026-01-31'),
(1, 'Mercredi', '14:00', '16:00', 'B105', 'TD', '2025-09-01', '2026-01-31'),
(2, 'Mardi',    '10:00', '12:00', 'B302', 'CM', '2025-09-01', '2026-01-31'),
(2, 'Jeudi',    '08:00', '10:00', 'LAB1', 'TP', '2025-09-01', '2026-01-31'),
(3, 'Vendredi', '14:00', '17:00', 'B101', 'TP', '2025-09-01', '2026-01-31'),
(4, 'Mardi',    '08:00', '10:00', 'A201', 'CM', '2025-09-01', '2026-01-31'),
(5, 'Lundi',    '10:00', '12:00', 'A101', 'CM', '2025-09-01', '2026-01-31');

-- ── Procédure pour recalculer les mots de passe ──────────────
-- IMPORTANT : Ces hashes correspondent au mot de passe 'password'.
-- Pour changer, exécuter en PHP :
--   UPDATE Utilisateur SET mot_de_passe = '$2y$10$...' WHERE email = '...'
-- Ou utiliser le script seed.php fourni.
