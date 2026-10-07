#!/usr/bin/env bash
# Publica versões antigas do site em subpastas (dist/v1, dist/v2, dist/v3), ao lado da atual.
# Cada uma é compilada do commit em que foi publicada. Para não mexer nos dados salvos da
# versão atual, os nomes de armazenamento (IndexedDB e localStorage 'spotify-stats…') ganham
# o sufixo da versão, e o service worker antigo não é publicado.
set -euo pipefail

VERSOES=(
  "v1 7cf7138"  # o primeiro de todos (fase 1: Resumo)
  "v2 3860904"  # as 4 fases do conceito, com fotos e capas (antes do visual novo)
  "v3 b606bce"  # visual novo e nome Lyra (antes das abas embaixo, idiomas e Explorar)
)

raiz=$(pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

for item in "${VERSOES[@]}"; do
  read -r nome commit <<<"$item"
  pasta="$tmp/$nome"
  git -C "$raiz" archive "$commit" | (mkdir -p "$pasta" && tar -x -C "$pasta")
  grep -rlZ "'spotify-stats" "$pasta/src" | xargs -0 -r sed -i "s/'spotify-stats/'spotify-stats-$nome/g"
  rm -f "$pasta/public/sw.js"
  (cd "$pasta" && npm ci --no-audit --no-fund && npx vite build --outDir "$raiz/dist/$nome" --emptyOutDir)
done
