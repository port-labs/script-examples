# Persistent Calculation Properties Visibility Script

This script analyzes your Port organization's calculation properties to identify potential breaking changes before enabling **persistent calculation properties**.

The script will:
1. Connect to your Port organization
2. Check if persistent calculation properties are already enabled
3. Scan all blueprint calculation properties for breaking patterns
4. Generate an HTML report in the `output/` directory

## What Does it Check?

The script detects two breaking changes documented in [the Port docs](https://docs.port.io/build-your-software-catalog/customize-integrations/configure-data-model/setup-blueprint/properties/calculation-property/#breaking-changes):

### 1. Relative date (`now` in JQ)
Calculations using the `now` JQ function will no longer be evaluated at request time. Values will only be accurate to roughly an hour.

### 2. Relation titles / identifiers (`.relations.<name>.title` or `.relations.<name>.identifier`)
With persistent calculation, relations are plain strings (identifiers only), not objects with `.title` or `.identifier` fields. JQ expressions referencing `.relations.<name>.title` will break.

## Prerequisites

- Node.js (v16 or higher)
- npm
- Port API credentials (Client ID and Client Secret)

## Installation

1. Clone/Download this repository
2. Run `cd persistent-calculation-properties`
3. Run `npm install` to install the dependencies
4. Create a `config.json` file in the root of the directory with the following structure:

```json5
{
    "REGION": "eu", // "eu" or "us"
    "CLIENT_ID": "your_client_id_here",
    "CLIENT_SECRET": "your_client_secret_here"
}
```

## Running the Script

Run the script with the following command:

```bash
npm start
```

## Output

The script generates an HTML report (`output/index.html`) that includes:
- Summary statistics (total blueprints, total calculation properties, findings count)
- A table of calculation properties requiring review, with blueprint, property identifier, JQ expression, and reason
- If the organization already has persistent calculation properties enabled, a banner indicating no action is required
