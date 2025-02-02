# Users and Teams as Blueprints Migration Visibility Script

This script helps analyze your Port organization's readiness for the Users and Teams as Blueprints migration by identifying all resources that reference teams and need to be reviewed.

The script will:
1. Connect to your Port organization
2. Analyze all resources for team references
3. Generate an HTML report in the `output/<org-id>` directory

## What Does it Check?

The script analyzes:

- Blueprints with team inheritance
- Blueprints with team values
- Actions referencing teams
- Action permissions with team configurations
- Integrations with team mappings
- Webhooks with team references
- Pages with team-related widgets
- Page permissions with team configurations
- Blueprint permissions with team configurations

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Port API credentials (Client ID and Client Secret)

## Installation

1. Clone/Download this repository
2. Run `cd users-and-teams-as-blueprints-migration-visibility-script`
3. Run `npm install` to install the dependencies
4. Create a `config.json` file in the root of the repository with the following structure:

```json
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

The script generates an HTML report that includes:
- Summary statistics
- Detailed lists of resources that need review
- Checkboxes to track review progress
