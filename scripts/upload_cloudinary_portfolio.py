#!/usr/bin/env python3
"""Upload a mirrored portfolio JPEG tree to Cloudinary."""

from __future__ import annotations

import argparse
import base64
import concurrent.futures
import hashlib
import json
import mimetypes
import os
import re
import secrets
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key.strip()] = value
    return values


def credentials(env_path: Path) -> tuple[str, str, str]:
    local = load_env(env_path)
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME") or local.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY") or local.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET") or local.get("CLOUDINARY_API_SECRET")
    if not all((cloud_name, api_key, api_secret)):
        raise SystemExit("Configuration Cloudinary incomplète dans .env.local")
    return cloud_name, api_key, api_secret


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9_-]+", "-", ascii_value).strip("-") or "dossier"


def signed_params(params: dict[str, str], api_secret: str) -> str:
    payload = "&".join(f"{key}={params[key]}" for key in sorted(params) if params[key] != "")
    return hashlib.sha1(f"{payload}{api_secret}".encode("utf-8")).hexdigest()


def multipart_body(fields: dict[str, str], file_path: Path) -> tuple[bytes, str]:
    boundary = f"----CodexCloudinary{secrets.token_hex(12)}"
    chunks: list[bytes] = []
    for key, value in fields.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode(),
                str(value).encode("utf-8"),
                b"\r\n",
            ]
        )
    mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    chunks.extend(
        [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="file"; filename="{file_path.name}"\r\n'.encode(),
            f"Content-Type: {mime_type}\r\n\r\n".encode(),
            file_path.read_bytes(),
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    return b"".join(chunks), boundary


def admin_request(cloud_name: str, api_key: str, api_secret: str, path: str) -> dict:
    token = base64.b64encode(f"{api_key}:{api_secret}".encode()).decode()
    request = urllib.request.Request(
        f"https://api.cloudinary.com/v1_1/{cloud_name}/{path}",
        headers={"Authorization": f"Basic {token}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def remote_public_id(source_root: Path, image: Path, destination_root: str) -> str:
    relative = image.relative_to(source_root)
    folder_parts = [slugify(part) for part in relative.parent.parts]
    parts = [destination_root.strip("/"), *folder_parts, slugify(relative.stem)]
    return "/".join(part for part in parts if part)


def upload_one(
    image: Path,
    source_root: Path,
    destination_root: str,
    cloud_name: str,
    api_key: str,
    api_secret: str,
) -> dict:
    public_id = remote_public_id(source_root, image, destination_root)
    last_error: Exception | None = None
    for attempt in range(1, 4):
        timestamp = str(int(time.time()))
        parameters = {
            "invalidate": "true",
            "overwrite": "true",
            "public_id": public_id,
            "timestamp": timestamp,
            "unique_filename": "false",
        }
        fields = {
            **parameters,
            "api_key": api_key,
            "signature": signed_params(parameters, api_secret),
        }
        body, boundary = multipart_body(fields, image)
        request = urllib.request.Request(
            f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload",
            data=body,
            headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "Content-Length": str(len(body)),
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                payload = json.load(response)
            return {
                "local": str(image.relative_to(source_root)),
                "public_id": payload["public_id"],
                "asset_id": payload.get("asset_id"),
                "secure_url": payload.get("secure_url"),
                "bytes": payload.get("bytes"),
                "width": payload.get("width"),
                "height": payload.get("height"),
                "format": payload.get("format"),
                "version": payload.get("version"),
            }
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:500]
            last_error = RuntimeError(f"HTTP {error.code}: {detail}")
            if error.code not in {408, 429, 500, 502, 503, 504}:
                break
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = error
        if attempt < 3:
            time.sleep(2**attempt)
    raise RuntimeError(f"Échec de {image.name}: {last_error}")


def write_report(report_path: Path, report: dict) -> None:
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    text_path = report_path.with_suffix(".txt")
    lines = [
        "RAPPORT CLOUDINARY",
        f"Date : {report['date']}",
        f"Cloud : {report['cloud_name']}",
        f"Dossier distant : {report['destination_root']}",
        f"Images attendues : {report['expected']}",
        f"Images téléversées : {report['uploaded']}",
        f"Erreurs : {len(report['errors'])}",
        "",
        "Erreurs :",
    ]
    if report["errors"]:
        lines.extend(f"- {item['local']} : {item['error']}" for item in report["errors"])
    else:
        lines.append("- Aucune")
    text_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--env", type=Path, required=True)
    parser.add_argument("--destination", default="portfolio/file-convertis")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--ping", action="store_true")
    args = parser.parse_args()

    cloud_name, api_key, api_secret = credentials(args.env)
    if args.ping:
        payload = admin_request(cloud_name, api_key, api_secret, "resources/image?max_results=1")
        print(json.dumps({"connected": True, "cloud_name": cloud_name, "sample_count": len(payload.get("resources", []))}))
        return 0

    source_root = args.source.resolve()
    images = sorted(source_root.rglob("*.jpg"), key=lambda path: str(path).casefold())
    if not images:
        raise SystemExit("Aucune image JPG trouvée")

    results: list[dict] = []
    errors: list[dict[str, str]] = []
    completed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {
            executor.submit(
                upload_one,
                image,
                source_root,
                args.destination,
                cloud_name,
                api_key,
                api_secret,
            ): image
            for image in images
        }
        for future in concurrent.futures.as_completed(futures):
            image = futures[future]
            completed += 1
            try:
                result = future.result()
                results.append(result)
                print(f"[{completed}/{len(images)}] OK {result['local']}", flush=True)
            except Exception as error:
                errors.append({"local": str(image.relative_to(source_root)), "error": str(error)})
                print(f"[{completed}/{len(images)}] ERREUR {image.relative_to(source_root)}", flush=True)

    report = {
        "date": datetime.now().astimezone().isoformat(timespec="seconds"),
        "cloud_name": cloud_name,
        "destination_root": args.destination,
        "expected": len(images),
        "uploaded": len(results),
        "errors": errors,
        "assets": sorted(results, key=lambda item: item["public_id"]),
    }
    report_path = args.report or source_root.parent / "RAPPORT_CLOUDINARY_UPLOAD.json"
    write_report(report_path, report)
    print(json.dumps({key: value for key, value in report.items() if key != "assets"}, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
