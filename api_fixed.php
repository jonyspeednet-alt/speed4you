<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: max-age=5, must-revalidate');

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
        if ($file[0] === '.' || $file === 'index.html' || $file === 'api.php') continue;
        $filePath = $fullPath . '/' . $file;
        $stat = stat($filePath);
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        // Sanitize invalid UTF-8 characters
        $name = mb_convert_encoding($file, 'UTF-8', 'UTF-8');
        if ($name === false || $name === '') {
            $name = mb_convert_encoding($file, 'UTF-8', 'Windows-1252');
        }
        if ($name === false || $name === '') {
            $name = preg_replace('/[^\x20-\x7E\xA0-\xFF]/', '', $file);
        }
        if ($name === '') $name = '(unnamed)';
        $items[] = [
            'name' => $name,
            'path' => $path . ($path === '/' ? '' : '/') . rawurlencode($file),
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

$result = json_encode([
    'path' => $path,
    'parent' => $path === '/' ? null : dirname($path),
    'items' => $items
], JSON_INVALID_UTF8_SUBSTITUTE);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to encode directory listing: ' . json_last_error_msg()]);
    exit;
}

echo $result;
