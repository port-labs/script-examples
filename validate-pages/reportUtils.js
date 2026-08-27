const fs = require("fs");
const path = require("path");

const DOCS_URL = "https://docs.port.io/api-reference/pages/";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MUTED = '<span class="subtitle">—</span>';

/**
 * Formats a date as a filesystem-safe, sortable timestamp suffix (e.g.
 * "2026-08-27T23-15-42") for use in report filenames so each run's report
 * doesn't overwrite the previous one.
 *
 * @param {Date} [date]
 * @returns {string}
 */
function formatTimestampForFilename(date = new Date()) {
  return date.toISOString().replace(/:/g, "-").split(".")[0];
}

/**
 * Normalizes a validation error (which may be a plain string or an object) into
 * a consistent shape, pulling out widget details when they exist.
 *
 * @param {any} error
 * @returns {{widgetType: string, widgetTitle: string, path: string, message: string}}
 */
function normalizeError(error) {
  if (error && typeof error === "object") {
    const widget = error.widget || {};
    return {
      widgetType: error.widgetType || widget.type || "",
      widgetTitle: error.widgetTitle || widget.title || "",
      path: formatPath(error.path),
      message: error.message || error.error || JSON.stringify(error),
    };
  }
  return { widgetType: "", widgetTitle: "", path: "", message: String(error) };
}

/**
 * Formats a validation error path into a readable string. Paths may be provided
 * as an array of segments (e.g. ["widgets", 0, "dataset"]) or a plain string.
 *
 * @param {any} path
 * @returns {string}
 */
function formatPath(path) {
  if (Array.isArray(path)) {
    return path.join(".");
  }
  if (path === undefined || path === null) {
    return "";
  }
  return String(path);
}

/**
 * Renders one table row per validation error for a page. When a page has no
 * error details, a single placeholder row is rendered instead.
 *
 * @param {{identifier: string, title?: string, errors: any[]}} finding
 * @returns {string}
 */
function renderFindingRows(finding) {
  const identifierCell = `<code>${escapeHtml(finding.identifier)}</code>`;
  const titleCell = finding.title ? escapeHtml(finding.title) : MUTED;

  if (!finding.errors.length) {
    return `
							<tr>
								<td>${identifierCell}</td>
								<td>${titleCell}</td>
								<td>${MUTED}</td>
								<td>${MUTED}</td>
								<td>${MUTED}</td>
								<td><span class="subtitle">No details provided</span></td>
							</tr>`;
  }

  return finding.errors
    .map((error) => {
      const { widgetType, widgetTitle, path, message } = normalizeError(error);
      return `
							<tr>
								<td>${identifierCell}</td>
								<td>${titleCell}</td>
								<td>${widgetType ? `<code>${escapeHtml(widgetType)}</code>` : MUTED}</td>
								<td>${widgetTitle ? escapeHtml(widgetTitle) : MUTED}</td>
								<td>${path ? `<code>${escapeHtml(path)}</code>` : MUTED}</td>
								<td><code>${escapeHtml(message)}</code></td>
							</tr>`;
    })
    .join("");
}

/**
 * Renders a table of pages that could not be validated (the validate request
 * errored). Returns an empty string when there are no such pages.
 *
 * @param {{failedPages?: Array<{identifier: string, title?: string, reason: string}>}} org
 * @returns {string}
 */
function renderFailedSection(org) {
  const failedPages = org.failedPages || [];
  if (!failedPages.length) {
    return "";
  }

  const rows = failedPages
    .map(
      (page) => `
							<tr>
								<td><code>${escapeHtml(page.identifier)}</code></td>
								<td>${page.title ? escapeHtml(page.title) : MUTED}</td>
								<td><code>${escapeHtml(page.reason)}</code></td>
							</tr>`
    )
    .join("");

  return `
				<h3 class="failed-heading">Failed to validate (${failedPages.length})</h3>
				<p class="section-note">These pages could not be validated because the validation request errored. Check them manually in the organization.</p>
				<div class="table-container">
					<table>
						<thead>
							<tr>
								<th>Page Identifier</th>
								<th>Title</th>
								<th>Reason</th>
							</tr>
						</thead>
						<tbody>
							${rows}
						</tbody>
					</table>
				</div>`;
}

