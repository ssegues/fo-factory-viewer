# Changelog

Versions follow `MAJOR.MINOR.PATCH`. While the project is below 1.0, a MINOR step adds a capability and a PATCH step fixes or polishes one. The version lives in `package.json` and is shown in the viewer header.

## 0.8.2 — 2026-11-16

- **Floor size and shape**, on both pages. In the layout editor, the new **Floor** level draws the floor as sections: drag a section to move it, drag its corner or edge handles to resize it, add sections for an L, T or U shaped hall or an annex, or go back to the automatic rectangle. **Apply floor** saves the shape and rebuilds the hall around it: walls on the back- and left-facing edges, edge markings, lamps, the logistics lane and the camera framing.
- The editor reports machines, groups or warehouse locations left outside the new floor before applying.
- Shapes are saved with the layout (`layout.json`, and per warehouse in `warehouse-layout.json`); the local server validates them. With the sample data set they last for the browser session.
- `viewer/floor.js` is the first module shared by both pages.

## 0.8.1 — 2026-11-16

- **Manual warehouse layout.** A **Layout** button on the warehouse page moves whole rack aisles and floor areas, with all their locations. Dock locations stay along the dock wall. Undo, reset of the selected block or of the whole warehouse, and an overlap warning, as on the factory page.
- Forklift trips and the replay of warehouse work follow the moved locations.
- Saved per data set in `data/<set>/warehouse-layout.json`, per warehouse, as offsets from the automatic layout. The sample data set is never written.

## 0.8.0 — 2026-11-16

- **Manual layout.** A **Layout** button on the factory page opens an editor: drag resources, resource groups or whole production units across the floor. Groups move with their resources and units with their groups. Moves snap to half a metre, stay on the site floor, and can be undone or reset.
- Routes, material lanes and production order paths follow the new positions at once.
- Positions are saved per data set in `data/<set>/layout.json` as offsets from the automatic layout, so anything not moved, including resources that appear in a later extract, keeps its automatic place. The local server validates the file; the sample data set is never written.
- Overlapping units, groups or resources are reported in the editor, not blocked.

## 0.7.1 — 2026-11-15

- The project is renamed **FO Factory Viewer** (previously FactoryOps Lab), to avoid confusion with an existing commercial product.
- Licensed under the **GNU AGPL v3.0**, with a separate commercial licence available from the author. The README explains both and how contributions are accepted.
- The README, licence, example connection file and screenshots are ready for publication.

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
