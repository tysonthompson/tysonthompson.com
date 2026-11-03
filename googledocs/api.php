<?php
declare(strict_types=1);

use Folio\ApiError;
use Folio\Documents;
use Folio\DocumentStore;

require_once __DIR__ . '/server/DocumentStore.php';
require_once __DIR__ . '/server/Documents.php';

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('Referrer-Policy: same-origin');

const MAX_REQUEST_BYTES = 8388608;

function respond(array $body, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}

try {
    $action = $_GET['action'] ?? 'bootstrap';
    $readActions = ['bootstrap', 'documents', 'document'];
    $writeActions = ['switch_user', 'create', 'update', 'delete', 'share', 'unshare', 'import'];
    if (!is_string($action) || !in_array($action, array_merge($readActions, $writeActions), true)) {
        throw new ApiError(404, 'unknown_action', 'This action is not available.');
    }
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $expectedMethod = in_array($action, $readActions, true) ? 'GET' : 'POST';
    if ($method !== $expectedMethod) {
        header('Allow: ' . $expectedMethod);
        throw new ApiError(405, 'method_not_allowed', 'Use ' . $expectedMethod . ' for this action.');
    }
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_REQUEST_BYTES) {
        throw new ApiError(413, 'request_too_large', 'This request is too large.');
    }

    session_name('folio_demo');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => 0, 'path' => '/googledocs',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true, 'samesite' => 'Lax',
    ]);
    if (!session_start()) {
        throw new RuntimeException('Unable to initialize the demo session.');
    }
    if (!isset($_SESSION['userId'])) {
        $_SESSION['userId'] = 'tyson';
    }
    if (!isset($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    if ($method === 'POST') {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($token) || !hash_equals($_SESSION['csrf'], $token)) {
            throw new ApiError(403, 'csrf_invalid', 'Your session needs to be refreshed before making changes.');
        }
    }

    $input = [];
    if ($method === 'GET') {
        $input['id'] = $_GET['id'] ?? null;
    } elseif ($action === 'import') {
        $file = $_FILES['file'] ?? null;
        if (!is_array($file) || !isset($file['error']) || is_array($file['error'])) {
            throw new ApiError(422, 'invalid_file', 'Choose a text or Markdown file to import.');
        }
        if ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE || ($file['size'] ?? 0) > Documents::MAX_IMPORT_BYTES) {
            throw new ApiError(413, 'file_too_large', 'Choose a text or Markdown file of 1 MB or less.');
        }
        if ($file['error'] !== UPLOAD_ERR_OK || !isset($file['tmp_name']) || !is_string($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new ApiError(422, 'invalid_file', 'The file could not be uploaded. Please try again.');
        }
        $filename = basename(str_replace('\\', '/', (string) ($file['name'] ?? '')));
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($extension, ['txt', 'md'], true)) {
            throw new ApiError(422, 'invalid_file', 'Import a .txt or .md file.');
        }
        $text = file_get_contents($file['tmp_name'], false, null, 0, Documents::MAX_IMPORT_BYTES + 1);
        if ($text === false) {
            throw new ApiError(422, 'invalid_file', 'The uploaded file could not be read.');
        }
        $input = ['title' => pathinfo($filename, PATHINFO_FILENAME), 'text' => $text];
    } else {
        $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
        if ($contentType !== 'application/json') {
            throw new ApiError(415, 'unsupported_media_type', 'Send this request as JSON.');
        }
        $raw = file_get_contents('php://input', false, null, 0, MAX_REQUEST_BYTES + 1);
        if ($raw === false || strlen($raw) > MAX_REQUEST_BYTES) {
            throw new ApiError(413, 'request_too_large', 'This request is too large.');
        }
        try {
            $decoded = json_decode($raw, false, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException $error) {
            throw new ApiError(400, 'invalid_json', 'The request must contain valid JSON.');
        }
        if (!($decoded instanceof stdClass)) {
            throw new ApiError(400, 'invalid_json', 'The request must contain a JSON object.');
        }
        $input = get_object_vars($decoded);
    }

    $documents = new Documents(new DocumentStore(__DIR__ . '/storage/data.php'));
    if ($action === 'switch_user') {
        $targetUser = $input['userId'] ?? null;
        if (!is_string($targetUser)) {
            throw new ApiError(422, 'invalid_user', 'Choose a valid demo account.');
        }
        $result = $documents->handle('switch_user', [], $targetUser);
        $_SESSION['userId'] = $targetUser;
        // Other tabs retain their previous token and must refresh before writing
        // under a different identity than the one currently shown in their UI.
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        unset($result['users']);
    } else {
        $result = $documents->handle($action, $input, $_SESSION['userId']);
    }
    if ($action === 'bootstrap' || $action === 'switch_user') {
        $result['csrf'] = $_SESSION['csrf'];
    }
    session_write_close();
    respond($result, $action === 'create' || $action === 'import' ? 201 : 200);
} catch (ApiError $error) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    respond(array_merge(['error' => ['code' => $error->errorCode, 'message' => $error->getMessage()]], $error->extra), $error->status);
} catch (Throwable $error) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    error_log('Folio API: ' . $error->getMessage());
    respond(['error' => ['code' => 'server_error', 'message' => 'The workspace could not complete this request. Please try again.']], 500);
}
