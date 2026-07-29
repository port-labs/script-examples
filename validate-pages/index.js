/**
 * Script: Validate Port Pages
 *
 * This script iterates over one or more Port organizations, lists every page in
 * each organization, and validates them via the Port API. Any page that fails
 * validation is printed along with its validation errors.
 *
 * Required environment variables (see .env.example):
 *   - ORGANIZATIONS: A JSON array of organizations to validate. Each entry must
 *     contain CLIENT_ID and CLIENT_SECRET, and may optionally contain NAME.
 *
 * Optional environment variables:
 *   - PORT_API_URL: Base URL of the Port API (defaults to https://api.getport.io).
 *
 * To generate an HTML report instead of console output, run `npm run report`.
 */

require("dotenv").config();

const { KeyError, getApiUrl, parseOrgs, collectFindings } = require("./portClient");

async function main() {
  const apiUrl = getApiUrl();
  const orgs = parseOrgs();

  const results = [];
  for (const org of orgs) {
    results.push(await collectFindings(apiUrl, org));
  }

  printSummary(results);
}

/**
 * Prints a consolidated summary of invalid pages across all organizations,
 * grouped by organization, after all validation has finished. Pages that could
 * not be validated (e.g. the validate request errored) are listed separately at
 * the end so they can be manually checked in their organization.
 *
 * @param {Array<{name: string, totalPages: number, findings: Array<{identifier: string, errors: any[]}>, failedPages?: Array<{identifier: string, title?: string, reason: string}>}>} results
 */
function printSummary(results) {
  const totalInvalid = results.reduce(
    (sum, org) => sum + org.findings.length,
    0
  );
  const totalFailed = results.reduce(
    (sum, org) => sum + (org.failedPages ? org.failedPages.length : 0),
    0
  );

  console.log("\n==================== SUMMARY ====================");

  for (const org of results) {
    console.log(`\n[${org.name}] ${org.findings.length} invalid / ${org.totalPages} pages`);

    if (org.findings.length === 0) {
      console.log("  All pages are valid");
    } else {
      for (const finding of org.findings) {
        console.log(
          `  INVALID ${finding.identifier}: ${JSON.stringify(finding.errors)}`
        );
      }
    }
  }

  console.log(
    `\nTotal: ${totalInvalid} invalid page(s) across ${results.length} organization(s)`
  );

  if (totalFailed > 0) {
    console.log("\n---- Failed pages to check (validation errored) ----");
    for (const org of results) {
      if (!org.failedPages || org.failedPages.length === 0) continue;
      console.log(`\n[${org.name}]`);
      for (const failed of org.failedPages) {
        console.log(`  FAILED ${failed.identifier}: ${failed.reason}`);
      }
    }
    console.log(
      `\nTotal: ${totalFailed} page(s) failed to validate across ${results.length} organization(s)`
    );
  }
}

main().catch((error) => {
  if (error instanceof KeyError) {
    console.error(`Missing env/config key: ${error.message}`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
});