function renderOrgSection(org) {
  const failedCount = org.failedPages ? org.failedPages.length : 0;
  const hasIssues = org.findings.length || failedCount;

  const emptyMessage = failedCount
    ? "No invalid pages found"
    : "All pages are valid 🎉";

  const rows = org.findings.length
    ? org.findings.map(renderFindingRows).join("")
    : `<tr><td colspan="6" class="empty-state">${emptyMessage}</td></tr>`;

  return `
			<details class="section" open>
				<summary class="section-header">
					<h2>${escapeHtml(org.name)}</h2>
					<span class="section-badge ${hasIssues ? "badge-error" : "badge-success"}">
						${org.findings.length} invalid${failedCount ? ` &middot; ${failedCount} failed` : ""} / ${org.totalPages} pages
					</span>
				</summary>
				<div class="table-container">
					<table>
						<thead>
							<tr>
								<th>Page Identifier</th>
								<th>Title</th>
								<th>Widget Type</th>
								<th>Widget Title</th>
								<th>Path</th>
								<th>Error</th>
							</tr>
						</thead>
						<tbody>
							${rows}
						</tbody>
					</table>
				</div>
				${renderFailedSection(org)}
			</details>`;
}

/**
 * Generates an HTML report of invalid pages across all organizations and writes
 * it to output/validate-<timestamp>.html so each run's report is kept.
 *
 * @param {Array<{name: string, totalPages: number, findings: Array<{identifier: string, title?: string, errors: any[]}>}>} results
 * @param {string} [timestamp] Filename timestamp suffix; pass the same value
 *   used for a companion JSON report so both files share one timestamp.
 * @returns {string} The absolute path to the generated report.
 */
