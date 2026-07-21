#!/usr/bin/env python3
"""Create a non-destructive, project-oriented copy of the web portfolio."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


def slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")


def normalized_path(path: Path) -> str:
    return "/".join(slug(part) for part in path.parts)


def classify(relative: Path) -> tuple[str, str]:
    path = normalized_path(relative)
    filename = slug(relative.stem)

    # EMS / Cofix
    if path.startswith("3d-projet/brand-3d-bureau-ems/"):
        return "EMS - Cofix", "3D - Bureaux EMS"
    if path.startswith("realisation/cofix-ems/intern/3d/"):
        return "EMS - Cofix", "3D - Boutique Cofix"
    if path.startswith("realisation/cofix-ems/intern/"):
        return "EMS - Cofix", "Realisation - Interieur"
    if path.startswith("realisation/cofix-ems/extern/"):
        return "EMS - Cofix", "Realisation - Exterieur"

    # Assinie
    if path.startswith("3d-projet/brand-stand-assinie-3d/"):
        return "Assinie", "3D - Stand"
    if path.startswith("3d-projet/lancement-de-produit-avant-apres/"):
        return "Assinie", "3D - Avant et apres"
    if path.startswith("document-projet/brochure-assinie-"):
        return "Assinie", "Documents"
    if path.startswith("realisation/foire-de-fin-d-annee/assinie/"):
        return "Assinie", "Realisation - Stand"
    if path == "quelques-affiches/p4-04-07-25-jpg":
        return "Assinie", "Affiches"

    # Danice
    if path.startswith("3d-projet/conception-danice-3d/texture-image/"):
        return "Danice", "Identite visuelle"
    if path.startswith("3d-projet/conception-danice-3d/"):
        return "Danice", "3D"

    # Djamila
    if path.startswith("3d-projet/diamila-2-0-page-"):
        return "Djamila", "Documents"
    if path.startswith("3d-projet/djamila-branding/"):
        return "Djamila", "3D et branding"

    # Istanbul Shop
    if path.startswith("3d-projet/istanbul-projet-3d-projet/"):
        return "Istanbul Shop", "3D"
    if path.startswith("realisation/istanbul-shop/"):
        return "Istanbul Shop", "Realisation"

    # Bah Automobile
    if path.startswith("3d-projet/stand-bah-autobile-3d-bah-auto/"):
        return "Bah Automobile", "3D - Stand"
    if path.startswith("conception-vs-3d/") and not path.startswith("conception-vs-3d/image-3d-sonikara/"):
        return "Bah Automobile", "3D et conception"
    if path.startswith("hero/"):
        return "Bah Automobile", "Identite et realisation"
    if path == "realisation/mix-projet/whatsapp-image-2025-08-05-at-15-42-59-jpg":
        return "Bah Automobile", "Realisation"

    # Named branding projects
    if path.startswith("boisson-tiger-x/"):
        return "Tiger X", "Packaging et affiches"
    if path.startswith("conception-vs-3d/image-3d-sonikara/"):
        return "Sonikara Solar Electro", "3D"
    if path.startswith("lancement-d-une-marque/notre-eau/bidon-la-menagere/"):
        return "Notre Eau - La Menagere", "Packaging - La Menagere"
    if path.startswith("lancement-d-une-marque/notre-eau/"):
        return "Notre Eau - La Menagere", "3D et packaging"
    if path.startswith("document-projet/brochureindd-page-"):
        return "Notre Eau - La Menagere", "Documents"
    if path.startswith("document-projet/brand-guideline-yacoco-page-"):
        return "Yacoco - Ya", "Brand guideline"
    if path.startswith("document-projet/projet-brainstorming-ya-page-"):
        return "Yacoco - Ya", "Brainstorming"
    if path.startswith("quelques-affiches/brand-externe-la-rose/"):
        return "La Rose", "3D et realisation"

    # Planet project: campaign, event and booth work.
    if path.startswith("quelques-affiches/processe-affiche-3d-a-image/"):
        return "Planet", "Affiches et processus 3D"
    if path == "quelques-affiches/recto-flyers-event-copie-jpg":
        return "Planet", "Affiches et processus 3D"
    if path.startswith("realisation/can-ivoir/"):
        return "Planet", "Realisation - CAN Ivoire"
    if path.startswith("realisation/foire-de-fin-d-annee/marque-planet/"):
        return "Planet", "Realisation - Stand"

    # Other fair and signage projects.
    if path.startswith("realisation/foire-de-fin-d-annee/marque-les-marques-nbb/"):
        return "NBB - Bubble Up", "Realisation - Stand"
    if path.startswith("realisation/foire-de-fin-d-annee/the-andalousie/"):
        return "The Andalousie", "3D et realisation"
    if path.startswith("realisation/ladji-totem/"):
        return "Ladji", "Totem - 3D et realisation"
    if path.startswith("realisation/mix-projet/esay-travel/"):
        return "Easy Travel", "Signaletique"

    # The original Mix projet folder contains several independent clients.
    mix_projects = {
        "whatsapp-image-2025-06-13-at-11-53-10": ("Mamushka", "Enseigne"),
        "whatsapp-image-2025-06-13-at-11-53-32": ("Mamushka", "Enseigne"),
        "whatsapp-image-2025-06-13-at-11-53-33": ("Salam Shop", "Amenagement interieur"),
        "whatsapp-image-2025-08-05-at-15-42-54": ("Jina's Cosmetics", "Enseigne"),
        "whatsapp-image-2025-08-05-at-15-42-58-copie": ("Danya Immobilier", "Enseigne"),
        "whatsapp-image-2025-08-05-at-15-42-58": ("Soconep", "Enseigne"),
    }
    if path.startswith("realisation/mix-projet/") and filename in mix_projects:
        return mix_projects[filename]

    # Standalone poster projects identified from their visual content.
    standalone_posters = {
        "fly": "Baguette d'Or",
        "flyers-copie-2-page-01": "Affiche Automobile",
        "flyers-copie-page-01": "ESIAM",
        "flyers-copie": "Daycare",
        "flyers-oumra-page-01": "Ilham Voyage - Oumra",
        "flyers-psd": "Graine d'Alima",
        "flyres-copie-2": "Wingman",
    }
    if path.startswith("quelques-affiches/") and "/" not in path.removeprefix("quelques-affiches/"):
        if filename in standalone_posters:
            return standalone_posters[filename], "Affiche"

    raise ValueError(f"Projet non identifié : {relative}")


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def unique_destination(folder: Path, filename: str) -> Path:
    candidate = folder / filename
    if not candidate.exists():
        return candidate
    stem, suffix = Path(filename).stem, Path(filename).suffix
    number = 2
    while True:
        candidate = folder / f"{stem}-{number}{suffix}"
        if not candidate.exists():
            return candidate
        number += 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    source = args.source.resolve()
    destination = args.destination.resolve()
    images = sorted(source.rglob("*.jpg"), key=lambda item: str(item).casefold())
    if not images:
        raise SystemExit("Aucune image JPG trouvée")
    if destination.exists() and not args.dry_run:
        raise SystemExit(f"Le dossier cible existe déjà : {destination}")

    assignments = []
    unclassified = []
    for image in images:
        relative = image.relative_to(source)
        try:
            project, category = classify(relative)
            assignments.append((image, relative, project, category))
        except ValueError as error:
            unclassified.append(str(error))

    if unclassified:
        print("\n".join(unclassified))
        raise SystemExit(f"{len(unclassified)} image(s) non classée(s)")

    if args.dry_run:
        counts = Counter(project for _, _, project, _ in assignments)
        print(json.dumps({"total": len(assignments), "projects": dict(sorted(counts.items()))}, ensure_ascii=False, indent=2))
        return 0

    destination.mkdir(parents=True)
    seen_hashes: dict[str, dict] = {}
    records: list[dict] = []
    duplicates: list[dict] = []
    project_counts: Counter[str] = Counter()

    for image, relative, project, category in assignments:
        image_hash = digest(image)
        if image_hash in seen_hashes:
            duplicates.append(
                {
                    "source": str(relative),
                    "same_as": seen_hashes[image_hash]["source"],
                    "project": project,
                }
            )
            continue
        target_folder = destination / project / category
        target_folder.mkdir(parents=True, exist_ok=True)
        target = unique_destination(target_folder, image.name)
        shutil.copy2(image, target)
        record = {
            "source": str(relative),
            "project": project,
            "category": category,
            "output": str(target.relative_to(destination)),
            "sha256": image_hash,
        }
        records.append(record)
        seen_hashes[image_hash] = record
        project_counts[project] += 1

    report = {
        "date": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": str(source),
        "destination": str(destination),
        "source_images": len(images),
        "organized_images": len(records),
        "exact_duplicates_skipped": len(duplicates),
        "project_count": len(project_counts),
        "projects": dict(sorted(project_counts.items())),
        "duplicates": duplicates,
        "files": records,
    }
    (destination / "RAPPORT_TRI_PAR_PROJET.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    lines = [
        "RAPPORT DE TRI PAR PROJET",
        f"Date : {report['date']}",
        f"Images source : {report['source_images']}",
        f"Images organisées : {report['organized_images']}",
        f"Doublons exacts écartés : {report['exact_duplicates_skipped']}",
        f"Projets : {report['project_count']}",
        "",
        "Répartition :",
    ]
    lines.extend(f"- {project} : {count}" for project, count in sorted(project_counts.items()))
    lines.extend(["", "Doublons écartés :"])
    lines.extend(
        f"- {item['source']} = {item['same_as']}" for item in duplicates
    )
    (destination / "RAPPORT_TRI_PAR_PROJET.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key not in {"files", "duplicates"}}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
