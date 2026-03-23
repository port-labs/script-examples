import fs from 'fs';
import path from 'path';

import { CalculationPropertyFinding, ScriptOrg } from '../types';

const DOCS_URL =
	'https://docs.port.io/build-your-software-catalog/customize-integrations/configure-data-model/setup-blueprint/properties/calculation-property/#breaking-changes';

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

const generateHtmlReport = (
	org: ScriptOrg,
	findings: CalculationPropertyFinding[],
	totalBlueprints: number,
	totalCalculationProperties: number,
	alreadyEnabled: boolean,
) => {
	const alreadyEnabledBanner = alreadyEnabled
		? `<div class="banner banner-success">
				<strong>Feature already enabled</strong>
				<p>This organization has already enabled persistent calculation properties. No action is required.</p>
			</div>`
		: '';

	const findingsSection = alreadyEnabled
		? ''
		: `
			<div class="summary">
				<div class="stat-box">
					<div class="stat-number">${totalBlueprints}</div>
					<div class="stat-label">Total Blueprints</div>
				</div>
				<div class="stat-box">
					<div class="stat-number">${totalCalculationProperties}</div>
					<div class="stat-label">Total Calculation Properties</div>
				</div>
				<div class="stat-box">
					<div class="stat-number">${findings.length}</div>
					<div class="stat-label">Properties Requiring Review</div>
				</div>
			</div>

			<div class="section">
				<div class="section-header">
					<h2>Calculation Properties to Review</h2>
					<a href="${DOCS_URL}" class="docs-link" target="_blank">see breaking changes in the docs</a>
				</div>
				<p class="section-description">
					The following calculation properties may need updates before enabling persistent calculation properties.<br/>
					Review each finding and update the calculation JQ expression as needed.
				</p>
				<div class="table-container">
					<table>
						<thead>
							<tr>
								<th>Blueprint</th>
								<th>Property Identifier</th>
								<th>Calculation (JQ)</th>
								<th>Reason</th>
								<th>Reviewed</th>
							</tr>
						</thead>
						<tbody>
							${
								findings.length
									? findings
											.map(
												(f) => `
							<tr>
								<td>${escapeHtml(f.blueprintIdentifier)}${f.blueprintTitle ? ` <span class="subtitle">(${escapeHtml(f.blueprintTitle)})</span>` : ''}</td>
								<td><code>${escapeHtml(f.propertyIdentifier)}</code></td>
								<td><code class="jq">${escapeHtml(f.calculation)}</code></td>
								<td>${f.reason}</td>
								<td><input type="checkbox"></td>
							</tr>`,
											)
											.join('')
									: '<tr><td colspan="5" class="empty-state">No calculation properties with breaking changes found</td></tr>'
							}
						</tbody>
					</table>
				</div>
			</div>`;

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Organization ${escapeHtml(org.name)} - Persistent Calculation Properties Report</title>
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

		.banner {
			padding: 20px 24px;
			border-radius: 10px;
			margin-bottom: 30px;
			font-size: 16px;
		}

		.banner strong {
			display: block;
			font-size: 18px;
			margin-bottom: 6px;
		}

		.banner p {
			margin: 0;
		}

		.banner code {
			background: rgba(0,0,0,0.07);
			padding: 2px 6px;
			border-radius: 4px;
			font-size: 14px;
		}

		.banner-success {
			background-color: var(--success-bg);
			border: 1px solid var(--success-border);
			color: var(--success-text);
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

		.stat-label {
			color: var(--text-secondary);
			font-size: 16px;
			font-weight: 500;
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
			font-size: 1.8em;
		}

		table {
			width: 100%;
			border-collapse: separate;
			border-spacing: 0;
			margin-bottom: 20px;
			font-size: 14px;
		}

		th, td {
			padding: 12px 15px;
			text-align: left;
			border-bottom: 1px solid var(--border-color);
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

		td {
			transition: background-color 0.2s ease;
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

		.section-header {
			display: flex;
			align-items: center;
			gap: 12px;
		}

		.docs-link {
			font-size: 14px;
			color: var(--primary-color);
			text-decoration: none;
			white-space: nowrap;
		}

		.docs-link:hover {
			text-decoration: underline;
		}

		.section-description {
			color: var(--text-color);
			margin: 20px 0 30px;
			font-size: 1.1em;
			line-height: 1.5;
		}

		.subtitle {
			color: var(--text-secondary);
			font-size: 13px;
		}

		code {
			font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
			font-size: 13px;
		}

		code.jq {
			display: inline-block;
			max-width: 400px;
			overflow-x: auto;
			white-space: nowrap;
			background: var(--hover-color);
			padding: 2px 6px;
			border-radius: 4px;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>
			<div>
				Persistent Calculation Properties Report
				<br />
				Organization ${escapeHtml(org.name)}
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

		${alreadyEnabledBanner}
		${findingsSection}
	</div>

</body>
</html>`;

	const outputDir = path.join(__dirname, '..', '..', 'output');
	fs.mkdirSync(outputDir, { recursive: true });
	fs.writeFileSync(path.join(outputDir, 'index.html'), html);
};

export const generateReport = (
	org: ScriptOrg,
	findings: CalculationPropertyFinding[],
	totalBlueprints: number,
	totalCalculationProperties: number,
	alreadyEnabled: boolean,
) => {
	generateHtmlReport(org, findings, totalBlueprints, totalCalculationProperties, alreadyEnabled);
};
