<?php
declare(strict_types=1);

namespace Folio;

use RuntimeException;
use Throwable;

/** A single-host store: one advisory lock protects every read/modify/write cycle. */
final class DocumentStore
{
    public const PREFIX = "<?php exit; ?>\n";
    private string $path;

    public function __construct(string $path)
    {
        $this->path = $path;
    }

    public function transaction(callable $callback)
    {
        $directory = dirname($this->path);
        if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
            throw new RuntimeException('Unable to create the document storage directory.');
        }
        $lock = fopen($this->path . '.lock', 'c');
        if ($lock === false || !flock($lock, LOCK_EX)) {
            if (is_resource($lock)) {
                fclose($lock);
            }
            throw new RuntimeException('Unable to lock document storage.');
        }
        @chmod($this->path . '.lock', 0600);
        try {
            $isNew = !is_file($this->path);
            $data = $isNew ? self::seed() : $this->read();
            $before = $data;
            $result = $callback($data);
            if ($isNew || $before !== $data) {
                $this->write($data);
            }
            return $result;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private function read(): array
    {
        $raw = file_get_contents($this->path);
        if ($raw === false || strncmp($raw, self::PREFIX, strlen(self::PREFIX)) !== 0) {
            throw new RuntimeException('Document storage has an invalid format.');
        }
        $data = json_decode(substr($raw, strlen(self::PREFIX)), true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($data) || !isset($data['users'], $data['documents']) || !is_array($data['documents'])) {
            throw new RuntimeException('Document storage has an invalid structure.');
        }
        return $data;
    }

    private function write(array $data): void
    {
        $encoded = self::PREFIX . json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        // The temporary file is also PHP-protected, even if Apache ignores .htaccess.
        $temporary = dirname($this->path) . '/.data-' . bin2hex(random_bytes(12)) . '.tmp.php';
        $handle = fopen($temporary, 'x+b');
        if ($handle === false) {
            throw new RuntimeException('Unable to open temporary document storage.');
        }
        @chmod($temporary, 0600);
        try {
            $offset = 0;
            $length = strlen($encoded);
            while ($offset < $length) {
                $written = fwrite($handle, substr($encoded, $offset));
                if ($written === false || $written === 0) {
                    throw new RuntimeException('Unable to write document storage.');
                }
                $offset += $written;
            }
            if (!fflush($handle)) {
                throw new RuntimeException('Unable to flush document storage.');
            }
            if (function_exists('fsync')) {
                fsync($handle);
            }
            fclose($handle);
            $handle = null;
            if (!rename($temporary, $this->path)) {
                throw new RuntimeException('Unable to replace document storage.');
            }
            @chmod($this->path, 0600);
        } catch (Throwable $error) {
            if (is_resource($handle)) {
                fclose($handle);
            }
            if (is_file($temporary)) {
                @unlink($temporary);
            }
            throw $error;
        }
    }

    private static function seed(): array
    {
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $document = static function (string $id, string $title, string $content, string $owner, array $shares) use ($now): array {
            return ['id' => $id, 'title' => $title, 'content' => $content, 'ownerId' => $owner,
                'createdAt' => $now, 'updatedAt' => $now, 'version' => 1, 'shares' => $shares];
        };
        return [
            'schemaVersion' => 1,
            'users' => [
                'tyson' => ['id' => 'tyson', 'name' => 'Tyson Thompson', 'email' => 'tyson@example.test'],
                'maya' => ['id' => 'maya', 'name' => 'Maya Chen', 'email' => 'maya@example.test'],
                'alex' => ['id' => 'alex', 'name' => 'Alex Morgan', 'email' => 'alex@example.test'],
            ],
            'documents' => [
                'welcome' => $document('welcome', 'A little space for big ideas', '<h1>A little space for big ideas</h1><p>Welcome to your workspace. A home for the first draft, the next plan, and the ideas worth keeping.</p><h2>Make yourself at home</h2><p>Start a document, bring in a text file, or pick up where you left off. Your changes are saved as you write.</p><ul><li><strong>Write freely.</strong> Use headings, lists, and a little emphasis to bring your thoughts together.</li><li><strong>Work together.</strong> Share a document with a teammate as an editor or a viewer.</li><li><strong>Keep it simple.</strong> Find your documents from the library whenever inspiration strikes.</li></ul><blockquote>Every finished thought starts with an unfinished sentence.</blockquote><p>This is a public demo workspace with fictional accounts. Switch accounts to explore how sharing works.</p>', 'tyson', []),
                'product-notes' => $document('product-notes', 'Product thinking & small details', '<h1>Product thinking &amp; small details</h1><p>A few principles for making useful things feel effortless.</p><h2>Start with the moment</h2><p>What is someone trying to do right now? Give that action room to breathe, then make the next step obvious.</p><h2>Details worth caring about</h2><ul><li>Clear language before clever language.</li><li>A reassuring save state after every change.</li><li>Empty states that invite a useful first action.</li><li>Keyboard shortcuts that respect familiar habits.</li></ul><h2>Next conversation</h2><p>Maya and I will review the first-run experience and choose one small improvement to ship this week.</p>', 'tyson', ['maya' => 'editor']),
                'team-offsite' => $document('team-offsite', 'Team offsite — a day to reconnect', '<h1>Team offsite</h1><p><strong>Our aim:</strong> make space for good conversations, shared learning, and a little fresh air.</p><h2>A loose agenda</h2><ol><li>Morning coffee and a check-in: what is giving you energy?</li><li>A short show-and-tell of something each person has learned.</li><li>Lunch together, away from our screens.</li><li>A walking conversation about what we want to build next.</li></ol><h2>Before we meet</h2><p>Bring one idea, one question, and a recommendation you would give a friend. Keep the slides at home.</p><blockquote>The best outcome is understanding each other a little better.</blockquote>', 'maya', ['tyson' => 'editor', 'alex' => 'viewer']),
                'reading-list' => $document('reading-list', 'Reading list for curious people', '<h1>Reading list for curious people</h1><p>A small collection of topics to explore when there is room to wander.</p><h2>On the list</h2><ul><li><strong>Design:</strong> how everyday objects teach us to use them.</li><li><strong>Writing:</strong> finding the simplest honest sentence.</li><li><strong>Teams:</strong> the habits that make thoughtful feedback possible.</li><li><strong>Technology:</strong> building tools that give people more agency.</li></ul><p>Add a note after each read: one thing you learned, and one thing you want to try.</p>', 'alex', ['tyson' => 'viewer', 'maya' => 'viewer']),
            ],
        ];
    }
}
