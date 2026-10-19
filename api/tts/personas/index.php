<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

echo json_encode([
    'ok' => true,
    'personas' => [
        [
            'id' => 'coach_alex',
            'label' => 'Coach Alex · Native American Coach (GuyNeural)',
            'voice' => 'en-US-GuyNeural',
            'lang' => 'en-US'
        ],
        [
            'id' => 'coach_sarah',
            'label' => 'Coach Sarah · Dynamic Female Coach (AriaNeural)',
            'voice' => 'en-US-AriaNeural',
            'lang' => 'en-US'
        ],
        [
            'id' => 'nanami',
            'label' => 'NanamiSensei · Mitra Kaiwa Jepang (NanamiNeural)',
            'voice' => 'ja-JP-NanamiNeural',
            'lang' => 'ja-JP'
        ],
        [
            'id' => 'keita',
            'label' => 'Keita · Mahasiswa Percakapan Jepang (KeitaNeural)',
            'voice' => 'ja-JP-KeitaNeural',
            'lang' => 'ja-JP'
        ],
        [
            'id' => 'instructor',
            'label' => 'Ardi · Instruktur Ujian Indonesia (ArdiNeural)',
            'voice' => 'id-ID-ArdiNeural',
            'lang' => 'id-ID'
        ],
        [
            'id' => 'vocab',
            'label' => 'Ava · Leksikon Kosakata (AvaNeural)',
            'voice' => 'en-US-AvaNeural',
            'lang' => 'en-US'
        ]
    ]
]);
