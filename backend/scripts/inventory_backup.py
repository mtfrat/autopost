"""Create a local, secret-free Phase 0 backup using Supabase REST APIs."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path

import httpx

TABLES = (
    "tenant_companies",
    "platform_configurations",
    "content_backlog",
    "generated_assets",
    "generation_templates",
    "brand_image_library",
    "users",
)
BUCKETS = ("brand-assets", "generated-media")


def required_env(name: str, legacy: str | None = None) -> str:
    value = os.environ.get(name) or (os.environ.get(legacy, "") if legacy else "")
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def fetch_table(client: httpx.Client, base_url: str, table: str) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        response = client.get(
            f"{base_url}/rest/v1/{table}",
            params={"select": "*"},
            headers={"Range": f"{offset}-{offset + 999}"},
        )
        response.raise_for_status()
        page = response.json()
        rows.extend(page)
        if len(page) < 1_000:
            return rows
        offset += 1_000


def list_bucket(client: httpx.Client, base_url: str, bucket: str, prefix: str = "") -> list[dict]:
    objects: list[dict] = []
    offset = 0
    while True:
        response = client.post(
            f"{base_url}/storage/v1/object/list/{bucket}",
            json={
                "prefix": prefix,
                "limit": 1_000,
                "offset": offset,
                "sortBy": {"column": "name", "order": "asc"},
            },
        )
        response.raise_for_status()
        page = response.json()
        for item in page:
            path = f"{prefix}/{item['name']}".strip("/")
            if item.get("id") is None and item.get("metadata") is None:
                objects.extend(list_bucket(client, base_url, bucket, path))
            else:
                objects.append({"path": path, "id": item.get("id"), "metadata": item.get("metadata")})
        if len(page) < 1_000:
            return objects
        offset += 1_000


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    output = args.output.expanduser().resolve()
    output.mkdir(parents=True, exist_ok=False)

    base_url = required_env("SUPABASE_URL").rstrip("/")
    key = required_env("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY")
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    manifest = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "tables": {},
        "buckets": {},
    }

    with httpx.Client(headers=headers, timeout=60) as client:
        schema = client.get(f"{base_url}/rest/v1/")
        schema.raise_for_status()
        (output / "schema-openapi.json").write_text(
            json.dumps(schema.json(), indent=2),
            encoding="utf-8",
        )
        for table in TABLES:
            rows = fetch_table(client, base_url, table)
            (output / f"{table}.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
            manifest["tables"][table] = len(rows)
        for bucket in BUCKETS:
            objects = list_bucket(client, base_url, bucket)
            (output / f"storage-{bucket}.json").write_text(
                json.dumps(objects, indent=2),
                encoding="utf-8",
            )
            manifest["buckets"][bucket] = len(objects)

    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
