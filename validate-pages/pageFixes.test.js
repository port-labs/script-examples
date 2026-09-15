const assert = require("assert");
const {
  normalizeDashboardWidgetChildDisplayMode,
} = require("./pageFixes");

function runTests() {
  const nestedTable = {
    id: "relatedTable",
    type: "table-entities-explorer",
    title: "Related Entities",
  };

  const pageWidgets = [
    {
      id: "entityPageGrouper",
      type: "grouper",
      groups: [
        {
          title: "Overview",
          widgets: [
            {
              id: "overviewDashboard",
              type: "dashboard-widget",
              widgets: [nestedTable],
            },
          ],
        },
      ],
    },
  ];

  const fixes = normalizeDashboardWidgetChildDisplayMode(pageWidgets);

  assert.strictEqual(fixes.length, 1);
  assert.strictEqual(nestedTable.displayMode, "widget");
  assert.match(fixes[0].message, /relatedTable/);

  const unchanged = normalizeDashboardWidgetChildDisplayMode(pageWidgets);
  assert.strictEqual(unchanged.length, 0);

  const catalogWidgets = [
    {
      id: "catalogTable",
      type: "table-entities-explorer",
      displayMode: "tabs",
    },
  ];
  const catalogFixes = normalizeDashboardWidgetChildDisplayMode(catalogWidgets);
  assert.strictEqual(catalogFixes.length, 0);
  assert.strictEqual(catalogWidgets[0].displayMode, "tabs");

  console.log("pageFixes.test.js: all tests passed");
}

runTests();
