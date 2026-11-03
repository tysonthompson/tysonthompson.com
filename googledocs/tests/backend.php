<?php
declare(strict_types=1);

use Folio\ApiError;
use Folio\Documents;
use Folio\DocumentStore;

require_once __DIR__ . '/../server/DocumentStore.php';
require_once __DIR__ . '/../server/Documents.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$temporaryDirectory = sys_get_temp_dir() . '/folio-tests-' . bin2hex(random_bytes(12));
if (!mkdir($temporaryDirectory, 0700)) {
    throw new RuntimeException('Could not create isolated test storage.');
}
$storePath = $temporaryDirectory . '/data.php';
$service = new Documents(new DocumentStore($storePath));
$assertions = 0;

function check(bool $condition, string $message): void
{
    global $assertions;
    $assertions++;
    if (!$condition) {
        throw new RuntimeException('FAIL: ' . $message);
    }
}

function expectError(callable $action, int $status, string $code): ApiError
{
    try {
        $action();
    } catch (ApiError $error) {
        check($error->status === $status, 'Expected HTTP ' . $status . ', got ' . $error->status);
        check($error->errorCode === $code, 'Expected error ' . $code . ', got ' . $error->errorCode);
        return $error;
    }
    throw new RuntimeException('FAIL: Expected ' . $code . ', action succeeded.');
}

