"""Exercise the real HTTP API, using only disposable documents created by this run.

Usage: python googledocs/tests/http_test.py http://127.0.0.1:8080/googledocs/
Requires Python 3 and curl. Also works against the deployed public demo.
"""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import uuid


BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080/googledocs/").rstrip("/")
CURL = shutil.which("curl.exe") or shutil.which("curl")
if not CURL:
    raise SystemExit("curl is required")


class Client:
    def __init__(self, directory, name):
        self.cookies = str(pathlib.Path(directory) / (name + ".cookies"))
        self.csrf = None

    def call(self, action, body=None, *, token=True, file=None, expected=200):
        command = [CURL, "--silent", "--show-error", "--max-time", "30", "-b", self.cookies,
                   "-c", self.cookies, "--write-out", "\n%{http_code}", BASE + "/api.php?action=" + action]
        if (body is not None or file is not None) and token and self.csrf:
            command += ["-H", "X-CSRF-Token: " + self.csrf]
        data = None
        if file is not None:
            command += ["-F", "file=@" + str(file)]
        elif body is not None:
            command += ["-H", "Content-Type: application/json", "--data-binary", "@-"]
            data = json.dumps(body).encode()
        result = subprocess.run(command, input=data, capture_output=True, check=True)
        raw, code = result.stdout.rsplit(b"\n", 1)
        assert int(code) == expected, f"{action}: expected {expected}, got {code.decode()}: {raw[:500]!r}"
        payload = json.loads(raw)
        if "csrf" in payload:
            self.csrf = payload["csrf"]
        return payload


def main():
    with tempfile.TemporaryDirectory(prefix="folio-http-") as directory:
        owner = Client(directory, "owner")
        editor = Client(directory, "editor")
        viewer = Client(directory, "viewer")
        for client in (owner, editor, viewer):
            result = client.call("bootstrap")
            assert len(result["users"]) == 3 and result["csrf"]
        editor.call("switch_user", {"userId": "maya"})
        viewer.call("switch_user", {"userId": "alex"})
        old_token = owner.csrf
        owner.call("switch_user", {"userId": "maya"})
        new_token = owner.csrf
        assert new_token != old_token, "Account switching must invalidate stale tabs"
        owner.csrf = old_token
        owner.call("create", {"title": "Wrong identity", "content": "<p>Must not save</p>"}, expected=403)
        owner.csrf = new_token
        owner.call("switch_user", {"userId": "tyson"})
        created = []
        try:
            owner.call("create", {"title": "No CSRF", "content": "<p>Rejected</p>"}, token=False, expected=403)
            title = "HTTP verification " + uuid.uuid4().hex[:8]
            document = owner.call("create", {"title": title, "content": '<h2>Working together</h2><p><strong>Bold</strong> and <u>underlined</u>.</p><script>alert(1)</script><img src=x onerror=alert(1)>'}, expected=201)["document"]
            doc_id = document["id"]
            created.append(doc_id)
            assert document["role"] == "owner" and document["ownerId"] == "tyson"
            assert "<strong>" in document["content"] and "<u>" in document["content"]
            assert "<script" not in document["content"] and "<img" not in document["content"]
            assert owner.call("document&id=" + doc_id)["document"]["content"] == document["content"]
            viewer.call("document&id=" + doc_id, expected=404)

            document = owner.call("share", {"id": doc_id, "userId": "alex", "role": "viewer"})["document"]
            assert viewer.call("document&id=" + doc_id)["document"]["role"] == "viewer"
            viewer.call("update", {"id": doc_id, "title": title, "content": "<p>Denied</p>", "version": document["version"]}, expected=403)
            viewer.call("share", {"id": doc_id, "userId": "maya", "role": "editor"}, expected=403)
            document = owner.call("share", {"id": doc_id, "userId": "maya", "role": "editor"})["document"]
            stale_version = document["version"]
            document = editor.call("update", {"id": doc_id, "title": title + " renamed", "content": "<h2>Saved by Maya</h2><ol><li>One</li><li>Two</li></ol>", "version": stale_version})["document"]
            assert document["role"] == "editor" and document["version"] > stale_version
            conflict = owner.call("update", {"id": doc_id, "title": title, "content": "<p>Stale update</p>", "version": stale_version}, expected=409)
            assert conflict["document"]["content"] == document["content"]
            assert owner.call("document&id=" + doc_id)["document"]["title"].endswith(" renamed")
            shared_list = editor.call("documents")["documents"]
            assert any(item["id"] == doc_id and item["role"] == "editor" for item in shared_list)
            editor.call("delete", {"id": doc_id}, expected=403)
            owner.call("unshare", {"id": doc_id, "userId": "alex"})
            viewer.call("document&id=" + doc_id, expected=404)
            assert all(item["id"] != doc_id for item in viewer.call("documents")["documents"])

            imported_file = pathlib.Path(directory) / "Meeting notes.txt"
            imported_file.write_text("Résumé review\n\n<script>literal text, not executable</script>", encoding="utf-8")
            imported = owner.call("import", file=imported_file, expected=201)["document"]
            created.append(imported["id"])
            assert "Résumé review" in imported["content"] and "&lt;script&gt;" in imported["content"]
            invalid_file = pathlib.Path(directory) / "unsupported.exe"
            invalid_file.write_text("not a supported import", encoding="utf-8")
            owner.call("import", file=invalid_file, expected=422)
            owner.call("create", {"title": "x" * 201, "content": "<p>Title too long</p>"}, expected=422)
            print("PASS: CSRF, rich-text persistence, isolation, viewer/editor permissions, sharing/revocation, optimistic conflicts, import validation, rename and delete authorization.")
        finally:
            for doc_id in reversed(created):
                owner.call("delete", {"id": doc_id})
        print("PASS: All documents created by this test were cleaned up.")


if __name__ == "__main__":
    main()
