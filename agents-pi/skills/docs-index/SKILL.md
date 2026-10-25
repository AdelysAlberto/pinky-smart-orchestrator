---
name: docs-index
description: >-
  Operate the local grounded-docs MCP server: index or refresh docs from URLs, GitHub or file:// trees,
  resolve versions, semantic search, container troubleshooting.
compatibility: Requires Docker and oMLX running on the host
metadata:
  author: human
---

# Grounded Docs — Local Documentation Index

Reach this server through the Pi MCP tools (`grounded-docs`), not by shelling
out. Only two operations need the container CLI (see "CLI-only").

## Architecture

- **Container** `docs-mcp-server` (compose project
  `/Volumes/Datos/Projects/services/docs-mpc-server`): Web UI + MCP + API on
  `http://localhost:6280` (MCP path `/mcp`).
- **Persistence**: `/data` (SQLite + vectors) is a **Docker named volume**
  `docs-mpc-server_docs_mcp_data` since 2026-10-18 — bind mounts on macOS/
  virtiofs broke POSIX locking and corrupted the DB mid-indexing. `./config`
  stays a bind mount. Backup: `bash scripts/backup-db.sh` → `data/backups/`.
  Never `docker compose down -v` (destroys indexes). Note the project prefix:
  the volume is `docs-mpc-server_docs_mcp_data`, NOT `docs_mcp_data`.
  Inspect the live DB without a second writer:
  `docker exec docs-mcp-server node -e "...better-sqlite3 readonly..."`.
- **Embeddings**: oMLX on the host, model `Qwen3-Embedding-4B-4bit-DWQ`
  (dim 2560), reached from the container at
  `http://host.docker.internal:8030/v1` via `OPENAI_API_BASE`. The API key
  lives only in `docs-mpc-server/.env` (`OMLX_API_KEY`), never in this skill
  or the image. oMLX down = scraping still works but vectors fail; search
  degrades to full-text.
- **Local files**: host `/Volumes/Datos/Projects` is mounted read-only at
  `/workspace`; the allowed `file://` root is `["/workspace"]` only.

## MCP tools (names verified against the running server)

| Tool | Purpose | Key args |
|---|---|---|
| `search_docs` | Hybrid vector+FTS search | `library`, `query`, `version?`, `limit?` |
| `list_libraries` | What is indexed | — |
| `find_version` | Resolve closest version | `library`, `version?` |
| `fetch_url` | URL → Markdown, not indexed | `url` |
| `scrape_docs` | Index a new library/version | `library`, `url`, `version?`, `maxDepth?`, `maxPages?`, `replace?`, `preserveHashes?` |
| `refresh_version` | Incremental re-index | `library`, `version` |
| `list_jobs` / `get_job_info` | Job queue monitoring | `jobId?` |
| `cancel_job` / `remove_docs` | **Not exposed by the running server** (see "Removing a library") | — |

Direct exposure: `search_docs`, `list_libraries`, `fetch_url`. The rest via
codemode (`searchTools`/`describeTool("mcp__grounded-docs__...")`).

## llms.txt sites (verified 2026-10-17)

- **Never pass `.../llms.txt` as the scrape URL**: it indexes exactly 1 page (the index file itself).
  Pass the **section root** (e.g. `https://developers.cloudflare.com/dns/`); the scraper discovers
  `llms.txt` and prefers `.md` variants automatically. Verified: dmarc `llms.txt` seed → 1 page;
  root seed → real pages, searchable.
- One library per domain-area with `scope: "hostname"` + `includePatterns` per product path is
  practical: Cloudflare DNS/registrar/email-service/pages/wrangler indexed as library `cloudflare`.
- Some product paths have no working `llms.txt` (404 or HTML): `email-security`, `zones`, `email`.
  `email-routing` 301-redirects to `email-service`. Verify with `curl` before scraping.

## includePatterns: HTTP vs `file://` (verified 2026-10-20, code + live job)

`shouldIncludeUrl` (in `/app/dist/main-*.js`) matches **only against the full URL and the pathname**.
The `basename` fallback is computed **exclusively when `url.startsWith("file://")`**.

- **HTTP sites: bare filename globs do not work.** `"sql-*.html"` never matches
  `https://host/docs/18/sql-create-table.html`, because minimatch runs against the whole path
  (`docs/18/sql-*.html` ≠ `sql-*.html`) and the basename branch is skipped. The job still reports
  `completed` with ~1-30 pages: chapter roots survive only because the *requested root* is exempt
  from filtering, so the failure looks like success. Reproduce before trusting a small page count:
  `SELECT url FROM pages … LIMIT 30`: roots and navigation pages only means the include is dead.
