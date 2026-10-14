<?php
session_start();

$adminPassword = 'TomChater18';
$storiesFile = __DIR__ . '/stories.json';
$deviceCookie = 'birthday_device_id';

if (!file_exists($storiesFile)) {
    file_put_contents($storiesFile, json_encode([], JSON_PRETTY_PRINT), LOCK_EX);
}

if (empty($_COOKIE[$deviceCookie])) {
    $generatedDeviceId = bin2hex(random_bytes(16));
    setcookie($deviceCookie, $generatedDeviceId, [
        'expires' => time() + (86400 * 365),
        'path' => '/birthday',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    $_COOKIE[$deviceCookie] = $generatedDeviceId;
}

function readStories(string $storiesFile): array
{
    $raw = @file_get_contents($storiesFile);
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function writeStories(string $storiesFile, array $stories): void
{
    file_put_contents($storiesFile, json_encode(array_values($stories), JSON_PRETTY_PRINT), LOCK_EX);
}

function redirectToSelf(): void
{
    header('Location: index.php');
    exit;
}

$flash = $_SESSION['flash'] ?? null;
$error = $_SESSION['error'] ?? null;
unset($_SESSION['flash'], $_SESSION['error']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'submit_story') {
        $story = trim($_POST['story'] ?? '');
        $deviceId = $_COOKIE[$deviceCookie] ?? '';

        if ($story === '') {
            $_SESSION['error'] = 'Please enter a story before submitting.';
        } elseif (mb_strlen($story) > 1200) {
            $_SESSION['error'] = 'Please keep the story under 1200 characters.';
        } elseif ($deviceId === '') {
            $_SESSION['error'] = 'Could not identify this device. Please refresh and try again.';
        } else {
            $stories = readStories($storiesFile);
            $existingIndex = null;

            foreach ($stories as $index => $existingStory) {
                if (($existingStory['device_id'] ?? '') === $deviceId) {
                    $existingIndex = $index;
                    break;
                }
            }

            $storyRecord = [
                'id' => $stories[$existingIndex]['id'] ?? bin2hex(random_bytes(8)),
                'device_id' => $deviceId,
                'story' => $story,
                'created_at' => $stories[$existingIndex]['created_at'] ?? gmdate('c'),
                'updated_at' => gmdate('c')
            ];

            if ($existingIndex !== null) {
                $stories[$existingIndex] = $storyRecord;
                $_SESSION['flash'] = 'Your story was updated for this device.';
            } else {
                $stories[] = $storyRecord;
                $_SESSION['flash'] = 'Story submitted. You are officially part of the chaos.';
            }

            writeStories($storiesFile, $stories);
        }

        redirectToSelf();
    }

    if ($action === 'admin_login') {
        $enteredPassword = $_POST['password'] ?? '';
        if (hash_equals($adminPassword, $enteredPassword)) {
            $_SESSION['birthday_admin'] = true;
            $_SESSION['flash'] = 'Admin mode unlocked.';
        } else {
            $_SESSION['error'] = 'Incorrect admin password.';
        }

        redirectToSelf();
    }

    if ($action === 'logout') {
        unset($_SESSION['birthday_admin']);
        $_SESSION['flash'] = 'Admin mode closed.';
        redirectToSelf();
    }

    if ($action === 'clear_stories') {
        if (!($_SESSION['birthday_admin'] ?? false)) {
            $_SESSION['error'] = 'Admin access required.';
            redirectToSelf();
        }

        writeStories($storiesFile, []);
        $_SESSION['flash'] = 'All stories cleared.';
        redirectToSelf();
    }

    if ($action === 'delete_story') {
        if (!($_SESSION['birthday_admin'] ?? false)) {
            $_SESSION['error'] = 'Admin access required.';
            redirectToSelf();
        }

        $storyId = $_POST['story_id'] ?? '';
        $stories = readStories($storiesFile);
        $filteredStories = array_values(array_filter($stories, static function (array $story) use ($storyId): bool {
            return ($story['id'] ?? '') !== $storyId;
        }));

        if (count($filteredStories) === count($stories)) {
            $_SESSION['error'] = 'Could not find that story to remove.';
        } else {
            writeStories($storiesFile, $filteredStories);
            $_SESSION['flash'] = 'Story removed.';
        }

        redirectToSelf();
    }
}

$isAdmin = (bool) ($_SESSION['birthday_admin'] ?? false);
$stories = readStories($storiesFile);
$storyCount = count($stories);
$storyJson = htmlspecialchars(json_encode($stories, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT), ENT_QUOTES, 'UTF-8');
$currentDeviceId = $_COOKIE[$deviceCookie] ?? '';
$currentDeviceStory = null;

foreach ($stories as $entry) {
    if (($entry['device_id'] ?? '') === $currentDeviceId) {
        $currentDeviceStory = $entry;
        break;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Birthday Story Game</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/birthday/styles.css">
</head>
<body>
  <main class="page">
    <section class="hero">
      <p class="eyebrow">Birthday game</p>
      <h1>Whose Story Is This?</h1>
      <p class="hero__text">
        Everyone submits one funny, wild, or unbelievable true story from their own phone. Later, unlock admin mode,
        throw it on the TV, and read the anonymous stories out loud for the room to guess.
      </p>
    </section>

    <?php if ($flash): ?>
      <section class="banner banner--success"><?= htmlspecialchars($flash, ENT_QUOTES, 'UTF-8'); ?></section>
    <?php endif; ?>

    <?php if ($error): ?>
      <section class="banner banner--error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></section>
    <?php endif; ?>

    <section class="panel panel--status">
      <div>
        <p class="status-label">Submissions received</p>
        <h2><?= $storyCount; ?> <?= $storyCount === 1 ? 'story' : 'stories'; ?></h2>
      </div>
      <div class="pill-group">
        <span class="pill"><?= $isAdmin ? 'Admin mode' : 'Guest mode'; ?></span>
      </div>
    </section>

    <?php if (!$isAdmin): ?>
      <section class="panel screen">
        <div class="screen__header">
          <div>
            <p class="step">Submit</p>
            <h3><?= $currentDeviceStory ? 'Edit your submission' : 'Send in your story'; ?></h3>
          </div>
          <p class="screen__hint">
            <?= $currentDeviceStory
              ? 'This device already has a submission. You can edit it here and save the new version.'
              : 'Keep it anonymous. No names, no obvious clues, just a ridiculous true story.'; ?>
          </p>
        </div>

        <?php if ($currentDeviceStory): ?>
          <div class="edit-note">
            <p class="edit-note__title">Existing submission found for this device</p>
            <p class="muted">Submitting again will update this story instead of creating a second one.</p>
          </div>
        <?php endif; ?>

        <form class="stack" method="post" action="index.php">
          <input type="hidden" name="action" value="submit_story">
          <label for="story-input">Your true story</label>
          <textarea id="story-input" name="story" rows="9" maxlength="1200" placeholder="Example: I got locked inside an aquarium bathroom for 40 minutes while holding a churro..." required><?= htmlspecialchars($currentDeviceStory['story'] ?? '', ENT_QUOTES, 'UTF-8'); ?></textarea>
          <div class="input-footer">
            <p class="muted">
              <?= $currentDeviceStory ? 'This update only affects the submission tied to this device.' : 'Submit from any device connected to this site.'; ?>
            </p>
            <button class="primary-button" type="submit"><?= $currentDeviceStory ? 'Update submission' : 'Submit story'; ?></button>
          </div>
        </form>
      </section>

      <section class="panel screen">
        <div class="screen__header">
          <div>
            <p class="step">Admin</p>
            <h3>Unlock TV mode</h3>
          </div>
          <p class="screen__hint">When everyone is done, enter the admin password to reveal and control the story viewer.</p>
        </div>

        <form class="stack" method="post" action="index.php">
          <input type="hidden" name="action" value="admin_login">
          <label for="password-input">Admin password</label>
          <div class="input-row">
            <input id="password-input" name="password" type="password" placeholder="Enter admin password" required>
            <button class="secondary-button" type="submit">Unlock</button>
          </div>
        </form>
      </section>
    <?php else: ?>
      <section class="panel screen">
        <div class="screen__header">
          <div>
            <p class="step">Admin</p>
            <h3>TV story viewer</h3>
          </div>
          <p class="screen__hint">Use next and previous on the screen, or the left and right arrow keys when this page is on the TV.</p>
        </div>

        <div class="admin-toolbar">
          <form method="post" action="index.php">
            <input type="hidden" name="action" value="logout">
            <button class="ghost-button" type="submit">Lock admin mode</button>
          </form>
          <form method="post" action="index.php" onsubmit="return confirm('Clear all submitted stories? This cannot be undone.');">
            <input type="hidden" name="action" value="clear_stories">
            <button class="ghost-button ghost-button--danger" type="submit">Clear all stories</button>
          </form>
        </div>

        <?php if ($storyCount === 0): ?>
          <div class="empty-state">
            <h4>No stories yet</h4>
            <p>Leave this page open or lock admin mode again while people submit from their phones.</p>
          </div>
        <?php else: ?>
          <div class="story-stage" data-stories="<?= $storyJson; ?>">
            <div class="story-stage__meta">
              <span id="story-position" class="pill">Story 1 of <?= $storyCount; ?></span>
            </div>

            <article class="story-stage__card">
              <p class="story-stage__label">Anonymous story</p>
              <blockquote id="story-display" class="story-stage__text"></blockquote>
            </article>

            <div class="story-stage__controls">
              <button id="prev-story" class="secondary-button" type="button">Previous</button>
              <button id="next-story" class="primary-button" type="button">Next</button>
            </div>

            <form class="story-stage__remove" method="post" action="index.php" onsubmit="return confirm('Remove this story? This cannot be undone.');">
              <input type="hidden" name="action" value="delete_story">
              <input id="current-story-id" type="hidden" name="story_id" value="">
              <button class="ghost-button ghost-button--danger" type="submit">Remove this story</button>
            </form>
          </div>
        <?php endif; ?>
      </section>
    <?php endif; ?>
  </main>

  <?php if ($isAdmin && $storyCount > 0): ?>
    <script src="/birthday/script.js"></script>
  <?php endif; ?>
</body>
</html>
