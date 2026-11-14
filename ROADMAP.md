# Roadmap

What each coming version is meant to include. Scope can move between versions; what has shipped is in `CHANGELOG.md`.

## 0.6 — Warehouse and material flow

- Warehouses and their locations on the floor, linked to the input and output bays already painted at each resource group.
- Components travel from their pick location to the input location of the consuming operation; finished goods leave from the output location.
- Driven by warehouse work where the ERP has it, and derived from BOM lines and locations where it does not, with the two clearly told apart.
- Known so far (USMF site 1): production order BOM lines are readable (887 lines, 44 items, consumed from warehouses 11 and 13); 17 of 22 resource groups have an input location and 12 an output location.
- From the warehouse Data management package: 1,802 locations in 27 warehouses. The warehouses that site 1 uses hold 9 of them (11: 1, 12: 5, 13: 1, 12-801: 1, 12-802: 1), with no zones or aisles, so for site 1 the warehouse fits on the same floor. Warehouse 61 has 1,042 locations and 51 has 59 with zones and profiles; those would need a scene of their own.
- Still unknown: warehouse work. The OData entities for warehouses, locations and warehouse work return HTTP 403 for the integration user.

## 0.7 — Manual layout

- Drag production units, groups and resources; positions saved as a local layer.
- Automatic layout remains the default for anything not placed by hand.

## Before publishing (1.0)

- Three.js bundled locally instead of loaded from a CDN.
- A recorded demo and screenshots; README written for a first-time reader.
- Remaining Blender models (press, inspection) and fuller labels.
