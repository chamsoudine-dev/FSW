<?php
header('Content-Type: application/json');

// Activer les erreurs pour le debug (à retirer en production)
ini_set('display_errors', 1);
error_reporting(E_ALL);

$db_file = __DIR__ . '/database.sqlite';

try {
    // Connexion à la base SQLite
    $pdo = new PDO('sqlite:' . $db_file);
    // Configuration pour générer des exceptions en cas d'erreur
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Création de table si elle n'existe pas
    $pdo->exec("CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY,
        client TEXT,
        phone TEXT,
        type TEXT,
        price TEXT,
        dueDate TEXT,
        step TEXT,
        assignee TEXT,
        notes TEXT,
        photo TEXT
    )");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de base de données : ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? '';

if ($action === 'getAll') {
    try {
        $stmt = $pdo->query("SELECT * FROM tasks");
        $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convertir l'ID en entier pour la compatibilité avec le JS existant
        foreach($tasks as &$task) {
            $task['id'] = (int)$task['id'];
        }
        
        echo json_encode($tasks);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} elseif ($action === 'save') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Données invalides']);
        exit;
    }
    
    try {
        // REPLACE INTO agit comme un INSERT, ou un UPDATE si l'ID existe déjà (comportement d'UPSERT)
        $stmt = $pdo->prepare("REPLACE INTO tasks (id, client, phone, type, price, dueDate, step, assignee, notes, photo) 
            VALUES (:id, :client, :phone, :type, :price, :dueDate, :step, :assignee, :notes, :photo)");
            
        $stmt->execute([
            ':id' => $data['id'],
            ':client' => $data['client'] ?? '',
            ':phone' => $data['phone'] ?? '',
            ':type' => $data['type'] ?? '',
            ':price' => $data['price'] ?? '',
            ':dueDate' => $data['dueDate'] ?? '',
            ':step' => $data['step'] ?? '',
            ':assignee' => $data['assignee'] ?? '',
            ':notes' => $data['notes'] ?? '',
            ':photo' => $data['photo'] ?? ''
        ]);
        
        echo json_encode(['success' => true]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} elseif ($action === 'delete') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data || !isset($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Données invalides : ID manquant']);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = :id");
        $stmt->execute([':id' => $data['id']]);
        echo json_encode(['success' => true]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Action inconnue. Utilisez action=getAll, save, ou delete.']);
}