- **Use regex patterns wrapped in slashes** for HTTP: `/docs/18/(?:sql|wal|runtime-config)[a-z0-9\-]*\.html/`.
  `isRegexPattern` requires **both** a leading and a trailing `/`; the inner regex is tested against
  the full URL and the path. Validate the pattern offline against the real filename list first.
- **Enumerate real filenames before writing any pattern.** Fetch the TOC and one level of chapters and
  collect `href="([a-z0-9\-]+\.html)"`. Guessed names 404: PG 18 has `managing-databases.html` (plural),
  `app-pgdump.html` (not `pg-dump.html`), `sql-create-table.html` (not `sql-createtable.html`), and no
  `performing.html` / `using-indexes.html` / `keywords.html` at all.

## Local `file://` trees (verified 2026-10-17)

- **`includePatterns` filters DIRECTORIES too.** An include like `*.md` or `/\.md$/` makes every
  subdirectory fail the filter, so the crawl dies at the root level (5-6 pages). For local trees use
  **no include** and exclude junk by extension/path instead:
  `excludePatterns: ["/\\.(png|jpe?g|gif|svg|webp|ico|zip|pdf|lock|log)$/i", "/old/"]`.
- Do not point `file://` at a repo root with data dirs: `.pmtiles` >2 GiB, FIFOs (`ENXIO`) and Lucene
  `.doc` files abort pages. Index only the docs tree (`file:///workspace/<proj>/artifacts`).
- `includeHidden` defaults to `true` in the shipped config.yaml — set it to `false` or
  `.DS_Store`/dotfiles get indexed.

## Viasera project index (re-indexed clean 2026-10-23)

Library `viasera-artifacts`, single version (`main`), ONLY `.md` content, no
`includePatterns` (directory-traversal bug, see below), excludes:
`/\.git/`, `/node_modules/`, `/\.DS_Store$`, `/old/`, `/assets/`,
`/\.(png|jpe?g|gif|svg|webp|ico|zip|pdf|lock|log|p8|tsv|sh|json|html?)$/i`.

| version | url | ~pages |
|---|---|---|
| `main` | `file:///workspace/viasera/artifacts` | 674 `.md` (32 subdirs) |

**Removed 2026-10-23** at the operator's request: `viasera-plan` and `viasera-proxmox` (content and
library rows; `PRAGMA integrity_check` ok afterwards, backup at `data/backups/20261023-1912`). For
`plan/` and `proxmox/` the repo tree is the source of truth: the indexed copy could outrank the live file.

## Indexing rules

- Scraping an existing library version is rejected: use `replace: true` to
  rebuild, or `refresh_version` to update in place. **The MCP `scrape_docs` schema exposes no `replace`
  field** (only `library`, `url`, `version`, `maxDepth`, `maxPages`, `scope`, `followRedirects`,
  `preserveHashes`, `includePatterns`, `excludePatterns`), so passing it is rejected by validation. To
  rebuild from scratch, remove the library first (see "Removing a library").
- A scrape job that finishes in seconds with 1 page is a broken include pattern, not a complete index.
- Web sources: `llms.txt` probing and Markdown content negotiation are
  automatic. `preserveHashes: true` only for hash-routed SPAs (auto-upgrades
  the job to Playwright); normal sites keep fragments as anchors.
- Local trees: pass the **container** path — host
  `/Volumes/Datos/Projects/viasera` becomes `file:///workspace/viasera`.
  Hidden files and symlinks are skipped by design; `node_modules` is not
  auto-excluded, so cap with `maxPages` or index a docs subfolder.
- Refresh semantics: unchanged pages skipped via ETag (HTTP) or mtime
  (`file://`); modified pages re-chunked and re-embedded; deleted pages
  removed; new pages discovered. mtime is coarser — if a tool touches files
  without editing them, rebuild with `replace: true`.
- Changing the embedding model invalidates all vectors: the server asks for
  interactive confirmation once, then every library must be re-indexed.

## CLI-only (no MCP equivalent)

Actual project path is `/Volumes/Datos/Projects/services/docs-mpc-server` (not `utils/`).
CLI commands that open the DB must run only while the server is STOPPED (single writer):
`docker compose stop docs-mcp` first.

