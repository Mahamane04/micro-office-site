#!/usr/bin/env python3
"""Create web-optimized JPEG derivatives next to portfolio source files."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageCms, ImageOps


RASTER_EXTENSIONS = {".jpg", ".jpeg", ".png"}
HEIC_EXTENSIONS = {".heic", ".heif"}
PSD_EXTENSIONS = {".psd"}
PDF_EXTENSIONS = {".pdf"}
VIDEO_EXTENSIONS = {
    ".mp4",
    ".mov",
    ".m4v",
    ".avi",
    ".mkv",
    ".webm",
    ".wmv",
    ".flv",
}


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug or "image"


def source_files(root: Path, output_folder: str) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if not path.is_file() or path.name == ".DS_Store":
            continue
        if output_folder in path.parts:
            continue
        files.append(path)
    return sorted(files, key=lambda item: str(item).casefold())


def output_path(parent: Path, output_folder: str, stem: str, suffix: str = "") -> Path:
    target_dir = parent / output_folder
    target_dir.mkdir(exist_ok=True)
    return target_dir / f"{slugify(stem)}{suffix}.jpg"


def colliding_slugs(files: list[Path]) -> set[tuple[Path, str]]:
    counts = Counter(
        (path.parent, slugify(path.stem))
        for path in files
        if path.suffix.lower() in RASTER_EXTENSIONS | HEIC_EXTENSIONS | PSD_EXTENSIONS
    )
    return {key for key, count in counts.items() if count > 1}


def convert_to_srgb(image: Image.Image) -> Image.Image:
    icc_profile = image.info.get("icc_profile")
    if not icc_profile:
        return image.convert("RGB")
    try:
        source_profile = ImageCms.ImageCmsProfile(icc_profile)
        destination_profile = ImageCms.createProfile("sRGB")
        return ImageCms.profileToProfile(
            image,
            source_profile,
            destination_profile,
            outputMode="RGB",
        )
    except Exception:
        return image.convert("RGB")


def prepare_image(image: Image.Image, max_edge: int) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    if image.mode in {"RGBA", "LA"} or "transparency" in image.info:
        rgba = image.convert("RGBA")
        background = Image.new("RGBA", rgba.size, "white")
        image = Image.alpha_composite(background, rgba).convert("RGB")
    else:
        image = convert_to_srgb(image)
    if max(image.size) > max_edge:
        image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    return image


def save_jpeg(image: Image.Image, destination: Path, quality: int) -> dict[str, int]:
    image.save(
        destination,
        "JPEG",
        quality=quality,
        optimize=True,
        progressive=True,
        subsampling="4:2:0",
        exif=b"",
        icc_profile=None,
    )
    return {
        "width": image.width,
        "height": image.height,
        "bytes": destination.stat().st_size,
    }


def convert_raster(source: Path, destination: Path, max_edge: int, quality: int) -> dict[str, int]:
    with Image.open(source) as image:
        converted = prepare_image(image, max_edge)
        return save_jpeg(converted, destination, quality)


def convert_heic(source: Path, destination: Path, max_edge: int, quality: int) -> dict[str, int]:
    preview_edge = max(max_edge, 2400)
    with tempfile.TemporaryDirectory(prefix="portfolio-heic-") as temp_dir:
        command = [
            "/usr/bin/qlmanage",
            "-t",
            "-s",
            str(preview_edge),
            "-o",
            temp_dir,
            str(source),
        ]
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        previews = list(Path(temp_dir).glob("*.png"))
        if len(previews) != 1:
            raise RuntimeError(f"Aperçu HEIC introuvable pour {source.name}")
        return convert_raster(previews[0], destination, max_edge, quality)


def convert_psd(source: Path, destination: Path, max_edge: int, quality: int) -> dict[str, int]:
    with tempfile.TemporaryDirectory(prefix="portfolio-psd-") as temp_dir:
        intermediate = Path(temp_dir) / "preview.jpg"
        command = [
            "/usr/bin/sips",
            "-s",
            "format",
            "jpeg",
            str(source),
            "--out",
            str(intermediate),
        ]
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return convert_raster(intermediate, destination, max_edge, quality)


def convert_pdf(
    source: Path,
    output_folder: str,
    max_edge: int,
    quality: int,
    pdftoppm: str,
) -> list[tuple[Path, dict[str, int]]]:
    results: list[tuple[Path, dict[str, int]]] = []
    with tempfile.TemporaryDirectory(prefix="portfolio-pdf-") as temp_dir:
        prefix = Path(temp_dir) / "page"
        command = [pdftoppm, "-png", "-r", "170", str(source), str(prefix)]
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        pages = sorted(Path(temp_dir).glob("page-*.png"))
        if not pages:
            raise RuntimeError(f"Aucune page rendue pour {source.name}")
        digits = max(2, len(str(len(pages))))
        for page_number, page in enumerate(pages, start=1):
            destination = output_path(
                source.parent,
                output_folder,
                source.stem,
                f"-page-{page_number:0{digits}d}",
            )
            results.append(
                (destination, convert_raster(page, destination, max_edge, quality))
            )
    return results


def find_duplicate_groups(files: list[Path], root: Path) -> list[list[str]]:
    groups: defaultdict[str, list[str]] = defaultdict(list)
    for path in files:
        if path.suffix.lower() not in RASTER_EXTENSIONS | HEIC_EXTENSIONS | PSD_EXTENSIONS:
            continue
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        groups[digest.hexdigest()].append(str(path.relative_to(root)))
    return [paths for paths in groups.values() if len(paths) > 1]


def write_report(root: Path, report: dict) -> None:
    json_path = root / "RAPPORT_CONVERSION_WEB.json"
    text_path = root / "RAPPORT_CONVERSION_WEB.txt"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "RAPPORT DE CONVERSION WEB",
        f"Date : {report['date']}",
        f"Réglages : JPEG progressif, qualité {report['quality']}, bord maximal {report['max_edge']} px, sRGB, métadonnées supprimées",
        "",
        f"Fichiers source pris en charge : {report['source_files_converted']}",
        f"JPEG produits : {report['jpeg_outputs']}",
        f"Dossiers JPG_WEB créés : {report['output_folders']}",
        f"Vidéos laissées intactes : {report['videos_untouched']}",
        f"Erreurs : {len(report['errors'])}",
        f"Poids des sources converties : {report['source_bytes'] / 1024 / 1024:.1f} Mo",
        f"Poids des JPEG web : {report['output_bytes'] / 1024 / 1024:.1f} Mo",
        "",
        "Répartition des sources :",
    ]
    for extension, count in sorted(report["source_extensions"].items()):
        lines.append(f"- {extension or '[sans extension]'} : {count}")
    lines.extend(["", "Doublons exacts détectés (originaux conservés) :"])
    if report["duplicate_groups"]:
        for number, group in enumerate(report["duplicate_groups"], start=1):
            lines.append(f"- Groupe {number}")
            lines.extend(f"  - {path}" for path in group)
    else:
        lines.append("- Aucun")
    lines.extend(["", "Erreurs :"])
    if report["errors"]:
        lines.extend(f"- {item['source']} : {item['error']}" for item in report["errors"])
    else:
        lines.append("- Aucune")
    text_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output-folder", default="JPG_WEB")
    parser.add_argument("--max-edge", type=int, default=1920)
    parser.add_argument("--quality", type=int, default=82)
    parser.add_argument(
        "--pdftoppm",
        default=shutil.which("pdftoppm") or "pdftoppm",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = args.source.resolve()
    if not root.is_dir():
        raise SystemExit(f"Dossier source introuvable : {root}")

    files = source_files(root, args.output_folder)
    convertible = [
        path
        for path in files
        if path.suffix.lower()
        in RASTER_EXTENSIONS | HEIC_EXTENSIONS | PSD_EXTENSIONS | PDF_EXTENSIONS
    ]
    videos = [path for path in files if path.suffix.lower() in VIDEO_EXTENSIONS]
    extensions = Counter(path.suffix.lower() for path in convertible)
    name_collisions = colliding_slugs(convertible)

    if args.dry_run:
        payload = {
            "convertible_sources": len(convertible),
            "videos_untouched": len(videos),
            "extensions": dict(sorted(extensions.items())),
            "duplicate_groups": find_duplicate_groups(convertible, root),
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    records: list[dict] = []
    errors: list[dict[str, str]] = []
    converted_sources = 0
    source_bytes = 0

    for index, source in enumerate(convertible, start=1):
        extension = source.suffix.lower()
        try:
            if extension in PDF_EXTENSIONS:
                page_results = convert_pdf(
                    source,
                    args.output_folder,
                    args.max_edge,
                    args.quality,
                    args.pdftoppm,
                )
                for destination, stats in page_results:
                    records.append(
                        {
                            "source": str(source.relative_to(root)),
                            "output": str(destination.relative_to(root)),
                            **stats,
                        }
                    )
            else:
                destination = output_path(
                    source.parent,
                    args.output_folder,
                    source.stem,
                    (
                        f"-{extension.removeprefix('.')}"
                        if (source.parent, slugify(source.stem)) in name_collisions
                        else ""
                    ),
                )
                if extension in RASTER_EXTENSIONS:
                    stats = convert_raster(source, destination, args.max_edge, args.quality)
                elif extension in HEIC_EXTENSIONS:
                    stats = convert_heic(source, destination, args.max_edge, args.quality)
                elif extension in PSD_EXTENSIONS:
                    stats = convert_psd(source, destination, args.max_edge, args.quality)
                else:
                    continue
                records.append(
                    {
                        "source": str(source.relative_to(root)),
                        "output": str(destination.relative_to(root)),
                        **stats,
                    }
                )
            converted_sources += 1
            source_bytes += source.stat().st_size
            print(f"[{index}/{len(convertible)}] OK {source.relative_to(root)}", flush=True)
        except Exception as error:
            errors.append(
                {
                    "source": str(source.relative_to(root)),
                    "error": f"{type(error).__name__}: {error}",
                }
            )
            print(f"[{index}/{len(convertible)}] ERREUR {source.relative_to(root)}: {error}", flush=True)

    output_folders = {str((root / record["output"]).parent) for record in records}
    report = {
        "date": datetime.now().astimezone().isoformat(timespec="seconds"),
        "root": str(root),
        "quality": args.quality,
        "max_edge": args.max_edge,
        "source_files_converted": converted_sources,
        "jpeg_outputs": len(records),
        "output_folders": len(output_folders),
        "videos_untouched": len(videos),
        "source_extensions": dict(sorted(extensions.items())),
        "source_bytes": source_bytes,
        "output_bytes": sum(record["bytes"] for record in records),
        "duplicate_groups": find_duplicate_groups(convertible, root),
        "errors": errors,
        "outputs": records,
    }
    write_report(root, report)
    print(json.dumps({key: value for key, value in report.items() if key != "outputs"}, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
