<?php
$root = '/var/www/html';
$path = '/TV_Series/TV_Web_Series-N-S';
$fullPath = realpath($root . $path);
$items = [];
$dh = opendir($fullPath);
if (!$dh) { echo "opendir failed\n"; exit(1); }
$count = 0;
while (($file = readdir($dh)) !== false) {
    if ($file[0] === '.') continue;
    $filePath = $fullPath . '/' . $file;
    $items[] = ['name' => $file, 'isDir' => is_dir($filePath)];
    $count++;
}
closedir($dh);
echo "$count items found\n";
$json = json_encode(['path' => $path, 'items' => $items]);
if ($json === false) {
    echo "json_encode error: " . json_last_error_msg() . "\n";
    echo "Last item: " . json_encode(end($items)) . "\n";
} else {
    echo "JSON OK, size: " . strlen($json) . " bytes\n";
}
