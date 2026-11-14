# Changelog

Versions follow `MAJOR.MINOR.PATCH`. While the project is below 1.0, a MINOR step adds a capability and a PATCH step fixes or polishes one. The version lives in `package.json` and is shown in the viewer header.

## 0.7.0 — 2026-11-14

- **Real warehouse work** on the warehouse page. A Warehouse work view lists the work orders of the selected warehouse (type, status, source order, lines) and a forklift replays each one, picking and putting at its real locations in line order. Click a work order to replay it; its lines show in the details panel. Speed and timing are illustrative.
- `tools/import-warehouse-work.mjs` merges warehouse work headers and lines from a Data management package into `warehouses.json`. Lines without a known location are kept and flagged.
- **Refresh work** button on the warehouse page: the local server re-reads warehouse work headers and lines from the ERP (GET only, `tools/extract-warehouse-work.mjs`) and reloads the work view. OData and Data management give the same result; both share one mapping.
- The OData client keeps the server's error message and supports single-company and `$top` reads, for diagnosing access errors.
- The illustrative flows are now labelled as such, and the warehouse selector shows how many work orders each warehouse has.

## 0.6.0 — 2026-11-14

- **Warehouse page (proof of concept)**, reached from a Factory / Warehouse switch in the header. Pick a warehouse and see it laid out from its ERP structure: rack rows by aisle, rack, shelf and bin, floor areas, and dock-side locations, coloured by zone. Locations are clickable.
- Forklifts show put-away, replenishment, picking and production supply between real locations of the right type. These trips are illustrative, not real warehouse work, and the box fill is decorative.
- `tools/import-warehouse.mjs` converts a warehouse Data management package into `warehouses.json`.
- Factory floor: the warehouses that production works with are drawn as a strip of painted locations at the back of the hall, and routes start and end at the input and output locations the ERP names.
- **Material flow** on the factory floor, in violet. Route view: components travel from the location the BOM line consumes from to the group's input bay and on to the resource. Orders view: a crate reaches each resource as its job starts, using the order's own BOM lines (warehouse, location, operation). A **Material** button hides or shows it.
- The order read now includes production order BOM lines; the structure import includes each BOM line's consumption warehouse and resource-consumption flag.

## 0.5.0 — 2026-11-14

- Three new models for the mapping panel: **3D printer**, **paint booth** and **floor location** (a marked bay on the floor, for a resource that is only a place).
- Input and output locations of each resource group are imported from the Data management package and painted on the floor as IN and OUT bays showing warehouse and location. They are clickable and listed in the resource details.
- Re-importing the structure keeps the production orders already merged into the snapshot.

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
