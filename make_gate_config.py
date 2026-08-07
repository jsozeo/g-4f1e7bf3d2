#!/usr/bin/env python3
"""Génère assets/gate-config.js à partir de .venv/.env (LOGIN + PASSWORD).

Le couple login|password en clair ne part JAMAIS en ligne : on publie un hash.
Relancer ce script dès que tu changes LOGIN ou PASSWORD, puis committer
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
    login = conf.get("LOGIN", "").strip()
    password = conf.get("PASSWORD", "").strip()
    if not login or not password:
        raise SystemExit("LOGIN et PASSWORD doivent être définis dans .venv/.env")

    material = f"{login.lower()}|{password}".encode("utf-8")
    digest = hashlib.sha256(material).hexdigest()

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
