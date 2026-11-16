# Roadmap

What each coming version is meant to include. Scope can move between versions; what has shipped is in `CHANGELOG.md`.

## 0.9 — Warehouse and factory connected

- Link production pick work to the factory floor: material leaving the warehouse page arrives at the resource on the factory page.
- Components travel from their pick location to the input location of the consuming operation; finished goods leave from the output location.
- Driven by warehouse work where the ERP has it, and derived from BOM lines and locations where it does not, with the two clearly told apart.
- Stock by location in place of the decorative box fill on shelves.
- Warehouse names and sites. The `Warehouses` entity still returns HTTP 403 for the integration user; this needs the right read privilege first.

## 1.0 — Stable release

- Three.js bundled locally instead of loaded from a CDN.
- Shared scene code between the factory and warehouse pages (the warehouse page currently duplicates its helpers).
- Remaining Blender models (press, inspection) and fuller labels.
- A recorded demo video.

## Done

- Manual layout of the warehouse page: rack aisles and floor areas (0.8.1).
- Manual layout: drag units, groups and resources; saved as a local layer (0.8.0).
- README for a first-time reader, screenshots, licence and publication on GitHub (0.7.1).
- Real warehouse work replayed on the warehouse page, with a refresh button (0.7.0).
- Warehouse page and material flow on the factory floor (0.6.0).

## Notes from USMF site 1

- Production order BOM lines are readable (887 lines, 44 items, consumed from warehouses 11 and 13); 17 of 22 resource groups have an input location and 12 an output location.
- The warehouse Data management package has 1,802 locations in 27 warehouses. Site 1 uses 9 of them, with no zones or aisles, so they fit on the factory floor. Warehouse 61 (1,042 locations) and 51 (59) have zones and profiles and use the warehouse page.
- Warehouse work: 16 work orders, 51 lines, in warehouses 24, 51, 62 and 63; none for site 1 production orders.
