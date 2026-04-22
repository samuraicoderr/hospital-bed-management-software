#!/usr/bin/env python3
"""
Extract all API endpoint links from an OpenAPI YAML specification file.
"""

import sys
import yaml
import argparse
from pathlib import Path


def extract_links(yaml_file: str) -> list[dict]:
    """
    Parse the YAML file and extract all endpoint paths with their HTTP methods.
    
    Returns a list of dicts with 'method', 'path', 'operationId', and 'description'.
    """
    with open(yaml_file, "r") as f:
        spec = yaml.safe_load(f)

    if not spec or "paths" not in spec:
        print("No 'paths' found in the YAML file.", file=sys.stderr)
        return []

    http_methods = {"get", "post", "put", "patch", "delete", "head", "options", "trace"}
    links = []

    for path, path_item in spec["paths"].items():
        if not isinstance(path_item, dict):
            continue

        for method, operation in path_item.items():
            if method.lower() not in http_methods:
                continue

            if not isinstance(operation, dict):
                continue

            links.append({
                "method": method.upper(),
                "path": path,
                "operationId": operation.get("operationId", ""),
                "description": (operation.get("description") or "").split("\n")[0].strip(),
                "tags": operation.get("tags", []),
            })

    return links


def print_links_simple(links: list[dict]) -> None:
    """Print just the paths, one per line."""
    seen = set()
    for link in links:
        if link["path"] not in seen:
            print(link["path"])
            seen.add(link["path"])


def print_links_detailed(links: list[dict]) -> None:
    """Print method + path + operationId in a formatted table."""
    if not links:
        print("No endpoints found.")
        return

    # Calculate column widths
    method_width = max(len(link["method"]) for link in links)
    path_width = max(len(link["path"]) for link in links)

    # Header
    header = f"{'METHOD':<{method_width}}  {'PATH':<{path_width}}  OPERATION ID"
    print(header)
    print("-" * len(header))

    for link in links:
        print(
            f"{link['method']:<{method_width}}  "
            f"{link['path']:<{path_width}}  "
            f"{link['operationId']}"
        )


def print_links_grouped(links: list[dict]) -> None:
    """Print endpoints grouped by tag."""
    from collections import defaultdict

    groups = defaultdict(list)
    for link in links:
        tags = link["tags"] if link["tags"] else ["untagged"]
        for tag in tags:
            groups[tag].append(link)

    for tag in sorted(groups.keys()):
        print(f"\n{'=' * 60}")
        print(f"  [{tag.upper()}]")
        print(f"{'=' * 60}")
        for link in groups[tag]:
            print(f"  {link['method']:<7} {link['path']}")
            if link["description"]:
                print(f"          └─ {link['description']}")


def main():
    parser = argparse.ArgumentParser(
        description="Extract API endpoint links from an OpenAPI YAML file."
    )
    parser.add_argument(
        "yaml_file",
        help="Path to the OpenAPI YAML specification file.",
    )
    parser.add_argument(
        "-f", "--format",
        choices=["simple", "detailed", "grouped"],
        default="detailed",
        help="Output format: 'simple' (paths only), 'detailed' (table), 'grouped' (by tag). Default: detailed",
    )
    parser.add_argument(
        "--method",
        type=str,
        default=None,
        help="Filter by HTTP method (e.g., GET, POST).",
    )
    parser.add_argument(
        "--tag",
        type=str,
        default=None,
        help="Filter by tag (e.g., auth, organizations).",
    )
    parser.add_argument(
        "--count",
        action="store_true",
        help="Print the total count of endpoints.",
    )

    args = parser.parse_args()

    if not Path(args.yaml_file).is_file():
        print(f"Error: File '{args.yaml_file}' not found.", file=sys.stderr)
        sys.exit(1)

    links = extract_links(args.yaml_file)

    # Apply filters
    if args.method:
        links = [l for l in links if l["method"] == args.method.upper()]

    if args.tag:
        links = [l for l in links if args.tag.lower() in [t.lower() for t in l["tags"]]]

    # Output
    if args.count:
        unique_paths = set(l["path"] for l in links)
        print(f"Total endpoints (method+path): {len(links)}")
        print(f"Unique paths:                  {len(unique_paths)}")
        return

    if args.format == "simple":
        print_links_simple(links)
    elif args.format == "grouped":
        print_links_grouped(links)
    else:
        print_links_detailed(links)


if __name__ == "__main__":
    main()