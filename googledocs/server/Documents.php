<?php
declare(strict_types=1);

namespace Folio;

use DOMDocument;
use DOMElement;
use DOMNode;
use RuntimeException;

final class ApiError extends RuntimeException
{
    public int $status;
    public string $errorCode;
    public array $extra;

    public function __construct(int $status, string $errorCode, string $message, array $extra = [])
    {
        parent::__construct($message);
        $this->status = $status;
        $this->errorCode = $errorCode;
        $this->extra = $extra;
    }
}

final class Documents
{
    public const MAX_IMPORT_BYTES = 1048576;
    public const MAX_CONTENT_BYTES = 7340032;
    private DocumentStore $store;

    public function __construct(DocumentStore $store)
    {
        $this->store = $store;
    }

    /** All authorization is performed against the current locked state. */
    public function handle(string $action, array $input, string $userId): array
    {
        return $this->store->transaction(function (array &$data) use ($action, $input, $userId): array {
            if (!isset($data['users'][$userId])) {
                throw new ApiError(401, 'invalid_user', 'Choose a valid demo account.');
            }
            if ($action === 'bootstrap' || $action === 'switch_user') {
                return ['user' => $data['users'][$userId], 'users' => array_values($data['users']),
                    'documents' => $this->summaries($data, $userId)];
            }
            if ($action === 'documents') {
                return ['documents' => $this->summaries($data, $userId)];
            }
            if ($action === 'create' || $action === 'import') {
                $title = self::title($input['title'] ?? 'Untitled document');
                $content = $action === 'import'
                    ? self::importText($input['text'] ?? null)
                    : self::sanitize($input['content'] ?? '');
                if (count($data['documents']) >= 1000) {
                    throw new ApiError(409, 'workspace_full', 'This demo workspace has reached its 1,000-document limit.');
                }
                $id = bin2hex(random_bytes(12));
                $now = gmdate('Y-m-d\TH:i:s\Z');
                $data['documents'][$id] = ['id' => $id, 'title' => $title, 'content' => $content,
                    'ownerId' => $userId, 'createdAt' => $now, 'updatedAt' => $now, 'version' => 1, 'shares' => []];
                return ['document' => $this->present($data['documents'][$id], $data, $userId)];
            }

            $id = $input['id'] ?? null;
            if (!is_string($id) || !isset($data['documents'][$id])) {
                throw new ApiError(404, 'not_found', 'This document could not be found.');
            }
            $document =& $data['documents'][$id];
            $role = self::role($document, $userId);
            // Do not reveal even the title of a document that is not shared with this account.
            if ($role === null) {
                throw new ApiError(404, 'not_found', 'This document could not be found.');
            }
            if ($action === 'document') {
                return ['document' => $this->present($document, $data, $userId)];
            }
            if ($action === 'update') {
                if ($role !== 'owner' && $role !== 'editor') {
                    throw new ApiError(403, 'forbidden', 'You have view-only access to this document.');
                }
                if (!isset($input['version']) || !is_int($input['version'])) {
                    throw new ApiError(422, 'validation_error', 'A document version is required to save changes.');
                }
                if ($input['version'] !== $document['version']) {
                    throw new ApiError(409, 'version_conflict', 'This document changed in another session. Review the latest version before saving.',
                        ['document' => $this->present($document, $data, $userId)]);
                }
                $title = self::title($input['title'] ?? null);
                $content = self::sanitize($input['content'] ?? null);
                $document['title'] = $title;
                $document['content'] = $content;
            } elseif ($action === 'delete' || $action === 'share' || $action === 'unshare') {
                if ($role !== 'owner') {
                    throw new ApiError(403, 'forbidden', 'Only the owner can manage sharing or delete this document.');
                }
                if ($action === 'delete') {
                    unset($data['documents'][$id]);
                    return ['ok' => true];
                }
                $target = $input['userId'] ?? null;
                if (!is_string($target) || !isset($data['users'][$target]) || $target === $document['ownerId']) {
                    throw new ApiError(422, 'validation_error', 'Choose another demo account to share with.');
                }
                if ($action === 'share') {
                    $shareRole = $input['role'] ?? null;
                    if ($shareRole !== 'editor' && $shareRole !== 'viewer') {
                        throw new ApiError(422, 'validation_error', 'Choose either editor or viewer access.');
                    }
                    $document['shares'][$target] = $shareRole;
                } else {
                    unset($document['shares'][$target]);
                }
            } else {
                throw new ApiError(404, 'unknown_action', 'This action is not available.');
            }
            $document['version']++;
            $document['updatedAt'] = gmdate('Y-m-d\TH:i:s\Z');
            return ['document' => $this->present($document, $data, $userId)];
        });
    }

    private static function role(array $document, string $userId): ?string
    {
        return $document['ownerId'] === $userId ? 'owner' : ($document['shares'][$userId] ?? null);
    }

    private function present(array $document, array $data, string $userId, bool $summary = false): array
    {
        $result = [
            'id' => $document['id'], 'title' => $document['title'],
            'ownerId' => $document['ownerId'], 'ownerName' => $data['users'][$document['ownerId']]['name'],
            'createdAt' => $document['createdAt'], 'updatedAt' => $document['updatedAt'],
            'version' => $document['version'], 'role' => self::role($document, $userId), 'sharedWith' => [],
        ];
        foreach ($document['shares'] as $sharedId => $sharedRole) {
            $user = $data['users'][$sharedId];
            $result['sharedWith'][] = ['userId' => $sharedId, 'name' => $user['name'], 'email' => $user['email'], 'role' => $sharedRole];
        }
        if ($summary) {
            $plain = self::plainText($document['content']);
            preg_match('/^.{0,180}/us', $plain, $match);
            $result['excerpt'] = ($match[0] ?? '') . (strlen($plain) > strlen($match[0] ?? '') ? '…' : '');
            $result['wordCount'] = preg_match_all('/[\p{L}\p{N}]+(?:[\x{2019}\x{0027}-][\p{L}\p{N}]+)*/u', $plain);
        } else {
            $result['content'] = $document['content'];
        }
        return $result;
    }

