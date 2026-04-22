#!/usr/bin/env python3
"""
generate_random_keys.py

Safely generate strong random keys for .env variables
while preserving formatting exactly.

Usage:
    python generate_random_keys.py .env DJANGO_SECRET_KEY JWT_SIGNING_KEY
    python generate_random_keys.py .env DJANGO_SECRET_KEY -y
"""

import argparse
import re
import secrets
import string
from pathlib import Path
from typing import Dict, List


# ===== Configuration =====

DEFAULT_KEY_LENGTH = 64
ALPHABET = string.ascii_letters + string.digits + string.punctuation


# ===== ANSI Colors =====

class Color:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


# ===== Core =====

def generate_key(length: int = DEFAULT_KEY_LENGTH) -> str:
    # return ''.join(secrets.choice(ALPHABET) for _ in range(length))
    return secrets.token_urlsafe(length)[:length]


def collect_changes(
    lines: List[str],
    target_keys: List[str]
) -> (Dict[str, str], List[str]):
    """
    Determine which keys will be updated vs added.
    Returns:
        updates: dict of existing keys -> new value
        additions: list of keys to add
    """
    existing_keys = set()
    for line in lines:
        match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=", line)
        if match:
            existing_keys.add(match.group(1))

    updates = {}
    additions = []

    for key in target_keys:
        if key in existing_keys:
            updates[key] = generate_key()
        else:
            additions.append(key)

    return updates, additions


def apply_changes(
    filepath: Path,
    updates: Dict[str, str],
    additions: List[str]
) -> None:
    """
    Apply updates while preserving original formatting exactly.
    """
    lines = filepath.read_text(encoding="utf-8").splitlines(keepends=True)

    # Update existing keys
    for i, line in enumerate(lines):
        for key, value in updates.items():
            if re.match(rf"^{re.escape(key)}=", line):
                newline = "\n" if line.endswith("\n") else ""
                lines[i] = f"{key}={value}{newline}"

    # Add missing keys at end (preserve file exactly otherwise)
    if additions:
        # Ensure file ends with newline
        if lines and not lines[-1].endswith("\n"):
            lines[-1] += "\n"

        for key in additions:
            value = generate_key()
            lines.append(f"{key}={value}\n")

    filepath.write_text("".join(lines), encoding="utf-8")


def confirm_or_exit(auto_yes: bool) -> None:
    if auto_yes:
        return

    choice = input(f"\n{Color.GREEN}Apply these changes? [y/N]: {Color.RESET}")
    if choice.strip().lower() not in ("y", "yes"):
        print(f"{Color.RED}Aborted.{Color.RESET}")
        raise SystemExit(1)


# ===== CLI =====

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate strong random keys for .env variables."
    )
    parser.add_argument("filepath", type=Path, help="Path to .env file")
    parser.add_argument("keys", nargs="+", help="Keys to update or create")
    parser.add_argument(
        "-y", "--yes",
        action="store_true",
        help="Apply without confirmation"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.filepath.exists():
        print(f"{Color.RED}File not found: {args.filepath}{Color.RESET}")
        raise SystemExit(1)

    original_lines = args.filepath.read_text(
        encoding="utf-8"
    ).splitlines(keepends=True)

    updates, additions = collect_changes(original_lines, args.keys)

    if not updates and not additions:
        print(f"{Color.YELLOW}No matching keys found.{Color.RESET}")
        return

    print(f"\n{Color.BOLD}{Color.CYAN}The following changes will be made:{Color.RESET}\n")

    if updates:
        print(f"{Color.YELLOW}Update existing keys:{Color.RESET}")
        for key in updates:
            print(f"  • {key}")

    if additions:
        print(f"\n{Color.YELLOW}Add new keys:{Color.RESET}")
        for key in additions:
            print(f"  • {key}")

    confirm_or_exit(args.yes)

    apply_changes(args.filepath, updates, additions)

    print(f"\n{Color.GREEN}{Color.BOLD}Done.{Color.RESET}")


if __name__ == "__main__":
    main()