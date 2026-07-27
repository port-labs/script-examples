/**
 * Script: Validate Port Pages (HTML report)
 *
 * Same validation as `index.js`, but instead of printing to the console it
 * generates a styled HTML report at `output/index.html` summarizing the invalid
 * pages across all configured organizations.
 *
 * Usage: `npm run report`
 *
 * See `.env.example` for the required configuration.
 */

require("dotenv").config();

const { KeyError, getApiUrl, parseOrgs, collectFindings } = require("./portClient");
const { generateReport } = require("./reportUtils");

async function main() {
  const apiUrl = getApiUrl();
  const orgs = parseOrgs();

  const results = [];
  for (const org of orgs) {
    const result = await collectFindings(apiUrl, org);
    console.log(
      `[${result.name}] ${result.totalPages} pages, ${result.findings.length} invalid`
    );
    results.push(result);
  }

  const outputPath = generateReport(results);
  console.log(`\nReport written to ${outputPath}`);
}

main().catch((error) => {
  if (error instanceof KeyError) {
    console.error(`Missing env/config key: ${error.message}`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
});
