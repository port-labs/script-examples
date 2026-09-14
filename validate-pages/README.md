# Validate & Fix Pages Scripts

This project iterates over one or more Port organizations, lists every page in each organization, and validates them via the Port API. It includes two related flows:
- **Validate** — only checks pages and reports any validation errors found
- **Fix** — validates pages and, for any page with errors, applies client-side fixes (including setting `displayMode: "widget"` on `table-entities-explorer` widgets inside `dashboard-widget` containers), calls the Port API fix endpoint, then reports which fixes were applied

Each flow can be run as console-only output or as a report (HTML + JSON) generator.

## Prerequisites

- Node.js (v16 or higher)
- npm
- Port API credentials (Client ID and Client Secret) for each organization you want to check

## Installation

1. Clone/Download this repository
2. Run `cd validate-pages`
3. Run `npm install` to install the dependencies
4. Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

## Configuration

The scripts are configured entirely through environment variables (loaded from `.env`):

| Variable        | Required | Description                                                                                             |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `ORGANIZATIONS` | Yes      | JSON array of organizations to validate/fix. Each entry needs `CLIENT_ID` and `CLIENT_SECRET`; `NAME` is optional. |
| `PORT_API_URL`  | No       | Base URL of the Port API. Defaults to `https://api.getport.io`. Use `https://api.us.getport.io` for the US region. |

Example `ORGANIZATIONS` value (single line in `.env`):

```json
[{ "NAME": "my-org", "CLIENT_ID": "your_client_id_here", "CLIENT_SECRET": "your_client_secret_here" }]
```

## Validate

The script will:
1. Authenticate against each organization using its Port API credentials
2. List all pages in the organization (in compact form)
3. Validate each page via the Port API
4. Print any page that is invalid, together with its validation errors

### Console output

```bash
npm run validate
```

For each organization the script prints the organization name and the number of pages found, then lists any invalid pages:

```
[my-org] 42 pages
  INVALID some-broken-page: [{"message":"..."}]
```

If no invalid pages are found for an organization, only the summary line is printed. This mode does not write any files.

### Report files (HTML + JSON)

To generate shareable report files instead, run:

```bash
npm run validate:report
```

This creates, using one shared timestamp per run (e.g. `2026-08-27T23-15-42`):
- `output/validate-<timestamp>.html` — a styled HTML report with summary statistics (organizations, total pages, invalid pages, pages that failed to validate), a per-organization section listing each invalid page with its identifier, title, widget type/title, path, and validation error, and a "Failed to validate" table per organization for pages whose validation request errored (e.g. HTTP 500)
- `output/validate-report-<timestamp>.json` — the same data as structured JSON, with a top-level `summary` block (`totalOrganizations`, `totalPages`, `totalInvalid`, `totalFailed`) and a per-organization `invalidPages` count alongside the `failedPagesToValidate` array (pages whose validate request errored)

Open the HTML file in any browser to view it. The `output/` directory is git-ignored.

Note: each run writes new, uniquely-timestamped files, so previous reports are kept rather than overwritten. Clean up `output/` periodically if you don't need the history.

## Fix

The script will:
1. Authenticate against each organization using its Port API credentials
2. List all pages in the organization (in compact form)
3. Validate each page via the Port API
4. Apply client-side fixes on every page (including setting missing `displayMode` on table widgets inside dashboard widgets), then validate each page
5. For any page that is still invalid, call the Port API fix endpoint on it
6. Report the fixes that were applied to each page

Validation and fixing are interleaved page-by-page (rather than fixing everything in a second pass after all pages are validated), so partial progress is preserved if the script is interrupted.

Only the fixes that were actually applied are reported — the original/remaining errors are intentionally left out and not compared against the fix count, since a single fix operation can resolve multiple validation errors at once. **A page may still have remaining errors even after fixes were applied to it.** Re-run `npm run validate` (or `npm run validate:report`) afterwards to see what, if anything, remains on a page.

### Console output

```bash
npm run fix
```

For each organization the script prints progress per page, then a summary listing the fixes applied per page:

```
[my-org] 1 page(s) with fixes applied / 42 pages
  FIXES APPLIED some-broken-page:
    - Set displayMode to 'widget' for table-entities-explorer 'relatedTable' (was (missing))
    - Removed the id key from links in a links widget
  NO FIXES APPLIED another-page
```

If a page's validate or fix request itself errors (e.g. HTTP 500) rather than returning a normal validation result, it's listed separately at the end under "Unexpected failures to check", labeled `FAILED` (validate errored) or `FIX FAILED` (fix errored).

### Report files (HTML + JSON)

To generate shareable report files instead, run:

```bash
npm run fix:report
```

This creates, using one shared timestamp per run (e.g. `2026-08-27T23-15-42`):
- `output/fix-report-<timestamp>.html` — a styled HTML report with summary statistics (organizations, pages with errors, pages with fixes applied, unexpected failures), a per-organization table listing each page that had errors along with the fix messages applied to it, and an "Unexpected failures" table per organization for pages whose validate or fix request errored
- `output/fix-report-<timestamp>.json` — the same data as structured JSON: a per-organization `fixes` array (each page's `fixedErrors` messages and whether `fixesApplied`), an `attemptedCount` (pages with errors) and `pagesWithFixesAppliedCount`, and an `unexpectedFailures` array (pages whose validate or fix request errored, each tagged with `stage: "validate"` or `"fix"`)

Open the HTML file in any browser to view it. The `output/` directory is git-ignored.

Note: each run writes new, uniquely-timestamped files, so previous reports are kept rather than overwritten. Clean up `output/` periodically if you don't need the history.
