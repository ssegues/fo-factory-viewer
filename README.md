# FactoryOps Lab

A 3D viewer for the manufacturing model held in Dynamics 365 Finance & Operations: production units, resource groups, resources, routes and production orders.

The viewer is read-only. It never talks to the ERP; it renders a local snapshot file.

## Run

Requires Node.js 22 or later and an internet connection (Three.js is loaded from a CDN).

```sh
npm start
```

Open http://127.0.0.1:4174. Add `?data=<folder>` to load `data/<folder>/snapshot.json` instead of the sample.

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
| `tools/serve.mjs` | Static file server |

## Status

Early prototype. The sample data is invented. Press and inspection machines are placeholder geometry. Importing real D365FO data is the next step.