```bash
cd /Volumes/Datos/Projects/services/docs-mpc-server
docker compose run --rm -T docs-mcp list                 # libraries + versions + counts
# WARNING: `remove` (compose run = 2nd SQLite process) and host-side `sqlite3` writes WHILE THE
# SERVER RUNS corrupt the DB: writes fail with "database disk image is malformed" while reads and
# PRAGMA integrity_check still say ok. Repair: stop container -> sqlite3 documents.db
# "VACUUM INTO 'new.db'" -> swap -> rm -f *-shm *-wal -> chown 1000:1000 -> start.
# Truthful job log = versions table (status, error_message, progress_pages_indexed). `documents`
# has no version_id; join pages->versions. MCP list_jobs only keeps the current session's jobs.
docker compose run --rm -T docs-mcp remove <library>     # deletes content only, see below
docker compose run --rm -T docs-mcp compact              # reclaim SQLite space (exclusive lock)
docker compose run --rm -T docs-mcp config --yaml
```

## Removing a library (two steps)

The MCP server in this deployment registers no delete tool: `describeNamespace("mcp__grounded_docs")`
returns only `search_docs`, `list_libraries`, `find_version`, `scrape_docs`, `refresh_version`,
`fetch_url`, `list_jobs`, `get_job_info`. `remove` is CLI-only, and it **deletes content but leaves the
library and version rows behind**, so the name keeps appearing in `list_libraries` with
`documentCount: 0` — that is why a removed library "does not disappear".

Deletion of an interrupted or partial version also leaves `running` rows in `versions`; clean them with
the container's own node (the host `sqlite3` cannot open the DB: `no such module: vec0`):

```bash
cat > /tmp/clean.js <<'JS'
const Database=require('better-sqlite3'), sqliteVec=require('sqlite-vec');
const db=new Database('/data/documents.db'); sqliteVec.load(db);
const lib=db.prepare('SELECT id FROM libraries WHERE name=?').get('<library>');
if(!lib){console.log('absent');process.exit(0)}
db.transaction(()=>{
  const ids=db.prepare('SELECT d.id FROM documents d JOIN pages p ON p.id=d.page_id JOIN versions v ON v.id=p.version_id WHERE v.library_id=?').all(lib.id).map(r=>r.id);
  db.prepare('DELETE FROM documents_vec WHERE library_id=?').run(lib.id);
  const f=db.prepare('DELETE FROM documents_fts WHERE rowid=?'); for(const i of ids) f.run(i);
  db.prepare('DELETE FROM documents WHERE page_id IN (SELECT id FROM pages WHERE version_id IN (SELECT id FROM versions WHERE library_id=?))').run(lib.id);
  db.prepare('DELETE FROM pages WHERE version_id IN (SELECT id FROM versions WHERE library_id=?)').run(lib.id);
  db.prepare('DELETE FROM versions WHERE library_id=?').run(lib.id);
  db.prepare('DELETE FROM libraries WHERE id=?').run(lib.id);
})();
console.log(db.prepare('PRAGMA integrity_check').get()); db.close();
JS
# module resolution needs cwd=/app and NODE_PATH; a plain -v mount of the script alone fails MODULE_NOT_FOUND
cd /Volumes/Datos/Projects/services/docs-mpc-server && docker compose stop docs-mcp
docker run --rm -w /app -e NODE_PATH=/app/node_modules \
  -v docs-mpc-server_docs_mcp_data:/data -v /tmp/clean.js:/tmp/clean.js:ro \
  --entrypoint node docs-mcp-server:local /tmp/clean.js
```

`documents_fts` is contentless-ish FTS5 keyed by `rowid` (there is **no `docid` column**), and
`documents` has no `version_id`, so always join through `pages`.

```bash
# 1. content (CLI, server STOPPED — compose run = 2nd SQLite process)
cd /Volumes/Datos/Projects/services/docs-mpc-server
docker compose stop docs-mcp
docker compose run --rm -T docs-mcp remove "<library>"   # prints "Successfully removed …"
# 2. empty shell rows — the DB lives in the named volume: `docker cp` the live
#    /data/documents.db out, delete rows with host sqlite3 (plain tables; vec0 is
#    not needed and remove_docs already cleaned it), copy it back, chown 1000:1000.
docker cp docs-mcp-server:/data/documents.db /tmp/d.db   # or: docker run --rm -v <vol>... cp
sqlite3 /tmp/d.db "DELETE FROM versions WHERE library_id IN (SELECT id FROM libraries WHERE name='<library>'); DELETE FROM libraries WHERE name='<library>';"
# 3. restart so the in-memory library cache refreshes
docker compose start docs-mcp
```

