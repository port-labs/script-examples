/**
 * Script: Fix Port Pages
 *
 * This script iterates over one or more Port organizations, lists every page in
 * each organization, and validates them via the Port API. Any page that fails
 * validation immediately has the Port API fix endpoint called on it, and the
 * fixes that were applied are printed.
 *
 * Required environment variables (see .env.example):
 *   - ORGANIZATIONS: A JSON array of organizations to validate/fix. Each entry
 *     must contain CLIENT_ID and CLIENT_SECRET, and may optionally contain NAME.
 *
 * Optional environment variables:
 *   - PORT_API_URL: Base URL of the Port API (defaults to https://api.getport.io).
 *
 * To generate a report file (JSON or HTML) instead of console-only output, run
 * `npm run fix:report`.
 */

require("dotenv").config();

const { KeyError, getApiUrl, parseOrgs, collectFixes } = require("./portClient");

async function main() {
  const apiUrl = getApiUrl();
  const orgs = parseOrgs();

  const results = [];
  for (const org of orgs) {
    results.push(await collectFixes(apiUrl, org));
  }

  printSummary(results);
}

/**
 * Prints a consolidated summary of pages that had fixes applied across all
 * organizations, grouped by organization, after all fixing has finished.
 * Only the messages for fixes that were actually applied are printed; the
 * original/remaining errors are not listed or compared against them. Pages
 * that could not be validated or fixed are listed separately at the end so
 * they can be manually checked in their organization.
 *
 * @param {Array<{name: string, totalPages: number, fixes: Array<{identifier: string, title?: string, errorsBefore: any[], fixedErrors: Array<{name: string, message: string}>, fixesApplied: boolean}>, unexpectedFailures?: Array<{identifier: string, title?: string, reason: string, stage: "validate"|"fix"}>}>} results
 */
function printSummary(results) {
  const totalPagesWithFixesApplied = results.reduce(
    (sum, org) => sum + org.fixes.filter((fix) => fix.fixesApplied).length,
    0
  );
  const totalUnexpectedFailures = results.reduce(
    (sum, org) => sum + (org.unexpectedFailures ? org.unexpectedFailures.length : 0),
    0
  );

  console.log("\n==================== SUMMARY ====================");

  for (const org of results) {
    const orgPagesWithFixesApplied = org.fixes.filter((fix) => fix.fixesApplied).length;
    console.log(
      `\n[${org.name}] ${orgPagesWithFixesApplied} page(s) with fixes applied / ${org.totalPages} pages`
    );

    if (org.fixes.length === 0) {
      console.log("  No pages needed fixing");
    } else {
      for (const fix of org.fixes) {
        if (fix.fixesApplied) {
          console.log(`  FIXES APPLIED ${fix.identifier}:`);
          for (const fixedError of fix.fixedErrors) {
            console.log(`    - ${fixedError.message || fixedError.name}`);
          }
        } else {
          console.log(`  NO FIXES APPLIED ${fix.identifier}`);
        }
      }
    }
  }

  console.log(
    `\nTotal: ${totalPagesWithFixesApplied} page(s) with fixes applied across ${results.length} organization(s)`
  );
  console.log(
    "Re-run `npm run validate` (or `npm run validate:report`) to see which errors, if any, remain on these pages."
  );

  if (totalUnexpectedFailures > 0) {
    console.log("\n---- Unexpected failures to check ----");
    for (const org of results) {
      if (!org.unexpectedFailures || org.unexpectedFailures.length === 0) continue;
      console.log(`\n[${org.name}]`);
      for (const failed of org.unexpectedFailures) {
        const label = failed.stage === "fix" ? "FIX FAILED" : "FAILED";
        console.log(`  ${label} ${failed.identifier}: ${failed.reason}`);
      }
    }
    console.log(
      `\nTotal: ${totalUnexpectedFailures} unexpected failure(s) across ${results.length} organization(s)`
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
