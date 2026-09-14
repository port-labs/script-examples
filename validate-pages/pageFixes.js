const TABLE_ENTITIES_EXPLORER = "table-entities-explorer";
const DASHBOARD_WIDGET = "dashboard-widget";
const REQUIRED_DISPLAY_MODE = "widget";

/**
 * Sets displayMode to "widget" on table-entities-explorer widgets that are
 * direct children of dashboard-widget containers. Mirrors the port-api
 * validateDashboardWidgetChildDisplayMode guardrail.
 *
 * @param {Array<Record<string, unknown>> | undefined} widgets
 * @returns {Array<{name: string, message: string}>}
 */
function normalizeDashboardWidgetChildDisplayMode(widgets) {
  const fixes = [];

  function fixDashboardWidgetChildren(dashboardWidget) {
    if (!Array.isArray(dashboardWidget.widgets)) {
      return;
    }

    for (const child of dashboardWidget.widgets) {
      if (
        child.type === TABLE_ENTITIES_EXPLORER &&
        child.displayMode !== REQUIRED_DISPLAY_MODE
      ) {
        const previous = child.displayMode ?? "(missing)";
        child.displayMode = REQUIRED_DISPLAY_MODE;
        const label = child.id || child.title || "unknown";
        fixes.push({
          name: "normalizeDashboardWidgetChildDisplayMode",
          message: `Set displayMode to '${REQUIRED_DISPLAY_MODE}' for table-entities-explorer '${label}' (was ${previous})`,
        });
      }

      walkWidget(child);
    }
  }

  function walkWidget(widget) {
    if (!widget || typeof widget !== "object") {
      return;
    }

    if (widget.type === DASHBOARD_WIDGET) {
      fixDashboardWidgetChildren(widget);
      return;
    }

    if (Array.isArray(widget.widgets)) {
      for (const nestedWidget of widget.widgets) {
        walkWidget(nestedWidget);
      }
    }

    if (Array.isArray(widget.groups)) {
      for (const group of widget.groups) {
        if (Array.isArray(group.widgets)) {
          for (const nestedWidget of group.widgets) {
            walkWidget(nestedWidget);
          }
        }
      }
    }
  }

  if (Array.isArray(widgets)) {
    for (const widget of widgets) {
      walkWidget(widget);
    }
  }

  return fixes;
}

/**
 * Applies all client-side page fixes and returns the fix messages produced.
 * Mutates the page object in place.
 *
 * @param {Record<string, unknown>} page
 * @returns {Array<{name: string, message: string}>}
 */
function applyClientSidePageFixes(page) {
  return normalizeDashboardWidgetChildDisplayMode(page.widgets);
}

module.exports = {
  TABLE_ENTITIES_EXPLORER,
  DASHBOARD_WIDGET,
  REQUIRED_DISPLAY_MODE,
  normalizeDashboardWidgetChildDisplayMode,
  applyClientSidePageFixes,
};