function generateReport(results, timestamp = formatTimestampForFilename()) {
  const totalOrgs = results.length;
  const totalPages = results.reduce((sum, org) => sum + org.totalPages, 0);
  const totalInvalid = results.reduce(
    (sum, org) => sum + org.findings.length,
    0
  );
  const totalFailed = results.reduce(
    (sum, org) => sum + (org.failedPages ? org.failedPages.length : 0),
    0
  );

  const generatedAt = new Date().toLocaleString();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Port Pages Validation Report</title>
	<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
	<style>
		:root {
			--primary-color: #3498db;
			--secondary-color: #2c3e50;
			--background-color: #f5f5f5;
			--card-background: #ffffff;
			--border-color: #e1e4e8;
			--hover-color: #f8f9fa;
			--text-primary: #2c3e50;
			--text-secondary: #6c757d;
			--text-color: #333;
			--success-bg: #d4edda;
			--success-border: #c3e6cb;
			--success-text: #155724;
			--error-bg: #f8d7da;
			--error-border: #f5c6cb;
			--error-text: #721c24;
		}

		body {
			font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			margin: 0;
			padding: 20px;
			background-color: var(--background-color);
			color: var(--text-primary);
		}

		.container {
			max-width: 1400px;
			margin: 0 auto;
			background-color: var(--card-background);
			padding: 30px;
			border-radius: 12px;
			box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		}

		h1 {
			color: var(--secondary-color);
			text-align: left;
			margin-bottom: 30px;
			font-size: 1.8em;
			border-bottom: 2px solid var(--primary-color);
			padding-bottom: 15px;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.generated-at {
			display: block;
			font-size: 13px;
			font-weight: 400;
			color: var(--text-secondary);
			margin-top: 6px;
		}

		.logo {
			height: 40px;
			margin-left: 20px;
		}

		.logo svg {
			height: 40px;
			width: auto;
		}

		.logo path {
			fill: var(--secondary-color);
		}

		.summary {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
			gap: 20px;
			margin-bottom: 40px;
		}

		.stat-box {
			background-color: var(--card-background);
			padding: 20px;
			border-radius: 10px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
			border: 1px solid var(--border-color);
			transition: transform 0.2s ease;
		}

		.stat-box:hover {
			transform: translateY(-2px);
		}

		.stat-number {
			font-size: 32px;
			font-weight: bold;
			color: var(--primary-color);
			margin-bottom: 8px;
		}

		.stat-number.error {
			color: var(--error-text);
		}

		.stat-label {
			color: var(--text-secondary);
			font-size: 16px;
			font-weight: 500;
		}

		.stat-note {
			color: var(--text-secondary);
			font-size: 11px;
			font-weight: 400;
			margin-top: 4px;
			line-height: 1.3;
		}

		.section {
			margin-bottom: 40px;
			background-color: var(--card-background);
			border-radius: 10px;
			padding: 20px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		}

		h2 {
			color: var(--secondary-color);
			margin: 0;
			flex-grow: 1;
			font-size: 1.4em;
		}

		.section-header {
			display: flex;
			align-items: center;
			gap: 12px;
			margin-bottom: 16px;
		}

		summary.section-header {
			cursor: pointer;
			list-style: none;
			user-select: none;
		}

		summary.section-header::-webkit-details-marker {
			display: none;
		}

		summary.section-header::before {
			content: "▶";
			font-size: 11px;
			color: var(--text-secondary);
			transition: transform 0.2s ease;
		}

		details[open] > summary.section-header::before {
			transform: rotate(90deg);
		}

		.section-badge {
			font-size: 13px;
			font-weight: 600;
			padding: 4px 12px;
			border-radius: 999px;
			white-space: nowrap;
		}

		.badge-success {
			background-color: var(--success-bg);
			border: 1px solid var(--success-border);
			color: var(--success-text);
		}

		.badge-error {
			background-color: var(--error-bg);
			border: 1px solid var(--error-border);
			color: var(--error-text);
		}

		table {
			width: 100%;
			border-collapse: separate;
			border-spacing: 0;
			font-size: 14px;
		}

		th, td {
			padding: 12px 15px;
			text-align: left;
			border-bottom: 1px solid var(--border-color);
			vertical-align: top;
		}

		th {
			background-color: var(--hover-color);
			font-weight: 600;
			color: var(--secondary-color);
			position: sticky;
			top: 0;
		}

		tr:hover {
			background-color: var(--hover-color);
		}

		.table-container {
			max-height: 600px;
			overflow-y: auto;
			border: 1px solid var(--border-color);
			border-radius: 6px;
		}

		.empty-state {
			text-align: center;
			padding: 20px;
			color: var(--text-secondary);
			font-style: italic;
		}

		.subtitle {
			color: var(--text-secondary);
			font-size: 13px;
		}

		.failed-heading {
			color: var(--error-text);
			margin: 28px 0 4px;
			font-size: 1.1em;
		}

		.section-note {
			color: var(--text-secondary);
			font-size: 13px;
			margin: 0 0 12px;
		}

		ul.errors {
			margin: 0;
			padding-left: 18px;
		}

		ul.errors li {
			margin-bottom: 4px;
		}

		code {
			font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
			font-size: 13px;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>
			<div>
				Port Pages Validation Report
				<span class="generated-at">Generated ${escapeHtml(generatedAt)}</span>
			</div>
			<div class="logo">
				<svg width="72" height="24" viewBox="0 0 73 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" title="Port logo">
					<path d="M68.8428 18.7115C67.9809 18.7115 67.2772 18.4477 66.7319 17.92C66.2042 17.3747 65.9404 16.6535 65.9404 15.7564V8.36843H62.6686V5.62434H65.9404V1.56097H69.2649V5.62434H72.8534V8.36843H69.2649V15.1759C69.2649 15.7036 69.5112 15.9674 70.0037 15.9674H72.5367V18.7115H68.8428Z"></path>
					<path d="M53.368 18.7116V5.62443H56.6398V7.10201H57.1148C57.3083 6.5743 57.6249 6.18732 58.0647 5.94105C58.522 5.69479 59.0497 5.57166 59.6478 5.57166H61.2309V8.52683H59.595C58.7507 8.52683 58.0559 8.7555 57.5106 9.21285C56.9653 9.65261 56.6926 10.3386 56.6926 11.2709V18.7116H53.368Z"></path>
					<path d="M44.7584 19.0806C43.4567 19.0806 42.2869 18.8167 41.2491 18.289C40.2113 17.7613 39.3933 16.9961 38.7952 15.9935C38.1972 14.9908 37.8981 13.7859 37.8981 12.3787V11.9565C37.8981 10.5493 38.1972 9.34433 38.7952 8.34168C39.3933 7.33903 40.2113 6.57385 41.2491 6.04614C42.2869 5.51843 43.4567 5.25458 44.7584 5.25458C46.06 5.25458 47.2298 5.51843 48.2676 6.04614C49.3055 6.57385 50.1234 7.33903 50.7215 8.34168C51.3195 9.34433 51.6186 10.5493 51.6186 11.9565V12.3787C51.6186 13.7859 51.3195 15.0172 50.7215 16.0199C50.1234 17.0225 49.3055 17.7877 48.2676 18.3154C47.2298 18.8255 46.06 19.0806 44.7584 19.0806ZM44.7584 16.1254C45.7786 16.1254 46.6229 15.8 47.2914 15.1491C47.9598 14.4807 48.294 13.5308 48.294 12.2995V12.0356C48.294 10.8043 47.9598 9.86324 47.2914 9.2124C46.6405 8.54397 45.7962 8.20975 44.7584 8.20975C43.7381 8.20975 42.8938 8.54397 42.2254 9.2124C41.5569 9.86324 41.2227 10.8043 41.2227 12.0356V12.2995C41.2227 13.5308 41.5569 14.4807 42.2254 15.1491C42.8938 15.8 43.7381 16.1254 44.7584 16.1254Z"></path>
					<path d="M23.0248 23.9883V5.62398H26.2966V7.2071H26.7715C27.0706 6.69698 27.5367 6.24843 28.1699 5.86145C28.8032 5.45687 29.7091 5.25458 30.8877 5.25458C31.9431 5.25458 32.9193 5.51843 33.8164 6.04614C34.7136 6.55626 35.4348 7.31265 35.9801 8.31529C36.5254 9.31794 36.798 10.5317 36.798 11.9565V12.3787C36.798 13.8035 36.5254 15.0172 35.9801 16.0199C35.4348 17.0225 34.7136 17.7877 33.8164 18.3154C32.9193 18.8255 31.9431 19.0806 30.8877 19.0806C30.0961 19.0806 29.4277 18.9838 28.8824 18.7903C28.3546 18.6144 27.9237 18.3858 27.5895 18.1043C27.2728 17.8053 27.0178 17.5062 26.8243 17.2072H26.3494V23.9883H23.0248ZM29.885 16.1782C30.9228 16.1782 31.776 15.8527 32.4444 15.2019C33.1304 14.5335 33.4734 13.566 33.4734 12.2995V12.0356C33.4734 10.7691 33.1304 9.81047 32.4444 9.15963C31.7584 8.4912 30.9052 8.15698 29.885 8.15698C28.8648 8.15698 28.0116 8.4912 27.3256 9.15963C26.6396 9.81047 26.2966 10.7691 26.2966 12.0356V12.2995C26.2966 13.566 26.6396 14.5335 27.3256 15.2019C28.0116 15.8527 28.8648 16.1782 29.885 16.1782Z"></path>
					<path fill-rule="evenodd" clip-rule="evenodd" d="M0 12.7805L9.01713 12.7805L0 3.7638V12.7805ZM0.0108084 15.9024C0.160464 17.921 1.84563 19.5122 3.90244 19.5122H17.9512V5.46341C17.9512 3.40661 16.36 1.72145 14.3415 1.57178L14.3414 15.9024L11.1219 15.9024L0.0108084 15.9024ZM11.122 1.56097L11.122 10.4702L2.21228 1.56097H11.122Z"></path>
				</svg>
			</div>
		</h1>

		<div class="summary">
			<div class="stat-box">
				<div class="stat-number">${totalOrgs}</div>
				<div class="stat-label">Organizations</div>
			</div>
			<div class="stat-box">
				<div class="stat-number">${totalPages}</div>
				<div class="stat-label">Total Pages</div>
			</div>
			<div class="stat-box">
				<div class="stat-number ${totalInvalid ? "error" : ""}">${totalInvalid}</div>
				<div class="stat-label">Invalid Pages</div>
			</div>
			<div class="stat-box">
				<div class="stat-number ${totalFailed ? "error" : ""}">${totalFailed}</div>
				<div class="stat-label">Failed to Validate</div>
			</div>
		</div>

		${results.map(renderOrgSection).join("")}

		<p class="subtitle">
			Learn more about Port pages in the
			<a href="${DOCS_URL}" target="_blank">documentation</a>.
		</p>
	</div>
</body>
</html>`;

  const outputDir = path.join(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `validate-${timestamp}.html`);
  fs.writeFileSync(outputPath, html);

  return outputPath;
}

/**
 * Renders one table row per fix message applied to a page, plus a status
 * row when the fix request succeeded but applied nothing ("no fixes
 * applied"). Only the fixes that were applied are shown here —
 * remaining/original errors are intentionally not listed or compared;
 * re-run validate to see what's left on a page.
 *
 * @param {{identifier: string, title?: string, fixedErrors: Array<{name: string, message: string}>, fixesApplied: boolean}} fix
 * @returns {string}
 */
function renderFixRows(fix) {
  const identifierCell = `<code>${escapeHtml(fix.identifier)}</code>`;
  const titleCell = fix.title ? escapeHtml(fix.title) : MUTED;
  const statusBadge = fix.fixesApplied
    ? `<span class="section-badge badge-success">Fixes applied</span>`
    : `<span class="section-badge badge-error">No fixes applied</span>`;

  if (!fix.fixedErrors.length) {
    return `
							<tr>
								<td>${identifierCell}</td>
								<td>${titleCell}</td>
								<td>${statusBadge}</td>
								<td>${MUTED}</td>
								<td><span class="subtitle">No fixes were applied</span></td>
							</tr>`;
  }

  return fix.fixedErrors
    .map((fixedError, index) => {
      const name = fixedError.name || "";
      const message = fixedError.message || JSON.stringify(fixedError);
      return `
							<tr>
								<td>${index === 0 ? identifierCell : ""}</td>
								<td>${index === 0 ? titleCell : ""}</td>
								<td>${index === 0 ? statusBadge : ""}</td>
								<td>${name ? `<code>${escapeHtml(name)}</code>` : MUTED}</td>
								<td><code>${escapeHtml(message)}</code></td>
							</tr>`;
    })
    .join("");
}

/**
 * Renders a table of pages where either the validate or the fix request
 * itself errored. Returns an empty string when there are no such pages.
 *
 * @param {{unexpectedFailures?: Array<{identifier: string, title?: string, reason: string, stage: "validate"|"fix"}>}} org
 * @returns {string}
 */
function renderUnexpectedFailuresSection(org) {
  const unexpectedFailures = org.unexpectedFailures || [];
  if (!unexpectedFailures.length) {
    return "";
  }

  const rows = unexpectedFailures
    .map(
      (page) => `
							<tr>
								<td><code>${escapeHtml(page.identifier)}</code></td>
								<td>${page.title ? escapeHtml(page.title) : MUTED}</td>
								<td>${page.stage === "fix" ? "Fix" : "Validate"}</td>
								<td><code>${escapeHtml(page.reason)}</code></td>
							</tr>`
    )
    .join("");

  return `
				<h3 class="failed-heading">Unexpected failures (${unexpectedFailures.length})</h3>
				<p class="section-note">These pages errored while validating or fixing (rather than having a fixable validation error). Check them manually in the organization.</p>
				<div class="table-container">
					<table>
						<thead>
							<tr>
								<th>Page Identifier</th>
								<th>Title</th>
								<th>Stage</th>
								<th>Reason</th>
							</tr>
						</thead>
						<tbody>
							${rows}
						</tbody>
					</table>
				</div>`;
}

function renderFixOrgSection(org) {
  const unexpectedFailuresCount = org.unexpectedFailures ? org.unexpectedFailures.length : 0;

  const emptyMessage = org.fixes.length || unexpectedFailuresCount
    ? "No pages needed fixing"
    : "No pages needed fixing 🎉";

  const rows = org.fixes.length
    ? org.fixes.map(renderFixRows).join("")
    : `<tr><td colspan="5" class="empty-state">${emptyMessage}</td></tr>`;

  return `
			<details class="section" open>
				<summary class="section-header">
					<h2>${escapeHtml(org.name)}</h2>
				</summary>
				<div class="table-container">
					<table>
						<thead>
							<tr>
								<th>Page Identifier</th>
								<th>Title</th>
								<th>Status</th>
								<th>Fix Applied</th>
								<th>Message</th>
							</tr>
						</thead>
						<tbody>
							${rows}
						</tbody>
					</table>
				</div>
				<p class="section-note">This report only lists the fixes that were applied. Re-run <code>npm run validate</code> (or <code>npm run validate:report</code>) to see which errors, if any, remain on these pages.</p>
				${renderUnexpectedFailuresSection(org)}
			</details>`;
}

/**
 * Generates an HTML report of fixed pages across all organizations and
 * writes it to output/fix-report-<timestamp>.html so each run's report is
 * kept.
 *
 * @param {Array<{name: string, totalPages: number, fixes: Array<{identifier: string, title?: string, errorsBefore: any[], fixedErrors: Array<{name: string, message: string}>, fixesApplied: boolean}>, unexpectedFailures?: Array<{identifier: string, title?: string, reason: string, stage: "validate"|"fix"}>}>} results
 * @param {string} [timestamp] Filename timestamp suffix; pass the same value
 *   used for a companion JSON report so both files share one timestamp.
 * @returns {string} The absolute path to the generated report.
 */
function generateFixReport(results, timestamp = formatTimestampForFilename()) {
  const totalOrgs = results.length;
  const totalPagesWithErrors = results.reduce((sum, org) => sum + org.fixes.length, 0);
  const totalPagesWithFixesApplied = results.reduce(
    (sum, org) => sum + org.fixes.filter((fix) => fix.fixesApplied).length,
    0
  );
  const totalUnexpectedFailures = results.reduce(
    (sum, org) => sum + (org.unexpectedFailures ? org.unexpectedFailures.length : 0),
    0
  );

  const generatedAt = new Date().toLocaleString();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Port Pages Fix Report</title>
	<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
	<style>
		:root {
			--primary-color: #3498db;
			--secondary-color: #2c3e50;
			--background-color: #f5f5f5;
			--card-background: #ffffff;
			--border-color: #e1e4e8;
			--hover-color: #f8f9fa;
			--text-primary: #2c3e50;
			--text-secondary: #6c757d;
			--text-color: #333;
			--success-bg: #d4edda;
			--success-border: #c3e6cb;
			--success-text: #155724;
			--error-bg: #f8d7da;
			--error-border: #f5c6cb;
			--error-text: #721c24;
		}

		body {
			font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			line-height: 1.6;
			margin: 0;
			padding: 20px;
			background-color: var(--background-color);
			color: var(--text-primary);
		}

		.container {
			max-width: 1400px;
			margin: 0 auto;
			background-color: var(--card-background);
			padding: 30px;
			border-radius: 12px;
			box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		}

		h1 {
			color: var(--secondary-color);
			text-align: left;
			margin-bottom: 30px;
			font-size: 1.8em;
			border-bottom: 2px solid var(--primary-color);
			padding-bottom: 15px;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.generated-at {
			display: block;
			font-size: 13px;
			font-weight: 400;
			color: var(--text-secondary);
			margin-top: 6px;
		}

		.logo {
			height: 40px;
			margin-left: 20px;
		}

		.logo svg {
			height: 40px;
			width: auto;
		}

		.logo path {
			fill: var(--secondary-color);
		}

		.summary {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
			gap: 20px;
			margin-bottom: 40px;
		}

		.stat-box {
			background-color: var(--card-background);
			padding: 20px;
			border-radius: 10px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
			border: 1px solid var(--border-color);
			transition: transform 0.2s ease;
		}

		.stat-box:hover {
			transform: translateY(-2px);
		}

		.stat-number {
			font-size: 32px;
			font-weight: bold;
			color: var(--primary-color);
			margin-bottom: 8px;
		}

		.stat-number.error {
			color: var(--error-text);
		}

		.stat-label {
			color: var(--text-secondary);
			font-size: 16px;
			font-weight: 500;
		}

		.stat-note {
			color: var(--text-secondary);
			font-size: 11px;
			font-weight: 400;
			margin-top: 4px;
			line-height: 1.3;
		}

		.section {
			margin-bottom: 40px;
			background-color: var(--card-background);
			border-radius: 10px;
			padding: 20px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		}

		h2 {
			color: var(--secondary-color);
			margin: 0;
			flex-grow: 1;
			font-size: 1.4em;
		}

		.section-header {
			display: flex;
			align-items: center;
			gap: 12px;
			margin-bottom: 16px;
		}

		summary.section-header {
			cursor: pointer;
			list-style: none;
			user-select: none;
		}

		summary.section-header::-webkit-details-marker {
			display: none;
		}

		summary.section-header::before {
			content: "▶";
			font-size: 11px;
			color: var(--text-secondary);
			transition: transform 0.2s ease;
		}

		details[open] > summary.section-header::before {
			transform: rotate(90deg);
		}

		.section-badge {
			font-size: 13px;
			font-weight: 600;
			padding: 4px 12px;
			border-radius: 999px;
			white-space: nowrap;
		}

		.badge-success {
			background-color: var(--success-bg);
			border: 1px solid var(--success-border);
			color: var(--success-text);
		}

		.badge-error {
			background-color: var(--error-bg);
			border: 1px solid var(--error-border);
			color: var(--error-text);
		}

		table {
			width: 100%;
			border-collapse: separate;
			border-spacing: 0;
			font-size: 14px;
		}

		th, td {
			padding: 12px 15px;
			text-align: left;
			border-bottom: 1px solid var(--border-color);
			vertical-align: top;
		}

		th {
			background-color: var(--hover-color);
			font-weight: 600;
			color: var(--secondary-color);
			position: sticky;
			top: 0;
		}

		tr:hover {
			background-color: var(--hover-color);
		}

		.table-container {
			max-height: 600px;
			overflow-y: auto;
			border: 1px solid var(--border-color);
			border-radius: 6px;
		}

		.empty-state {
			text-align: center;
			padding: 20px;
			color: var(--text-secondary);
			font-style: italic;
		}

		.subtitle {
			color: var(--text-secondary);
			font-size: 13px;
		}

		.failed-heading {
			color: var(--error-text);
			margin: 28px 0 4px;
			font-size: 1.1em;
		}

		.section-note {
			color: var(--text-secondary);
			font-size: 13px;
			margin: 0 0 12px;
		}

		ul.errors {
			margin: 0;
			padding-left: 18px;
		}

		ul.errors li {
			margin-bottom: 4px;
		}

		code {
			font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
			font-size: 13px;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>
			<div>
				Port Pages Fix Report
				<span class="generated-at">Generated ${escapeHtml(generatedAt)}</span>
			</div>
			<div class="logo">
				<svg width="72" height="24" viewBox="0 0 73 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" title="Port logo">
					<path d="M68.8428 18.7115C67.9809 18.7115 67.2772 18.4477 66.7319 17.92C66.2042 17.3747 65.9404 16.6535 65.9404 15.7564V8.36843H62.6686V5.62434H65.9404V1.56097H69.2649V5.62434H72.8534V8.36843H69.2649V15.1759C69.2649 15.7036 69.5112 15.9674 70.0037 15.9674H72.5367V18.7115H68.8428Z"></path>
					<path d="M53.368 18.7116V5.62443H56.6398V7.10201H57.1148C57.3083 6.5743 57.6249 6.18732 58.0647 5.94105C58.522 5.69479 59.0497 5.57166 59.6478 5.57166H61.2309V8.52683H59.595C58.7507 8.52683 58.0559 8.7555 57.5106 9.21285C56.9653 9.65261 56.6926 10.3386 56.6926 11.2709V18.7116H53.368Z"></path>
					<path d="M44.7584 19.0806C43.4567 19.0806 42.2869 18.8167 41.2491 18.289C40.2113 17.7613 39.3933 16.9961 38.7952 15.9935C38.1972 14.9908 37.8981 13.7859 37.8981 12.3787V11.9565C37.8981 10.5493 38.1972 9.34433 38.7952 8.34168C39.3933 7.33903 40.2113 6.57385 41.2491 6.04614C42.2869 5.51843 43.4567 5.25458 44.7584 5.25458C46.06 5.25458 47.2298 5.51843 48.2676 6.04614C49.3055 6.57385 50.1234 7.33903 50.7215 8.34168C51.3195 9.34433 51.6186 10.5493 51.6186 11.9565V12.3787C51.6186 13.7859 51.3195 15.0172 50.7215 16.0199C50.1234 17.0225 49.3055 17.7877 48.2676 18.3154C47.2298 18.8255 46.06 19.0806 44.7584 19.0806ZM44.7584 16.1254C45.7786 16.1254 46.6229 15.8 47.2914 15.1491C47.9598 14.4807 48.294 13.5308 48.294 12.2995V12.0356C48.294 10.8043 47.9598 9.86324 47.2914 9.2124C46.6405 8.54397 45.7962 8.20975 44.7584 8.20975C43.7381 8.20975 42.8938 8.54397 42.2254 9.2124C41.5569 9.86324 41.2227 10.8043 41.2227 12.0356V12.2995C41.2227 13.5308 41.5569 14.4807 42.2254 15.1491C42.8938 15.8 43.7381 16.1254 44.7584 16.1254Z"></path>
					<path d="M23.0248 23.9883V5.62398H26.2966V7.2071H26.7715C27.0706 6.69698 27.5367 6.24843 28.1699 5.86145C28.8032 5.45687 29.7091 5.25458 30.8877 5.25458C31.9431 5.25458 32.9193 5.51843 33.8164 6.04614C34.7136 6.55626 35.4348 7.31265 35.9801 8.31529C36.5254 9.31794 36.798 10.5317 36.798 11.9565V12.3787C36.798 13.8035 36.5254 15.0172 35.9801 16.0199C35.4348 17.0225 34.7136 17.7877 33.8164 18.3154C32.9193 18.8255 31.9431 19.0806 30.8877 19.0806C30.0961 19.0806 29.4277 18.9838 28.8824 18.7903C28.3546 18.6144 27.9237 18.3858 27.5895 18.1043C27.2728 17.8053 27.0178 17.5062 26.8243 17.2072H26.3494V23.9883H23.0248ZM29.885 16.1782C30.9228 16.1782 31.776 15.8527 32.4444 15.2019C33.1304 14.5335 33.4734 13.566 33.4734 12.2995V12.0356C33.4734 10.7691 33.1304 9.81047 32.4444 9.15963C31.7584 8.4912 30.9052 8.15698 29.885 8.15698C28.8648 8.15698 28.0116 8.4912 27.3256 9.15963C26.6396 9.81047 26.2966 10.7691 26.2966 12.0356V12.2995C26.2966 13.566 26.6396 14.5335 27.3256 15.2019C28.0116 15.8527 28.8648 16.1782 29.885 16.1782Z"></path>
					<path fill-rule="evenodd" clip-rule="evenodd" d="M0 12.7805L9.01713 12.7805L0 3.7638V12.7805ZM0.0108084 15.9024C0.160464 17.921 1.84563 19.5122 3.90244 19.5122H17.9512V5.46341C17.9512 3.40661 16.36 1.72145 14.3415 1.57178L14.3414 15.9024L11.1219 15.9024L0.0108084 15.9024ZM11.122 1.56097L11.122 10.4702L2.21228 1.56097H11.122Z"></path>
				</svg>
			</div>
		</h1>

		<div class="summary">
			<div class="stat-box">
				<div class="stat-number">${totalOrgs}</div>
				<div class="stat-label">Organizations</div>
			</div>
			<div class="stat-box">
				<div class="stat-number">${totalPagesWithErrors}</div>
				<div class="stat-label">Pages With Errors</div>
			</div>
			<div class="stat-box">
				<div class="stat-number">${totalPagesWithFixesApplied}</div>
				<div class="stat-label">Pages With Fixes Applied</div>
				<div class="stat-note">Page may still have remaining errors</div>
			</div>
			<div class="stat-box">
				<div class="stat-number ${totalUnexpectedFailures ? "error" : ""}">${totalUnexpectedFailures}</div>
				<div class="stat-label">Unexpected Failures</div>
			</div>
		</div>

		${results.map(renderFixOrgSection).join("")}

		<p class="subtitle">
			Learn more about Port pages in the
			<a href="${DOCS_URL}" target="_blank">documentation</a>.
		</p>
	</div>
</body>
</html>`;

  const outputDir = path.join(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `fix-report-${timestamp}.html`);
  fs.writeFileSync(outputPath, html);

  return outputPath;
}

/**
 * Writes the full validation results to
 * output/validate-report-<timestamp>.json (so each run's report is kept),
 * along with a summary block (invalid/failed page counts per org and
 * overall).
 *
 * @param {Array<object>} results
 * @param {string} [timestamp] Filename timestamp suffix; pass the same value
 *   used for a companion HTML report so both files share one timestamp.
 * @returns {string} The absolute path to the generated report.
 */
function generateJsonReport(results, timestamp = formatTimestampForFilename()) {
  const orgs = results.map((org) => {
    const { failedPages, ...rest } = org;
    return {
      ...rest,
      invalidPages: org.findings.length,
      failedPagesToValidate: failedPages || [],
    };
  });

  const summary = {
    totalOrganizations: results.length,
    totalPages: results.reduce((sum, org) => sum + org.totalPages, 0),
    totalInvalid: results.reduce((sum, org) => sum + org.findings.length, 0),
    totalFailed: results.reduce(
      (sum, org) => sum + (org.failedPages ? org.failedPages.length : 0),
      0
    ),
  };

  const outputDir = path.join(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `validate-report-${timestamp}.json`);
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), summary, results: orgs },
      null,
      2
    )
  );
  return outputPath;
}

