# Roadmap

What each coming version is meant to include. Scope can move between versions; what has shipped is in `CHANGELOG.md`.

## 0.4 — Resource mapping

- A configuration panel in the viewer that maps each ERP resource to the model shown for it.
- Rules by resource, resource group, capability and resource type, with a visible precedence.
- Saved as a local layer next to the snapshot; never written to the ERP.

## 0.5 — Warehouse and material flow

- Warehouses and locations on the floor, including each resource group's input and output location.
- Components travel from their pick location to the input location of the consuming operation; finished goods leave from the output location.
- Driven by warehouse work where the ERP has it, and derived from BOM lines and locations where it does not, with the two clearly told apart.

## 0.6 — Manual layout

- Drag production units, groups and resources; positions saved as a local layer.
- Automatic layout remains the default for anything not placed by hand.

## Before publishing (1.0)

- Three.js bundled locally instead of loaded from a CDN.
- A recorded demo and screenshots; README written for a first-time reader.
- Remaining Blender models (press, inspection) and fuller labels.
