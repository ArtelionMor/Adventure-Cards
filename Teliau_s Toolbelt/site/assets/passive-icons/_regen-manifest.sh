#!/bin/sh
# Régénère manifest.js à partir des fichiers d'icônes présents dans ce dossier.
# Lance-le après avoir ajouté/supprimé des icônes :  sh _regen-manifest.sh
cd "$(dirname "$0")" || exit 1
{
  echo "// Liste des icônes du dossier — régénère avec: sh _regen-manifest.sh"
  echo "window.PASSIVE_ICON_FILES = ["
  find . -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.svg' -o -iname '*.gif' -o -iname '*.webp' \) \
    | sed 's|^\./||' | sort | sed 's|.*|  "&",|'
  echo "];"
} > manifest.js
echo "manifest.js régénéré ($(grep -c '"' manifest.js) icônes)."
