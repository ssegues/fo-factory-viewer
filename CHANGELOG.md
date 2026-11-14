# Changelog

Versions follow `MAJOR.MINOR.PATCH`. While the project is below 1.0, a MINOR step adds a capability and a PATCH step fixes or polishes one. The version lives in `package.json` and is shown in the viewer header.

## 0.4.0 — 2026-11-14

- **Models** panel in the viewer: map ERP resources to the model shown for them, with rules by resource, resource group, resource type and capability, and a default. The most specific rule wins and each resource shows which rule decided.
- Changes apply to the scene at once and are saved to the snapshot's `visuals.json` through the local server. Nothing is written to the ERP.
- Suggestions from the resource name are offered for machines, never applied automatically.

## 0.3.0 — 2026-11-14

- **Refresh orders** button: the local server re-reads production orders, route operations and scheduled jobs (GET only) and reloads the Orders view.
- The server no longer serves `*.local.json` files.
- New press and inspection cells, a jointed robot arm, jointed workers.
- Ambient decoration: pendant lamps, dust, a logistics lane with tugger trains and pedestrians.
- Running machines light a frame on the floor.
- The version is shown in the viewer header.

## 0.2.0 — 2026-11-13

- Import of a Data management package (template "410 - Production control") into a snapshot: production units, resource groups, resources, capabilities, routes and BOMs.
- Read-only OData extraction of production orders, route operations and scheduled jobs.
- Operation eligibility resolved from resource requirements (resource, group, type, capability).
- Manual workstations for personnel who are primary on an operation; subcontractor and coating-tank models.
- Orders view replays real scheduled dates on a timeline.
- Route lanes light only while a cart uses them; toggle for empty resource groups.

## 0.1.0 — 2026-11-13

- First viewer: a 3D shop floor generated from the hierarchy site → production unit → resource group → resource.
- Floor, Route and Orders views on invented sample data.
- CNC, robot and packaging models exported from Blender.
