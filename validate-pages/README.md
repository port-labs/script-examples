# Validate Pages Script

This script iterates over one or more Port organizations, lists every page in each organization, and validates them via the Port API. Any page that fails validation is printed along with its validation errors.

The script will:
1. Authenticate against each organization using its Port API credentials
2. List all pages in the organization (in compact form)
3. Validate each page via the Port API
4. Print any page that is invalid, together with its validation errors

It can output results in two ways:
- **Console** (`npm start`) — prints invalid pages to the terminal
- **HTML report** (`npm run report`) — generates a styled report at `output/index.html`

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

The script is configured entirely through environment variables (loaded from `.env`):

| Variable        | Required | Description                                                                                             |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `ORGANIZATIONS` | Yes      | JSON array of organizations to validate. Each entry needs `CLIENT_ID` and `CLIENT_SECRET`; `NAME` is optional. |
| `PORT_API_URL`  | No       | Base URL of the Port API. Defaults to `https://api.getport.io`. Use `https://api.us.getport.io` for the US region. |

Example `ORGANIZATIONS` value (single line in `.env`):

```json
[{ "NAME": "my-org", "CLIENT_ID": "your_client_id_here", "CLIENT_SECRET": "your_client_secret_here" }]
```

## Running the Script

### Console output

Run the script with the following command:

```bash
npm start
```

For each organization the script prints the organization name and the number of pages found, then lists any invalid pages:

```
[my-org] 42 pages
  INVALID some-broken-page: [{"message":"..."}]
```

If no invalid pages are found for an organization, only the summary line is printed.

### HTML report

To generate a shareable HTML report instead, run:

```bash
npm run report
```

This creates `output/index.html` with:
- Summary statistics (organizations, total pages, invalid pages)
- A per-organization section listing each invalid page with its identifier, title, and validation errors

Open the file in any browser to view it. The `output/` directory is git-ignored.