Verify with `list_libraries` over MCP. Backup first (`bash scripts/backup-db.sh`): it is the only
irreversible operation in this skill. If the server is running it keeps the DB in `/data` (volume) —
never edit the volume DB from the host while the server is up.

## Known limits (measured 2026-10-17)

- **SPA docs stall.** TanStack-style sites (`tanstack.com`) fall back to Playwright and die with
  `TimeoutError: page.goto ... 30000ms exceeded`, so the job sits at a handful of pages. Prefer the
  GitHub source instead: `scrape <library> https://github.com/<owner>/<repo>` with `includePatterns`
  limited to the docs folder and extension (e.g. `["/packages/docs/content/", ".mdx"]`). Zod was
  re-indexed this way: 2 junk pages → 24 real MDX pages in minutes.
- **Throughput is the binding constraint.** Embedding runs through oMLX; measured 2026-10-20 the first
  ~50 pages of a 588-page job advanced at 3–5 s/page (crawl-ahead) and then slowed as the embed queue
  backed up. Treat 40–60 s/page as the sustained worst case, so a 600-page job is hours, not minutes.
  `progress_max_pages` grows while discovery runs, so early ETA estimates are unreliable. Cap `maxPages`
  at what the project actually needs (100–150 for a library, 25–40 for one section).
- **PostgreSQL core reference is indexed as library `postgresql` v18** (2026-10-20): ~636 pages of
  SQL/datanodes/functions/WAL/replication/config/monitoring/plpgsql/tutorial/CLI tools from
  `https://www.postgresql.org/docs/18/`. `postgresql.org` serves **no `llms.txt`** (404, verified).
  plain HTML only. The full manual is 1.147 pages; the rest (textsearch, PL/Perl, ECPG, internals,
  catalog reference) is out of scope and can be added later as new versions of the same library.
- **`scope` defaults to `subpages`**, which is what keeps a scrape inside the given URL prefix. On a
  domain that hosts many projects (`docs.swmansion.com`) verify afterwards: sample
  `SELECT url FROM pages ...` and check every path belongs to the intended project.
- **Removal leaves shells** (see "Removing a library"); `list_libraries` keeps showing the name with
  `documentCount: 0` until the rows are deleted and the container restarted.

## Operations & troubleshooting

```bash
docker compose up -d | logs -f docs-mcp | ps   # container lifecycle
```

| Symptom | Cause / fix |
|---|---|
| MCP `grounded-docs` disconnected | Container down: `docker compose up -d`; verify `http://localhost:6280` answers. |
| Embedding errors, vectors NULL | oMLX down on :8030 or model evicted — start oMLX, then `refresh_version` affected libraries. |
| `Embedding model change detected` | Model mismatch vs stored metadata: confirm interactively once, then re-scrape. |
| `file:///...` rejected | Must be under `/workspace` (compose mount) and inside `DOCS_MCP_SCRAPER_SECURITY_FILE_ACCESS_ALLOWED_ROOTS`. |
| writes fail `database disk image is malformed`, reads fine | SQLite writer over a macOS bind mount and/or two writers. Data now lives in named volume `docs-mpc-server_docs_mcp_data`. If it recurs with a single writer: stop container, `sqlite3 db .recover > f.sql` (VACUUM INTO fails when B-trees are destroyed), rebuild into a fresh DB, `INSERT INTO documents_fts(documents_fts) VALUES('rebuild')`, swap into the volume, chown 1000:1000, restart. |
| Local scrape "completes" with <10 pages | `includePatterns` blocked directory traversal — drop includes, use excludes. |
| Version stuck `failed: Job interrupted` | Pre-`--resume` artifact. Compose `command` now passes `--resume`, so interrupted jobs re-enqueue on restart. |
| SPA indexes one empty page | Needs JS: `preserveHashes` for hash routers, otherwise wrong seed URL. |
| Permission error after copying project folder | Container runs as uid 1000: `docker run --rm -u 0 -v "$PWD/data:/data" -v "$PWD/config:/config" alpine chown -R 1000:1000 /data /config` |

Upstream docs: https://github.com/arabold/docs-mcp-server (`docs/`).
Project README: `/Volumes/Datos/Projects/services/docs-mpc-server/README.md`.
