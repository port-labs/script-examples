const axios = require("axios");

/**
 * Mirrors Python's KeyError so we can report a missing env/config key the same
 * way the original script did.
 */
class KeyError extends Error {
  constructor(key) {
    super(`'${key}'`);
    this.name = "KeyError";
  }
}

/**
 * Reads the Port API base URL from the environment, stripping any trailing
 * slashes. Defaults to https://api.getport.io.
 *
 * @returns {string}
 */
function getApiUrl() {
  return (process.env.PORT_API_URL || "https://api.getport.io").replace(
    /\/+$/,
    ""
  );
}

/**
 * Parses the ORGANIZATIONS environment variable into an array of org configs.
 *
 * @returns {Array<{CLIENT_ID: string, CLIENT_SECRET: string, NAME?: string}>}
 */
function parseOrgs() {
  if (!process.env.ORGANIZATIONS) {
    throw new KeyError("ORGANIZATIONS");
  }

  try {
    return JSON.parse(process.env.ORGANIZATIONS);
  } catch (error) {
    throw new Error(`ORGANIZATIONS is not valid JSON: ${error.message}`);
  }
}

// Page identifiers to skip during validation (e.g. built-in system pages).
const SKIP_PAGE_IDENTIFIERS = new Set(["$run"]);

async function getToken(apiUrl, clientId, clientSecret) {
  const res = await axios.post(`${apiUrl}/v1/auth/access_token`, {
    clientId,
    clientSecret,
  });
  return res.data.accessToken;
}

/**
 * Authenticates against a single org, lists its pages, validates each one, and
 * returns the org name, total page count, and the invalid pages ("findings").
 *
 * @param {string} apiUrl
 * @param {{CLIENT_ID: string, CLIENT_SECRET: string, NAME?: string}} org
 * @returns {Promise<{name: string, totalPages: number, findings: Array<{identifier: string, title?: string, errors: any[]}>}>}
 */
async function collectFindings(apiUrl, org) {
  if (!org.CLIENT_ID) throw new KeyError("CLIENT_ID");
  if (!org.CLIENT_SECRET) throw new KeyError("CLIENT_SECRET");

  const clientId = org.CLIENT_ID;
  const name = org.NAME || clientId.slice(0, 8);

  console.log(`\nConnecting to organization: ${name}`);
  const token = await getToken(apiUrl, clientId, org.CLIENT_SECRET);
  const headers = { Authorization: `Bearer ${token}` };

  console.log("  Fetching pages...");
  const pagesRes = await axios.get(`${apiUrl}/v1/pages/`, {
    params: { compact: "true" },
    headers,
  });
  const pages = pagesRes.data.pages.filter(
    (page) => !SKIP_PAGE_IDENTIFIERS.has(page.identifier)
  );

  console.log(`Found ${pages.length} pages to validate`);
  const findings = [];
  const failedPages = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const identifier = page.identifier;

    console.log(`  [${i + 1}/${pages.length}] Validating ${identifier}`);
    try {
      const validateRes = await axios.get(
        `${apiUrl}/v1/pages/${identifier}/validate`,
        { headers }
      );
      const result = validateRes.data;
      if (!(result.valid ?? true)) {
        findings.push({
          identifier,
          title: page.title,
          errors: result.errors || [],
        });
      }
    } catch (error) {
      const reason = error.response
        ? `HTTP ${error.response.status}`
        : error.message;
      console.warn(`  WARNING: failed to validate ${identifier}: ${reason}`);
      failedPages.push({ identifier, title: page.title, reason });
    }
  }

  console.log(
    `  Done with ${name}: ${findings.length} invalid page(s) out of ${pages.length}` +
      (failedPages.length ? `, ${failedPages.length} failed to validate` : "")
  );
  return { name, totalPages: pages.length, findings, failedPages };
}

module.exports = {
  KeyError,
  getApiUrl,
  parseOrgs,
  getToken,
  collectFindings,
};
