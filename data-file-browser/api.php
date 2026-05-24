<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$root = '/var/www/html';
$path = isset($_GET['path']) ? trim($_GET['path']) : '/';

// Security: prevent directory traversal
$path = str_replace('..', '', $path);
$path = str_replace('//', '/', $path);
if ($path === '') $path = '/';

$fullPath = realpath($root . $path);
if ($fullPath === false || strpos($fullPath, realpath($root)) !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$isDir = is_dir($fullPath);
if (!$isDir) {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
    exit;
}

$items = [];
$dh = opendir($fullPath);
if ($dh) {
    while (($file = readdir($dh)) !== false) {
        if ($file === '.' || $file === '..' || $file === '.d.css' || $file === 'index.html') continue;
        $filePath = $fullPath . '/' . $file;
        $stat = stat($filePath);
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $items[] = [
            'name' => $file,
            'path' => $path . ($path === '/' ? '' : '/') . $file,
            'isDir' => is_dir($filePath),
            'size' => is_dir($filePath) ? 0 : $stat['size'],
            'modified' => $stat['mtime'],
            'ext' => $ext,
        ];
    }
    closedir($dh);
}

usort($items, function ($a, $b) {
    if ($a['isDir'] !== $b['isDir']) return $a['isDir'] ? -1 : 1;
    return strcasecmp($a['name'], $b['name']);
});

echo json_encode([
    'path' => $path,
    'parent' => $path === '/' ? null : dirname($path),
    'items' => $items
]);