/**
 * Writes the full fix results to output/fix-report-<timestamp>.json (so each
 * run's report is kept).
 *
 * Only the fixes that were applied to each page (`fixedErrors`) are
 * included; the original/remaining errors are intentionally left out and
 * not compared against the fix count. Re-run validate to see what, if
 * anything, remains on a page.
 *
 * @param {Array<object>} results
 * @param {string} [timestamp] Filename timestamp suffix; pass the same value
 *   used for a companion HTML report so both files share one timestamp.
 * @returns {string} The absolute path to the generated report.
 */
function generateFixJsonReport(results, timestamp = formatTimestampForFilename()) {
  const orgs = results.map((org) => {
    const pagesWithFixesAppliedCount = org.fixes.filter((fix) => fix.fixesApplied).length;
    const fixes = org.fixes.map(({ errorsBefore, ...fix }) => fix);
    return {
      ...org,
      fixes,
      attemptedCount: fixes.length,
      pagesWithFixesAppliedCount,
    };
  });

  const outputDir = path.join(__dirname, "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `fix-report-${timestamp}.json`);
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note:
          "This report only lists the fixes that were applied. Re-run the validate script to see which errors, if any, remain on these pages.",
        results: orgs,
      },
      null,
      2
    )
  );
  return outputPath;
}

module.exports = {
  generateReport,
  generateFixReport,
  generateJsonReport,
  generateFixJsonReport,
  formatTimestampForFilename,
};
