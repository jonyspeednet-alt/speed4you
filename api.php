<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: max-age=5, must-revalidate');

$root = '/var/www/html';
$path = isset($_GET['path']) ? trim($_GET['path']) : '/';

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

// Only show media directories at root level
function isMediaItem($name, $isDir, $path) {
    if ($path === '/') {
        if ($name === 'api.php') return false;
        if (strpos($name, '.') === 0) return false;
        if (!$isDir) return false;
        $mediaDirs = [
            '3D_Movies', 'English_Movies', 'Hindi_Dubbed_Movies', 'Hindi_Movies',
            'New_Movies_1', 'New_Movies_2', 'Other_Foreign_Movies',
            'South_Indian_Movies', 'TV_Series'
        ];
        return in_array($name, $mediaDirs);
    }
    return true;
}

$items = [];
$dh = opendir($fullPath);
if ($dh) {
    while (($file = readdir($dh)) !== false) {
        if ($file[0] === '.' || $file === 'index.html' || $file === 'api.php.bak') continue;
        $filePath = $fullPath . '/' . $file;
        $isDirEntry = is_dir($filePath);
        if (!isMediaItem($file, $isDirEntry, $path)) continue;
        $stat = stat($filePath);
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        $items[] = [
            'name' => $file,
            'path' => $path . ($path === '/' ? '' : '/') . $file,
            'isDir' => $isDirEntry,
            'size' => $isDirEntry ? 0 : $stat['size'],
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
