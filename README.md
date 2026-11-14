# FactoryOps Lab

A 3D viewer for the manufacturing model held in Dynamics 365 Finance & Operations: production units, resource groups, resources, routes and production orders.

The project is read-only towards the ERP. The page renders a local snapshot file; the only ERP traffic is GET requests issued by the local tools.

## Run

Requires Node.js 22 or later and an internet connection (Three.js is loaded from a CDN).

```sh
npm start
```

On Windows, double-click `start.bat` instead: it starts the server if needed and opens the viewer on the first real extract under `data/local`, or on the sample.

Otherwise open http://127.0.0.1:4174. Add `?data=<folder>` to load `data/<folder>/snapshot.json` instead of the sample.

## Refreshing orders

When the viewer shows a real extract (`?data=local/<folder>`) and `data/local/connection.local.json` exists, the header shows **Refresh orders**. It asks the local server to re-read production orders, route operations and scheduled jobs (GET only), merges them into that snapshot and reloads the Orders view. Credentials stay on the server side and are never sent to the page. The same read is available as `node tools/extract-orders.mjs data/local/<folder>`.

The structure (units, groups, resources, routes, BOMs) comes from a Data management package and is refreshed with `node tools/import-dmf.mjs`.

## Resource models

The ERP does not say what a resource looks like. **Models** in the header opens a panel that maps resources to models with rules; the most specific wins: resource, then resource group, resource type, capability, and a default. Changes show at once. For a real extract they are saved to `data/local/<folder>/visuals.json`; for the sample they last until the page is reloaded. This mapping is local and is never written to the ERP.

Each resource group's input and output location, as set up in the ERP, is painted on the floor as an IN and an OUT bay.

## Warehouse page

When the data folder holds a `warehouses.json`, the header shows **Factory** and **Warehouse**. The warehouse page lays out one warehouse from its ERP structure (location type, zone, aisle, rack, shelf, bin). It is a proof of concept: forklift trips join real locations of the right type but are not real warehouse work, and the box fill is decorative because stock by location is not read. Build the file with `node tools/import-warehouse.mjs <package-folder> data/local/<folder>`.

Warehouses with warehouse work open in the **Warehouse work** view: the work orders from the ERP are listed and replayed by a forklift, line by line, at their real locations. Add them with `node tools/import-warehouse-work.mjs <package-folder> data/local/<folder>` after importing the structure, or read them from the ERP with **Refresh work** on the warehouse page (`node tools/extract-warehouse-work.mjs data/local/<folder>`, GET only).

## Material flow

Violet lanes and crates show components reaching the resources. The source is the warehouse and location on the BOM line; a line flagged for resource consumption uses the input location of the resource's group; a line with no operation number is consumed at the first operation. In the Orders view the order's own BOM lines are used, falling back to the product's BOM when the order has none. Timing is a viewer convention: the crate arrives as the job starts.

## Views

- **Floor** — the shop floor generated from the hierarchy: site → production unit → resource group → resource.
- **Route** — pick a route and watch work travel between its operations. An operation that requires a resource group lights the whole group.
- **Orders** — production orders replayed against their scheduled jobs on a timeline.

Workers are shown only as secondary resources, standing next to the machine they assist.

## Layout

| Path | Purpose |
| --- | --- |
| `viewer/` | The 3D viewer (single page, no build step) and its glTF models |
| `data/sample/snapshot.json` | Invented data in the snapshot format |
| `data/sample/visuals.json` | Local mapping from resources to 3D models |
| `data/local/` | Real extracts; ignored by git |
| `tools/serve.mjs` | Local server: static files, the order refresh and saving the model mapping |
| `tools/import-dmf.mjs` | Builds a snapshot from a Data management package |
| `tools/import-warehouse.mjs` | Builds `warehouses.json` from a warehouse Data management package |
| `tools/import-warehouse-work.mjs`, `tools/extract-warehouse-work.mjs` | Warehouse work into `warehouses.json`, from a package or from OData |
| `tools/extract-orders.mjs`, `tools/fo-client.mjs` | GET-only OData read of orders and jobs |

## Versions

The current version is in `package.json` and in the viewer header. `CHANGELOG.md` lists what each version added; `ROADMAP.md` lists what the next ones are meant to include.

## Status

Early prototype. The sample data is invented. CNC, robot and packaging use Blender models; press, inspection, benches and tanks are built in code. Lamps, dust, the logistics lane with its tugger trains and the people walking beside it are decoration and carry no ERP data.
