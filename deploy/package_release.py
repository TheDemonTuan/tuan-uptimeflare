#!/usr/bin/env python3
"""Package compiled code only; credentials and deployment policy stay in vps-deploy."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil

REPOSITORY = "TheDemonTuan/tuan-uptimeflare"
MODULE_SUFFIXES = {".js", ".mjs", ".cjs", ".wasm", ".bin", ".txt", ".html", ".json"}
FORBIDDEN_NAMES = {"wrangler.toml", "wrangler.json", "wrangler.jsonc", "package.json", "package-lock.json", "SHA256SUMS"}


def copy_tree(source: Path, destination: Path, *, modules: bool) -> None:
    if not source.is_dir() or source.is_symlink():
        raise ValueError(f"Missing compiled directory: {source}")
    for path in sorted(source.rglob("*")):
        relative = path.relative_to(source)
        if path.is_symlink():
            raise ValueError(f"Symlink forbidden: {relative}")
        if path.is_dir():
            continue
        if not path.is_file() or any(c in relative.as_posix() for c in "\r\n\\"):
            raise ValueError(f"Invalid release file: {relative}")
        if path.suffix == ".map" or (modules and path.name == "README.md"):
            continue
        if any(part.startswith(".env") or part == "node_modules" for part in relative.parts):
            raise ValueError(f"Private source forbidden: {relative}")
        if path.name in FORBIDDEN_NAMES or path.suffix in {".ts", ".tsx", ".tf", ".tfstate", ".pem", ".key"}:
            raise ValueError(f"Source/configuration forbidden: {relative}")
        if modules and path.suffix not in MODULE_SUFFIXES:
            raise ValueError(f"Unknown compiled module type: {relative}")
        if not modules and path.stat().st_size > 25 * 1024 * 1024:
            raise ValueError(f"Asset exceeds Cloudflare limit: {relative}")
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)


def package(root: Path, output: Path, sha: str) -> None:
    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("Expected a full lowercase source SHA")
    if output.exists():
        raise ValueError("Release output must not exist")
    for required in ("worker/dist/index.js", "web/dist/worker.js"):
        path = root / required
        if not path.is_file() or path.is_symlink() or not path.stat().st_size:
            raise ValueError(f"Missing compiled entry: {required}")
    if not any((root / ".open-next/assets").rglob("*.js")):
        raise ValueError("Missing OpenNext browser assets")
    output.mkdir(parents=True)
    copy_tree(root / "worker/dist", output / "worker/dist", modules=True)
    copy_tree(root / "web/dist", output / "web/dist", modules=True)
    copy_tree(root / ".open-next/assets", output / ".open-next/assets", modules=False)
    for reserved in ("__release", "__monitor_release"):
        if (output / ".open-next/assets" / reserved).exists():
            raise ValueError("Reserved release endpoint appears in assets")
    (output / "__release").write_text(sha + "\n", encoding="utf-8", newline="\n")
    manifest = {"app": "uptimeflare", "source_repository": REPOSITORY, "source_sha": sha}
    (output / "manifest.json").write_text(json.dumps(manifest, sort_keys=True) + "\n", encoding="utf-8", newline="\n")
    checksums = []
    for path in sorted(output.rglob("*")):
        if path.is_file():
            checksums.append(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(output).as_posix()}\n")
    (output / "SHA256SUMS").write_text("".join(checksums), encoding="utf-8", newline="\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--sha", required=True)
    args = parser.parse_args()
    try:
        package(args.root.resolve(), args.output.resolve(), args.sha)
    except (OSError, ValueError) as exc:
        parser.exit(1, f"Release packaging failed: {exc}\n")


if __name__ == "__main__":
    main()