    private function summaries(array $data, string $userId): array
    {
        $documents = [];
        foreach ($data['documents'] as $document) {
            if (self::role($document, $userId) !== null) {
                $documents[] = $this->present($document, $data, $userId, true);
            }
        }
        usort($documents, static function (array $a, array $b): int {
            return strcmp($b['updatedAt'], $a['updatedAt']) ?: strcmp($a['title'], $b['title']);
        });
        return $documents;
    }

    private static function plainText(string $html): string
    {
        $spaced = preg_replace('/<(?:br\b[^>]*|\/(?:p|h[1-3]|li|blockquote|pre|div))>/i', ' ', $html);
        $plain = html_entity_decode(strip_tags($spaced ?? $html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return trim(preg_replace('/\s+/u', ' ', $plain) ?? '');
    }

    private static function title($value): string
    {
        if (!is_string($value) || preg_match('//u', $value) !== 1) {
            throw new ApiError(422, 'validation_error', 'The document title must be valid text.');
        }
        $title = trim(preg_replace('/[\x00-\x1F\x7F]/u', ' ', $value) ?? '');
        if ($title === '') {
            return 'Untitled document';
        }
        if (preg_match('/^.{1,200}$/us', $title) !== 1) {
            throw new ApiError(422, 'validation_error', 'Keep document titles to 200 characters or fewer.');
        }
        return $title;
    }

    public static function importText($text): string
    {
        if (!is_string($text) || strlen($text) > self::MAX_IMPORT_BYTES) {
            throw new ApiError(413, 'file_too_large', 'Choose a text or Markdown file of 1 MB or less.');
        }
        if (preg_match('//u', $text) !== 1 || preg_match('/[\x00-\x08\x0B\x0E-\x1F\x7F]/', $text) === 1) {
            throw new ApiError(422, 'invalid_file', 'The file must contain UTF-8 plain text.');
        }
        if (substr($text, 0, 3) === "\xEF\xBB\xBF") {
            $text = substr($text, 3);
        }
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $paragraphs = preg_split('/\n[ \t]*\n+/', $text) ?: [''];
        $html = '';
        foreach ($paragraphs as $paragraph) {
            $escaped = htmlspecialchars($paragraph, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
            $html .= '<p>' . str_replace("\n", '<br>', $escaped) . '</p>';
        }
        return $html;
    }

    /** Rebuild trusted HTML from an allowlist; never retain arbitrary attributes. */
    public static function sanitize($html): string
    {
        if (!is_string($html) || strlen($html) > self::MAX_CONTENT_BYTES) {
            throw new ApiError(413, 'content_too_large', 'This document is too large to save.');
        }
        if (preg_match('//u', $html) !== 1 || strpos($html, "\0") !== false) {
            throw new ApiError(422, 'validation_error', 'The document must contain valid UTF-8 text.');
        }
        if ($html === '') {
            return '';
        }
        if (!class_exists(DOMDocument::class)) {
            throw new RuntimeException('The PHP DOM extension is required.');
        }
        $dom = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        try {
            $loaded = $dom->loadHTML('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' . $html . '</body></html>', LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
            if (!$loaded) {
                throw new ApiError(422, 'validation_error', 'The document formatting could not be read.');
            }
            $body = $dom->getElementsByTagName('body')->item(0);
            $clean = $body === null ? '' : self::cleanChildren($body);
            if (strlen($clean) > self::MAX_CONTENT_BYTES) {
                throw new ApiError(413, 'content_too_large', 'This document is too large to save.');
            }
            return $clean;
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
    }

    private static function cleanChildren(DOMNode $parent): string
    {
        $output = '';
        foreach ($parent->childNodes as $node) {
            if ($node->nodeType === XML_TEXT_NODE) {
                $output .= htmlspecialchars($node->nodeValue ?? '', ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
                continue;
            }
            if (!($node instanceof DOMElement)) {
                continue;
            }
            $tag = strtolower($node->tagName);
            if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'noscript', 'head', 'meta', 'link', 'base', 'form', 'input', 'button', 'textarea', 'select'], true)) {
                continue;
            }
            $children = self::cleanChildren($node);
            if (!in_array($tag, ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'a'], true)) {
                // Contenteditable may emit divs for new paragraphs.
                $output .= $tag === 'div' ? '<p>' . $children . '</p>' : $children;
                continue;
            }
            $attributes = '';
            if ($tag === 'a') {
                $href = trim($node->getAttribute('href'));
                if (preg_match('/^(?:https?:\/\/|mailto:)/i', $href) === 1 && preg_match('/[\x00-\x20\x7F]/', $href) !== 1) {
                    $attributes = ' href="' . htmlspecialchars($href, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8') . '" target="_blank" rel="noopener noreferrer"';
                }
            } elseif ($tag === 'ol' && preg_match('/^-?\d{1,6}$/', $node->getAttribute('start')) === 1) {
                $attributes = ' start="' . (int) $node->getAttribute('start') . '"';
            }
            $output .= '<' . $tag . $attributes . '>';
            if ($tag !== 'br' && $tag !== 'hr') {
                $output .= $children . '</' . $tag . '>';
            }
        }
        return $output;
    }
}
