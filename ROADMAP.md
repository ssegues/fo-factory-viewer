# Roadmap

What each coming version is meant to include. Scope can move between versions; what has shipped is in `CHANGELOG.md`.

## 0.9 — Warehouse and factory connected

- **0.9.0 — Real stock (on hold).** Real on-hand stock per location in place of the decorative box fill. No public OData entity gives stock per location outside project entities: `WarehousesOnHandV2` stops at the warehouse, and `InventoryOnHandForAI` at the inventory status. Inventory Visibility cannot be installed in a trial environment. The remaining candidate is the **Inventory on-hand report storage** report, exported with Data management and read locally from the package. The ERP connection panel of this version has shipped.
- **0.9.1 — From warehouse to machine.** Link production pick work to its production order: open the order on the factory page from the warehouse page and back, and show which work and location each material crate comes from.
- **0.9.2 — The whole path, real or derived.** Pick location → group input location → resource → output location → finished goods. Solid where warehouse work says so, dashed where it is derived from BOM lines and group setup, with a legend. Warehouse names once the `Warehouses` entity is readable (still HTTP 403).
- **0.9.3 — Product icons.** Material crates and stock on shelves take an icon chosen from the product name (for example screens, cables, speakers, packaging), with plain boxes only as the fallback. Rules are local and editable, like the resource models.
- Production pick work for site 1 does not exist yet in USMF; it has to be created in the trial environment (by the user, in the ERP) to show 0.9.1 with real data.

## 1.0 — Stable release

- Three.js bundled locally instead of loaded from a CDN.
- Shared scene code between the factory and warehouse pages (the warehouse page currently duplicates its helpers).
- Remaining Blender models (press, inspection) and fuller labels.
- A recorded demo video.

## Done

- Movable raw material, finished goods and production warehouse areas (0.8.3).
- Floor size and shape on both pages: sections, resize, L/T/U shapes (0.8.2).
- Manual layout of the warehouse page: rack aisles and floor areas (0.8.1).
- Manual layout: drag units, groups and resources; saved as a local layer (0.8.0).
- README for a first-time reader, screenshots, licence and publication on GitHub (0.7.1).
- Real warehouse work replayed on the warehouse page, with a refresh button (0.7.0).
- Warehouse page and material flow on the factory floor (0.6.0).

## Notes from USMF site 1

- Production order BOM lines are readable (887 lines, 44 items, consumed from warehouses 11 and 13); 17 of 22 resource groups have an input location and 12 an output location.
- The warehouse Data management package has 1,802 locations in 27 warehouses. Site 1 uses 9 of them, with no zones or aisles, so they fit on the factory floor. Warehouse 61 (1,042 locations) and 51 (59) have zones and profiles and use the warehouse page.
- Warehouse work: 16 work orders, 51 lines, in warehouses 24, 51, 62 and 63; none for site 1 production orders.
