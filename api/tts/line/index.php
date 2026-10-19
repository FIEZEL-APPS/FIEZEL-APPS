<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true) ?: [];

$text = trim($body['text'] ?? '');
if (!$text) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Text is required']);
    exit;
}

$speaker = trim($body['speaker'] ?? 'coach_alex');
$lang = trim($body['lang'] ?? 'en');

// Check disk cache
$cacheDir = sys_get_temp_dir() . '/fiezel_tts_cache';
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0777, true);
}

$cacheKey = md5($speaker . '::' . $text);
$cacheFile = $cacheDir . '/' . $cacheKey . '.json';

if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < 86400 * 7)) {
    $cached = @file_get_contents($cacheFile);
    if ($cached) {
        echo $cached;
        exit;
    }
}

// Forward to Render upstream backend
$upstreamUrl = 'https://fiezel-apps.onrender.com/api/tts/line';
$ch = curl_init($upstreamUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode([
        'text' => $text,
        'speaker' => $speaker,
        'lang' => $lang,
        'course' => $body['course'] ?? null
    ]),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'User-Agent: Fiezel-cPanel-Bridge/1.0'
    ],
    CURLOPT_TIMEOUT => 15,
    CURLOPT_CONNECTTIMEOUT => 6,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response && $httpCode >= 200 && $httpCode < 300) {
    @file_put_contents($cacheFile, $response);
    echo $response;
    exit;
}

// If upstream failed
http_response_code($httpCode ?: 502);
echo json_encode([
    'ok' => false,
    'error' => 'Upstream synthesis failed',
    'status' => $httpCode,
    'detail' => $curlError ?: $response
]);
