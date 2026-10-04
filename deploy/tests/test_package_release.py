import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("package_release", Path(__file__).parents[1] / "package_release.py")
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)
SHA = "a" * 40


class PackagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "source"
        self.output = Path(self.temp.name) / "release"
        self.put("worker/dist/index.js", "export default {}")
        self.put("web/dist/worker.js", "export default {}")
        self.put("web/dist/module.wasm", b"\x00asm")
        self.put(".open-next/assets/_next/static/chunk.js", "console.log('browser')")
        self.put(".open-next/assets/logo.svg", "<svg/>")

    def put(self, name, data):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data if isinstance(data, bytes) else data.encode())
        return path

    def test_exhaustive_immutable_manifest_and_modules(self):
        self.put("web/dist/worker.js.map", "private source")
        self.put("web/dist/README.md", "Generated Wrangler output metadata")
        self.put("worker/dist/README.md", "Generated Wrangler output metadata")
        packager.package(self.root, self.output, SHA)
        manifest = json.loads((self.output / "manifest.json").read_text())
        self.assertEqual(manifest, {"app": "uptimeflare", "source_repository": packager.REPOSITORY, "source_sha": SHA})
        self.assertEqual((self.output / "__release").read_text(), SHA + "\n")
        self.assertEqual((self.output / "web/dist/module.wasm").read_bytes(), b"\x00asm")
        listed = {}
        for line in (self.output / "SHA256SUMS").read_text().splitlines():
            digest, name = line.split("  ", 1)
            listed[name] = digest
        actual = {path.relative_to(self.output).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
                  for path in self.output.rglob("*") if path.is_file() and path.name != "SHA256SUMS"}
        self.assertEqual(listed, actual)
        self.assertNotIn("web/dist/worker.js.map", listed)
        self.assertNotIn("web/dist/README.md", listed)
        self.assertNotIn("worker/dist/README.md", listed)
        with self.assertRaises(ValueError):
            packager.package(self.root, self.output, SHA)

    def test_rejects_source_config_and_credentials(self):
        for name in ("web/dist/.env.production", "web/dist/wrangler.toml", "web/dist/source.ts", ".open-next/assets/private.key"):
            with self.subTest(name=name), tempfile.TemporaryDirectory() as temp:
                path = self.put(name, "private")
                with self.assertRaises(ValueError):
                    packager.package(self.root, Path(temp) / "release", SHA)
                path.unlink()

    def test_requires_both_compiled_entries_and_real_sha(self):
        with self.assertRaises(ValueError):
            packager.package(self.root, self.output, "main")
        (self.root / "worker/dist/index.js").unlink()
        with self.assertRaises(ValueError):
            packager.package(self.root, self.output, SHA)
        self.assertFalse(self.output.exists())

    def test_rejects_symlink_and_reserved_asset_identity(self):
        target = self.root / "web/dist/linked.js"
        try:
            target.symlink_to(self.root / "worker/dist/index.js")
        except OSError:
            self.skipTest("Symlinks require operating-system privileges")
        with self.assertRaises(ValueError):
            packager.package(self.root, self.output, SHA)
        target.unlink()
        self.put(".open-next/assets/__release", "spoofed")
        with tempfile.TemporaryDirectory() as temp, self.assertRaises(ValueError):
            packager.package(self.root, Path(temp) / "release", SHA)


if __name__ == "__main__":
    unittest.main()
