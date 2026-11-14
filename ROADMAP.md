# Roadmap

What each coming version is meant to include. Scope can move between versions; what has shipped is in `CHANGELOG.md`.

## 0.5 — Warehouse and material flow

- Warehouses and locations on the floor, including each resource group's input and output location.
- Components travel from their pick location to the input location of the consuming operation; finished goods leave from the output location.
- Driven by warehouse work where the ERP has it, and derived from BOM lines and locations where it does not, with the two clearly told apart.
- Known so far (USMF site 1): production order BOM lines are readable (887 lines, 44 items, consumed from warehouses 11 and 13); 17 of 22 resource groups have an input location and 12 an output location. Warehouses, zones, aisles, locations and warehouse work returned HTTP 403 for the integration user, so their volume is still unknown.
- Open question: whether the warehouse is part of the same floor or a separate scene, to be decided once the location count is known.

## 0.6 — Manual layout

- Drag production units, groups and resources; positions saved as a local layer.
- Automatic layout remains the default for anything not placed by hand.

## Before publishing (1.0)

- Three.js bundled locally instead of loaded from a CDN.
- A recorded demo and screenshots; README written for a first-time reader.
- Remaining Blender models (press, inspection) and fuller labels.
