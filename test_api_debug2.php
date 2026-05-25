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
    $encoded = json_encode($file);
    if ($encoded === false) {
        echo "FAIL: file #$count: byte sequence: " . bin2hex($file) . "\n";
        echo "  name display: " . $file . "\n";
    }
    $items[] = ['name' => $file, 'isDir' => is_dir($filePath)];
    $count++;
}
closedir($dh);
echo "Total: $count items\n";
