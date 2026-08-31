/**
 * Script: Fix Port Pages (report)
 *
 * Same validate + fix flow as `fix.js`, but instead of console-only output it
 * writes both a styled HTML report (`output/fix-report-<timestamp>.html`)
 * and a JSON report (`output/fix-report-<timestamp>.json`) summarizing the
 * fixes made across all configured organizations. Each run gets its own
 * timestamped files, so previous reports are never overwritten.
 *
 * Usage: `npm run fix:report`
 *
 * See `.env.example` for the required configuration.
 */

require("dotenv").config();

const { KeyError, getApiUrl, parseOrgs, collectFixes } = require("./portClient");
const {
  generateFixReport,
  generateFixJsonReport,
  formatTimestampForFilename,
} = require("./reportUtils");

async function main() {
  const apiUrl = getApiUrl();
  const orgs = parseOrgs();

  const results = [];
  for (const org of orgs) {
    const result = await collectFixes(apiUrl, org);
    const pagesWithFixesApplied = result.fixes.filter((fix) => fix.fixesApplied).length;
    console.log(
      `[${result.name}] ${result.totalPages} pages, applied fixes to ${pagesWithFixesApplied}/${result.fixes.length} page(s) with errors`
    );
    results.push(result);
  }

  // Share one timestamp between the HTML and JSON reports so a single run's
  // pair of files is easy to identify together.
  const timestamp = formatTimestampForFilename();

  const htmlPath = generateFixReport(results, timestamp);
  console.log(`\nHTML report written to ${htmlPath}`);

  const jsonPath = generateFixJsonReport(results, timestamp);
  console.log(`JSON report written to ${jsonPath}`);
}

main().catch((error) => {
  if (error instanceof KeyError) {
    console.error(`Missing env/config key: ${error.message}`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
});
