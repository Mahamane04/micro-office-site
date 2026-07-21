#!/usr/bin/env python3
"""Move existing Cloudinary assets into project asset folders without reuploading."""

from __future__ import annotations

import argparse
import base64
import concurrent.futures
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime
from pathlib import Path

from group_portfolio_by_project import classify, slug
from upload_cloudinary_portfolio import credentials


def authorization(api_key: str, api_secret: str) -> str:
    token = base64.b64encode(f"{api_key}:{api_secret}".encode()).decode()
    return f"Basic {token}"


def request_json(
    url: str,
    api_key: str,
    api_secret: str,
    *,
    method: str = "GET",
    fields: dict[str, str] | None = None,
    timeout: int = 60,
) -> dict:
    data = urllib.parse.urlencode(fields).encode() if fields is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": authorization(api_key, api_secret),
            "Accept": "application/json",
            **({"Content-Type": "application/x-www-form-urlencoded"} if data else {}),
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def retry_request(*args, **kwargs) -> dict:
    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            return request_json(*args, **kwargs)
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:500]
            last_error = RuntimeError(f"HTTP {error.code}: {detail}")
            if error.code not in {408, 429, 500, 502, 503, 504}:
                raise last_error
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = error
        if attempt < 3:
            time.sleep(2**attempt)
    raise RuntimeError(str(last_error))


def target_folder(local_path: str, root: str) -> tuple[str, str, str]:
    relative = Path(local_path)
    project, category = classify(relative)
    folder = "/".join([root.strip("/"), slug(project), slug(category)])
    return project, category, folder


def all_folder_paths(targets: list[str]) -> list[str]:
    folders: set[str] = set()
    for target in targets:
        parts = target.split("/")
        for length in range(1, len(parts) + 1):
            folders.add("/".join(parts[:length]))
    return sorted(folders, key=lambda item: (item.count("/"), item))


def create_folder(
    cloud_name: str,
    api_key: str,
    api_secret: str,
    folder: str,
) -> None:
    encoded = urllib.parse.quote(folder, safe="/")
    url = f"https://api.cloudinary.com/v1_1/{cloud_name}/folders/{encoded}"
    try:
        retry_request(url, api_key, api_secret, method="POST", fields={})
    except RuntimeError as error:
        if "already exists" not in str(error).lower() and "409" not in str(error):
            raise


def move_asset(
    cloud_name: str,
    api_key: str,
    api_secret: str,
    asset: dict,
    destination_root: str,
) -> dict:
    project, category, folder = target_folder(asset["local"], destination_root)
    asset_id = asset.get("asset_id")
    if not asset_id:
        raise ValueError(f"asset_id absent pour {asset['local']}")
    encoded_asset_id = urllib.parse.quote(asset_id, safe="")
    url = f"https://api.cloudinary.com/v1_1/{cloud_name}/resources/{encoded_asset_id}"
    response = retry_request(
        url,
        api_key,
        api_secret,
        method="PUT",
        fields={
            "asset_folder": folder,
            "display_name": Path(asset["local"]).stem,
            "unique_display_name": "false",
        },
    )
    returned_public_id = response.get("public_id", asset["public_id"])
    if returned_public_id != asset["public_id"]:
        raise RuntimeError(f"Le public_id a changé pour {asset['local']}")
    return {
        "local": asset["local"],
        "asset_id": asset_id,
        "public_id": asset["public_id"],
        "secure_url": asset.get("secure_url"),
        "project": project,
        "category": category,
        "asset_folder": response.get("asset_folder", folder),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", type=Path, required=True)
    parser.add_argument("--upload-report", type=Path, required=True)
    parser.add_argument("--destination", default="portfolio/par-projet")
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    cloud_name, api_key, api_secret = credentials(args.env)
    upload_report = json.loads(args.upload_report.read_text(encoding="utf-8"))
    assets = upload_report.get("assets", [])
    if len(assets) != 324:
        raise SystemExit(f"324 assets attendus, {len(assets)} trouvés dans le rapport")

    plan = []
    for asset in assets:
        project, category, folder = target_folder(asset["local"], args.destination)
        plan.append(
            {
                "local": asset["local"],
                "asset_id": asset.get("asset_id"),
                "public_id": asset["public_id"],
                "project": project,
                "category": category,
                "asset_folder": folder,
            }
        )
    if any(not item["asset_id"] for item in plan):
        raise SystemExit("Un ou plusieurs asset_id sont absents")

    if args.dry_run:
        counts = Counter(item["project"] for item in plan)
        print(json.dumps({"assets": len(plan), "projects": dict(sorted(counts.items()))}, ensure_ascii=False, indent=2))
        return 0

    folders = all_folder_paths([item["asset_folder"] for item in plan])
    for folder in folders:
        create_folder(cloud_name, api_key, api_secret, folder)
        print(f"DOSSIER {folder}", flush=True)

    results: list[dict] = []
    errors: list[dict[str, str]] = []
    completed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {
            executor.submit(
                move_asset,
                cloud_name,
                api_key,
                api_secret,
                asset,
                args.destination,
            ): asset
            for asset in assets
        }
        for future in concurrent.futures.as_completed(futures):
            asset = futures[future]
            completed += 1
            try:
                result = future.result()
                results.append(result)
                print(f"[{completed}/{len(assets)}] OK {result['local']}", flush=True)
            except Exception as error:
                errors.append({"local": asset["local"], "error": str(error)})
                print(f"[{completed}/{len(assets)}] ERREUR {asset['local']}", flush=True)

    report = {
        "date": datetime.now().astimezone().isoformat(timespec="seconds"),
        "cloud_name": cloud_name,
        "destination_root": args.destination,
        "expected": len(assets),
        "moved": len(results),
        "unchanged_public_ids": sum(
            result["public_id"] == next(a["public_id"] for a in assets if a["asset_id"] == result["asset_id"])
            for result in results
        ),
        "errors": errors,
        "assets": sorted(results, key=lambda item: item["public_id"]),
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    text_report = args.report.with_suffix(".txt")
    text_report.write_text(
        "\n".join(
            [
                "RAPPORT DEPLACEMENT CLOUDINARY",
                f"Date : {report['date']}",
                f"Dossier racine : {report['destination_root']}",
                f"Assets attendus : {report['expected']}",
                f"Assets déplacés : {report['moved']}",
                f"Public IDs inchangés : {report['unchanged_public_ids']}",
                f"Erreurs : {len(errors)}",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps({key: value for key, value in report.items() if key != "assets"}, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