try {
    $bootstrap = $service->handle('bootstrap', [], 'tyson');
    check(count($bootstrap['users']) === 3, 'Exactly three mock accounts are seeded.');
    check(count($bootstrap['documents']) === 4, 'The default account can see all four useful seed documents.');
    check($bootstrap['user']['name'] === 'Tyson Thompson', 'The default account has the correct name.');
    $raw = file_get_contents($storePath);
    check(strncmp($raw, DocumentStore::PREFIX, strlen(DocumentStore::PREFIX)) === 0, 'Stored JSON has an executable PHP exit defense.');
    check(isset($bootstrap['documents'][0]['excerpt'], $bootstrap['documents'][0]['wordCount']), 'Summaries have excerpts and word counts.');

    $doc = $service->handle('create', ['title' => 'A new idea', 'content' => '<p>A careful first sentence.</p>'], 'tyson')['document'];
    $id = $doc['id'];
    check($doc['role'] === 'owner' && $doc['version'] === 1, 'A new document starts at version 1 and belongs to its creator.');
    expectError(fn() => $service->handle('document', ['id' => $id], 'maya'), 404, 'not_found');
    $mayaDocs = $service->handle('documents', [], 'maya')['documents'];
    check(!in_array($id, array_column($mayaDocs, 'id'), true), 'An unshared document is absent from another account library.');
    expectError(fn() => $service->handle('bootstrap', [], 'someone-else'), 401, 'invalid_user');

    $shared = $service->handle('share', ['id' => $id, 'userId' => 'maya', 'role' => 'viewer'], 'tyson')['document'];
    check($shared['sharedWith'][0]['role'] === 'viewer', 'Owners can grant viewer access.');
    $viewed = $service->handle('document', ['id' => $id], 'maya')['document'];
    check($viewed['role'] === 'viewer', 'Viewer access is reflected in API data.');
    expectError(fn() => $service->handle('update', ['id' => $id, 'title' => 'Unauthorized', 'content' => '', 'version' => $viewed['version']], 'maya'), 403, 'forbidden');
    expectError(fn() => $service->handle('delete', ['id' => $id], 'maya'), 403, 'forbidden');
    expectError(fn() => $service->handle('share', ['id' => $id, 'userId' => 'alex', 'role' => 'editor'], 'maya'), 403, 'forbidden');

    $shared = $service->handle('share', ['id' => $id, 'userId' => 'maya', 'role' => 'editor'], 'tyson')['document'];
    $updated = $service->handle('update', ['id' => $id, 'title' => 'A shared idea', 'content' => '<h2>Edited together</h2><p>Make the next step clear.</p>', 'version' => $shared['version']], 'maya')['document'];
    check($updated['role'] === 'editor' && $updated['version'] === $shared['version'] + 1, 'Editors can update with the latest version.');
    expectError(fn() => $service->handle('unshare', ['id' => $id, 'userId' => 'maya'], 'maya'), 403, 'forbidden');
    expectError(fn() => $service->handle('delete', ['id' => $id], 'maya'), 403, 'forbidden');
    $conflict = expectError(fn() => $service->handle('update', ['id' => $id, 'title' => 'Stale write', 'content' => '<p>This must not replace the current document.</p>', 'version' => $shared['version']], 'tyson'), 409, 'version_conflict');
    check($conflict->extra['document']['title'] === 'A shared idea', 'A conflict includes the current document for recovery.');
    check($service->handle('document', ['id' => $id], 'tyson')['document']['title'] === 'A shared idea', 'A stale save cannot overwrite new content.');
    expectError(fn() => $service->handle('update', ['id' => $id, 'title' => 'Missing version', 'content' => ''], 'tyson'), 422, 'validation_error');
    expectError(fn() => $service->handle('share', ['id' => $id, 'userId' => 'maya', 'role' => 'owner'], 'tyson'), 422, 'validation_error');
    expectError(fn() => $service->handle('share', ['id' => $id, 'userId' => 'tyson', 'role' => 'viewer'], 'tyson'), 422, 'validation_error');

    $service->handle('unshare', ['id' => $id, 'userId' => 'maya'], 'tyson');
    expectError(fn() => $service->handle('document', ['id' => $id], 'maya'), 404, 'not_found');
    expectError(fn() => $service->handle('update', ['id' => $id, 'title' => 'Revoked', 'content' => '', 'version' => $updated['version']], 'maya'), 404, 'not_found');
    check(!in_array($id, array_column($service->handle('documents', [], 'maya')['documents'], 'id'), true), 'Revoking access immediately removes the document from the account library.');

    $dirty = '<h1 onclick="alert(1)">Hello</h1><script>alert(2)</script><style>body{display:none}</style><img src=x onerror=alert(3)><svg onload="alert(4)"></svg><p style="color:red" contenteditable="true">Safe <strong>bold</strong> and <em>emphasis</em></p><a href="javascript:alert(5)">unsafe link</a><a href="https://example.com/?a=1&amp;b=2" onclick="alert(6)">safe link</a><a href="mailto:hello@example.test">email</a><ol start="3"><li>Third</li></ol><iframe src="https://example.com">hidden</iframe>';
    $clean = Documents::sanitize($dirty);
    check(strpos($clean, '<script') === false && strpos($clean, 'alert(') === false, 'Scripts and event handlers are removed.');
    check(strpos($clean, '<style') === false && strpos($clean, '<img') === false && strpos($clean, '<svg') === false && strpos($clean, '<iframe') === false, 'Executable and remote media elements are removed.');
    check(strpos($clean, 'style=') === false && strpos($clean, 'contenteditable=') === false && strpos($clean, 'javascript:') === false, 'Untrusted attributes and URL schemes are removed.');
    check(strpos($clean, '<strong>bold</strong>') !== false && strpos($clean, '<em>emphasis</em>') !== false, 'Allowed rich text survives sanitization.');
    check(strpos($clean, 'href="https://example.com/?a=1&amp;b=2"') !== false && strpos($clean, 'href="mailto:hello@example.test"') !== false, 'Safe HTTPS and mailto links survive.');
    check(strpos($clean, '<ol start="3">') !== false, 'Safe ordered-list starts survive.');
    check(Documents::sanitize($clean) === $clean, 'Sanitizing safe HTML is idempotent.');
    check(Documents::sanitize('<p>Ideas</p><div>Another paragraph</div>') === '<p>Ideas</p><p>Another paragraph</p>', 'Contenteditable div paragraphs normalize safely.');
    $encodedAttack = Documents::sanitize('<a href="java&#x09;script:alert(1)">click</a><a href="data:text/html,attack">data</a><a href="//example.com">relative</a>');
    check(strpos($encodedAttack, 'href=') === false, 'Obfuscated, data, and protocol-relative URLs are rejected.');

    $import = $service->handle('import', ['title' => 'Notes', 'text' => "# Notes\r\n<script>alert('no')</script>\r\n\r\nA & B"], 'maya')['document'];
    check($import['role'] === 'owner' && $import['ownerId'] === 'maya', 'Imported files belong to the importing account.');
    check(strpos($import['content'], '&lt;script&gt;') !== false && strpos($import['content'], '<script>') === false, 'Imported Markdown and HTML remain literal text.');
    check(strpos($import['content'], "\r") === false && strpos($import['content'], 'A &amp; B') !== false, 'Imported line endings normalize and special characters escape.');
    check(strpos($import['content'], '<p># Notes<br>') === 0 && strpos($import['content'], '</p><p>A &amp; B</p>') !== false, 'Imported text becomes editable paragraphs with line breaks.');
    $largestEscapedImport = Documents::importText(str_repeat('"', Documents::MAX_IMPORT_BYTES));
    check(strlen($largestEscapedImport) <= Documents::MAX_CONTENT_BYTES, 'The maximum imported file still fits after worst-case entity expansion.');
    check(Documents::sanitize($largestEscapedImport) === $largestEscapedImport, 'A maximum-size escaped import can be saved again without loss.');
    unset($largestEscapedImport);
    expectError(fn() => Documents::sanitize(str_repeat('&', intdiv(Documents::MAX_CONTENT_BYTES, 5) + 1)), 413, 'content_too_large');
    expectError(fn() => Documents::importText(str_repeat('x', Documents::MAX_IMPORT_BYTES + 1)), 413, 'file_too_large');
    expectError(fn() => Documents::importText("\xC3\x28"), 422, 'invalid_file');
    expectError(fn() => Documents::importText("binary\0data"), 422, 'invalid_file');
    expectError(fn() => Documents::sanitize("\xC3\x28"), 422, 'validation_error');
    expectError(fn() => $service->handle('create', ['title' => str_repeat('a', 201), 'content' => ''], 'tyson'), 422, 'validation_error');
    check($service->handle('create', ['title' => '', 'content' => ''], 'tyson')['document']['title'] === 'Untitled document', 'Empty titles have a readable default.');

    $reloaded = new Documents(new DocumentStore($storePath));
    check($reloaded->handle('document', ['id' => $id], 'tyson')['document']['title'] === 'A shared idea', 'A fresh service instance reads persisted updates.');
    check($reloaded->handle('document', ['id' => $import['id']], 'maya')['document']['content'] === $import['content'], 'Imports persist across fresh service instances.');
    $reloaded->handle('delete', ['id' => $id], 'tyson');
    expectError(fn() => $service->handle('document', ['id' => $id], 'tyson'), 404, 'not_found');
    check($service->handle('bootstrap', [], 'tyson')['user']['id'] === 'tyson', 'Existing storage is reused without resetting the workspace.');

    $beforeFailure = file_get_contents($storePath);
    try {
        (new DocumentStore($storePath))->transaction(function (array &$data): void {
            $data['documents'] = [];
            throw new RuntimeException('Simulated failure');
        });
    } catch (RuntimeException $error) {
        check($error->getMessage() === 'Simulated failure', 'A failed transaction propagates its error.');
    }
    check(file_get_contents($storePath) === $beforeFailure, 'A failed transaction leaves stored documents unchanged.');
    check(count(glob($temporaryDirectory . '/.data-*') ?: []) === 0, 'Atomic writes leave no temporary files behind.');
    echo "PASS: $assertions backend assertions using isolated temporary storage.\n";
} finally {
    // Only files inside this test-created random directory are ever removed.
    foreach ([$storePath, $storePath . '.lock'] as $testFile) {
        if (is_file($testFile)) {
            unlink($testFile);
        }
    }
    foreach (glob($temporaryDirectory . '/.data-*') ?: [] as $testFile) {
        unlink($testFile);
    }
    rmdir($temporaryDirectory);
}
