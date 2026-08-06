#!/usr/bin/env python3
"""Génère assets/gate-config.js à partir de .venv/.env (PASSWORD uniquement).

Le mot de passe en clair ne part JAMAIS en ligne : on publie un hash SHA-256.
Relancer ce script dès que tu changes PASSWORD, puis committer
assets/gate-config.js.
"""
from __future__ import annotations

import hashlib
import pathlib

ENV = pathlib.Path(".venv/.env")
OUT = pathlib.Path("assets/gate-config.js")


def load_env(path: pathlib.Path) -> dict[str, str]:
    conf: dict[str, str] = {}
    for line in path.read_text().splitlines():
        if "=" in line and not line.startswith("#") and not line.startswith("="):
            k, _, v = line.partition("=")
            conf[k.strip()] = v.strip()
    return conf


def main() -> None:
    conf = load_env(ENV)
    password = conf.get("PASSWORD", "").strip()
    if not password:
        raise SystemExit("PASSWORD doit être défini dans .venv/.env")

    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()

    OUT.write_text(
        "/* Généré par make_gate_config.py — ne pas éditer à la main. */\n"
        "window.GATE_CONFIG = {\n"
        f'  token: "{digest}"\n'
        "};\n",
        encoding="utf-8",
    )
    print(f"{OUT} mis à jour (hash={digest[:12]}…)")


if __name__ == "__main__":
    main()
