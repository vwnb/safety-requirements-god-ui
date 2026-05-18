# Skill: Compile ISO 26262 Documentation

## Purpose

Compile ISO 26262-compliant functional safety documentation through the Safety Requirements God UI. This skill guides the agent through the full lifecycle of creating, managing, linking, and baselining safety concepts for automotive functional safety according to ISO 26262.

## Domain Context

ISO 26262 is the automotive functional safety standard. Documentation is organized around these lifecycle phases and artifact types:

### Lifecycle Phases (in order)
1. **ITEM_DEFINITION** — Define the item (system/component) scope, functions, boundaries
2. **HARA** — Hazard Analysis and Risk Assessment: identify hazards, classify ASIL
3. **FUNCTIONAL_SAFETY** — Derive Functional Safety Requirements (FSR) from Safety Goals
4. **TECHNICAL_SAFETY** — Derive Technical Safety Requirements (TSR) from FSRs
5. **SYSTEM_DESIGN** — System architecture and design
6. **SOFTWARE_DESIGN** — Software-level design
7. **IMPLEMENTATION** — Implementation phase
8. **VERIFICATION** — Verification activities

### Concept Types & Their Role
| Type | Role | Phase |
|------|------|-------|
| `ITEM` | The system/product being developed | ITEM_DEFINITION |
| `HAZARD` | A potential source of harm | HARA |
| `HARM` | Physical injury/damage caused by hazard | HARA |
| `SAFETY_GOAL` | Top-level safety requirement from HARA | HARA |
| `FSR` | Functional Safety Requirement | FUNCTIONAL_SAFETY |
| `TSR` | Technical Safety Requirement | TECHNICAL_SAFETY |
| `SSR` | Software Safety Requirement | SOFTWARE_DESIGN |
| `SOFTWARE_REQUIREMENT` | General software requirement | SOFTWARE_DESIGN |
| `HARDWARE_REQUIREMENT` | Hardware requirement | SYSTEM_DESIGN |
| `ASSUMPTION` | Design assumption to document | Any |
| `CONSTRAINT` | Design constraint | Any |
| `TEST_CASE` | Test specification | VERIFICATION |
| `TEST_RESULT` | Test execution result | VERIFICATION |
| `VERIFICATION_REPORT` | Verification review report | VERIFICATION |
| `VALIDATION_REPORT` | Validation report | VALIDATION |
| `SAFETY_CASE` | Safety case argument | VERIFICATION |
| `SAFETY_MANUAL` | Safety manual for the item | PRODUCTION |
| `CHANGE_REQUEST` | Change/impact analysis | Any |
| `ANOMALY` | Defect/anomaly report | Any |

### ASIL Levels
- **QM** — Quality Management (no safety requirement)
- **A** — Low risk
- **B** — Moderate risk
- **C** — High risk
- **D** — Highest risk (most stringent)

### Relation Types
| Relation | Meaning |
|----------|---------|
| `MITIGATES` | Source reduces/prevents the risk of target |
| `VIOLATES` | Source contradicts/breaks target |
| `DERIVES` | Source is derived from target |
| `ALLOCATED_TO` | Source is allocated to target |
| `REFINES` | Source refines/specifies target |
| `VERIFIES` | Source verifies target |
| `VALIDATES` | Source validates target |
| `DEPENDS_ON` | Source depends on target |
| `CONFLICTS_WITH` | Source conflicts with target |
| `PRECONDITION` | Source is a precondition for target |
| `POSTCONDITION` | Source is a postcondition for target |
| `TRACES_TO` | Source traces to target |

## UI Elements & Selectors

The UI exposes these `data-agent` attributes for programmatic agent interaction:

### Auth & Project
- `data-agent="auth-section"` — Authentication section wrapper
- `data-agent="btn-login"` — Login button
- `data-agent="btn-logout"` — Logout button
- `data-agent="input-user"` — User name input (non-auth mode)
- `data-agent="input-project"` — Project name display (read-only)
- `data-agent="loading-overlay"` — Loading overlay
- `data-agent="loading-message"` — Loading text content

### Work Items
- `data-agent="work-items-section"` — Work items section
- `data-agent="select-work-item"` — Work item selector dropdown
- `data-agent="edit-work-item-form"` — Work item edit form
- `data-agent="input-work-item-name"` — Work item name
- `data-agent="input-work-item-description"` — Work item description
- `data-agent="select-work-item-phase"` — Work item phase selector
- `data-agent="select-work-item-asil"` — Work item ASIL selector
- `data-agent="input-work-item-application-context"` — Application context
- `data-agent="input-work-item-system-boundary"` — System boundary
- `data-agent="btn-save-changes"` — Save work item changes

### Concepts
- `data-agent="concepts-section"` — Concepts list section
- `data-agent="concept-{id}"` — Individual concept button
- `data-agent="new-concept-section"` — New concept creation form
- `data-agent="input-new-concept-key"` — Concept key (e.g. BRAKE_FAILURE)
- `data-agent="input-new-concept-title"` — Concept title (optional)
- `data-agent="select-new-concept-phase"` — Concept phase selector
- `data-agent="select-new-concept-asil"` — Concept ASIL selector
- `data-agent="select-new-concept-type"` — Concept type selector
- `data-agent="btn-create-concept"` — Create concept button

### Import
- `data-agent="import-concepts-section"` — Import from template section
- `data-agent="template-{id}"` — Template work item row (click to import)

### Editor
- `data-agent="editor-section"` — Markdown editor section
- `data-agent="editor-info"` — Current concept + revision info display
- `data-agent="btn-save-revision"` — Save revision button

### Revisions & Diff
- `data-agent="revisions-section"` — Revisions list section
- `data-agent="revision-{id}"` — Revision row
- `data-agent="revision-id"` — Revision ID display
- `data-agent="revision-markdown"` — Revision content display
- `data-agent="btn-load-revision"` — Load revision into editor
- `data-agent="btn-set-base"` — Set revision as BASE (for diff)
- `data-agent="btn-set-head"` — Set revision as HEAD (for diff)
- `data-agent="diff-view"` — Diff comparison view
- `data-agent="diff-no-differences"` — No differences message

### Baselines
- `data-agent="baselines-section"` — Baselines list section
- `data-agent="baseline-{id}"` — Baseline button
- `data-agent="selected-baseline-section"` — Selected baseline detail
- `data-agent="new-baseline-section"` — New baseline creation section
- `data-agent="input-baseline-name"` — Baseline name input
- `data-agent="baseline-revision-{id}"` — Revision selector for baseline
- `data-agent="btn-create-baseline"` — Create baseline button

### Graph
- `data-agent="graph-view-container"` — Graph container
- `data-agent="react-flow"` — ReactFlow instance
- `data-agent="graph-node-{id}"` — Individual graph node
- `data-agent="graph-node-label"` — Node label
- `data-agent="graph-node-type"` — Node type
- `data-agent="graph-loading"` — Graph loading overlay

## API Endpoints

All endpoints are relative to `VITE_API_URL` (env var).

### Work Items
```
GET    /work-items                    — List all work items
GET    /work-items/{id}               — Get work item details
PUT    /work-items/{id}               — Update work item
GET    /work-items/{id}/concepts      — List concepts for work item
POST   /work-items/{id}/graph         — Import graph from template
GET    /templates                     — List template work items
```

### Concepts
```
GET    /concepts                      — List all concepts
POST   /concepts                      — Create concept
POST   /work-items/{id}/concepts      — Create concept under work item
GET    /concepts/{id}/revisions       — List revisions for concept
```

### Revisions & Workflow
```
POST   /workflow/submit-change        — Submit a new revision
       Body: { conceptId, markdown, user }
```

### Relations
```
GET    /graph/{workItemId}            — Get full graph (concepts + revisions + relations)
POST   /relations                     — Create relation
DELETE /relations/{id}                — Delete relation
```

### Baselines
```
GET    /baselines                     — List baselines
POST   /baselines                     — Create baseline
       Body: { name, revisions: [id...], user }
GET    /baselines/{id}                — Get baseline with items
```

## ISO 26262 Documentation Compilation Workflow

### Phase 1: Item Definition
1. **Select or create a work item** — The work item represents the "item" per ISO 26262-1
   - Use `data-agent="select-work-item"` to pick existing
   - Edit work item metadata: name, description, phase (`ITEM_DEFINITION`), ASIL, application context, system boundary
   - Save using `data-agent="btn-save-changes"`
2. **Create ITEM concept** — Document the item definition per ISO 26262-3 Clause 5
   - Set type=`ITEM`, phase=`ITEM_DEFINITION`
   - Key naming convention: `ITEM_<SYSTEM_NAME>` (e.g. `ITEM_BRAKE_CONTROL`)
   - Title: full item name
3. **Write item definition** in the markdown editor using this template:
   ```markdown
   # Item Definition: {key}
   
   ## Scope
   {System description and boundaries}
   
   ## Functions
   - {Function 1}
   - {Function 2}
   
   ## Operating Modes
   - {Mode 1}
   
   ## System Boundary
   {Boundary description}
   
   ## Assumptions
   - {Assumption 1}
   ```
4. Save revision via `btn-save-revision`

### Phase 2: HARA (Hazard Analysis & Risk Assessment)
1. **Create HAZARD concepts** — Per ISO 26262-3 Clause 7
   - Set type=`HAZARD`, phase=`HARA`
   - Assign ASIL based on Severity × Exposure × Controllability
2. **Create SAFETY_GOAL concepts** — Top-level safety requirements
   - Set type=`SAFETY_GOAL`, phase=`HARA`
   - Each safety goal must trace to at least one hazard
3. **Link via graph** — Use the GraphView to create relations:
   - `HAZARD` → `MITIGATES` → `SAFETY_GOAL`
   - Click node handles to create connections
4. **Document hazard analysis** in markdown:
   ```markdown
   # Hazard: {key}
   
   ## Hazard Description
   {Description}
   
   ## Operating Situation
   {When does this occur}
   
   ## Risk Assessment
   - Severity (S): {1-3}
   - Exposure (E): {1-4}
   - Controllability (C): {1-3}
   - ASIL: {QM/A/B/C/D}
   
   ## Safety Goal
   {Linked safety goal reference}
   ```

### Phase 3: Functional Safety Requirements
1. **Create FSR concepts** — Per ISO 26262-3 Clause 8
   - Set type=`FSR`, phase=`FUNCTIONAL_SAFETY`
   - ASIL must be consistent with the parent Safety Goal
2. **Link to graph**:
   - `FSR` → `DERIVES` → `SAFETY_GOAL`
3. **Document FSR** in markdown:
   ```markdown
   # Functional Safety Requirement: {key}
   
   ## Requirement
   {The system shall...}
   
   ## Rationale
   {Why this requirement exists}
   
   ## ASIL
   {ASIL assignment}
   
   ## Verification Criteria
   {How this will be verified}
   ```

### Phase 4: Technical Safety Requirements
1. **Create TSR concepts** — Per ISO 26262-4 Clause 6
   - Set type=`TSR`, phase=`TECHNICAL_SAFETY`
   - One TSR may refine multiple FSRs
2. **Link to graph**:
   - `TSR` → `REFINES` → `FSR`
3. **Document TSR** in markdown:
   ```markdown
   # Technical Safety Requirement: {key}
   
   ## Requirement
   {Technical specification}
   
   ## Derived From
   {Reference to FSR}
   
   ## ASIL
   {ASIL — inherits from FSR}
   
   ## Fault Detection / Reaction
   {How faults are detected and handled}
   ```

### Phase 5: System & Software Design
1. **Create design concepts** (SYSTEM_DESIGN / SOFTWARE_DESIGN phase)
   - Create TSRs and SSRs (Software Safety Requirements)
   - Create ASSUMPTION and CONSTRAINT types as needed
2. **Link to graph**:
   - `SSR` → `REFINES` → `TSR`
   - `ASSUMPTION` → `DEPENDS_ON` → relevant requirement
   - `CONSTRAINT` → `CONFLICTS_WITH` → affected elements (if conflicting)
3. **Document architecture decisions** in markdown

### Phase 6: Verification & Validation
1. **Create TEST_CASE concepts**
   - Set type=`TEST_CASE`, phase=`VERIFICATION`
   - Link to the requirement being tested via `VERIFIES`
2. **Create TEST_RESULT or VERIFICATION_REPORT**
   - Link back to TEST_CASE via `VALIDATES` or `TRACES_TO`
3. **Document test coverage** in markdown:
   ```markdown
   # Test Case: {key}
   
   ## Requirement Under Test
   {Reference}
   
   ## Test Procedure
   {Steps to execute}
   
   ## Expected Result
   {Expected outcome}
   
   ## Pass/Fail Criteria
   {Criteria}
   ```

### Phase 7: Create Baselines (Documentation Snapshots)
1. **Select revisions** — Mark target revisions with `data-agent="btn-set-base"` and `data-agent="btn-set-head"` for comparison
2. **Review diffs** — Use `data-agent="diff-view"` to verify changes
3. **Create baseline** — Document a snapshot:
   - Enter baseline name (convention: `v{major}.{minor}_{PHASE}` e.g. `v1.0_HARA`)
   - Select revisions to include via `data-agent="baseline-revision-{id}"`
   - Click `data-agent="btn-create-baseline"`
4. **Review baseline** — Click `data-agent="baseline-{id}"` to verify contents

### Phase 8: Safety Case Compilation
1. Create `SAFETY_CASE` concept to document the overall safety argument
2. Trace all safety goals through to verification evidence using `TRACES_TO` relations
3. Create `SAFETY_MANUAL` concept for production release documentation
4. Review the full graph in GraphView to ensure complete traceability

## Quality Checks

After each phase, verify:
- ✅ All concepts have descriptive markdown content (not empty)
- ✅ All concepts have appropriate ASIL assignment
- ✅ Relations are created between artifacts (no orphaned concepts)
- ✅ Phase metadata is correct (not empty)
- ✅ Revisions are saved (visible in revisions section)
- ✅ Diff review completed before baselining
- ✅ Baseline captures the correct set of revisions

## Common Patterns

### Naming Conventions
- **ITEM**: `ITEM_<SYSTEM>` — e.g. `ITEM_BRAKE_CONTROL`
- **HAZARD**: `HZ_<DESCRIPTION>` — e.g. `HZ_BRAKE_FAILURE`
- **SAFETY_GOAL**: `SG_<GOAL>` — e.g. `SG_SAFE_BRAKE`
- **FSR**: `FSR_<NUMBER>` — e.g. `FSR_001`
- **TSR**: `TSR_<NUMBER>` — e.g. `TSR_001`
- **TEST_CASE**: `TC_<REQUIREMENT>` — e.g. `TC_FSR_001`

### Basic Usage Sequence (Minimal)
```
1. Login → click btn-login (or use non-auth mode with "Alice")
2. Select work item → select-work-item
3. Create ITEM concept → new-concept-section
4. Write item definition markdown → editor-section
5. Save revision → btn-save-revision
6. Create HAZARD concept → new-concept-section
7. Write hazard analysis → editor-section
8. Save revision → btn-save-revision
9. Create SAFETY_GOAL → new-concept-section
10. Create relations in GraphView → react-flow
11. Create baseline → new-baseline-section
12. Review graph → graph-view-container
```

### Error Recovery
- If a concept type is wrong: create a corrected concept and use `DEPRECATED_BY` relation pattern
- If markdown is lost: load previous revision via `btn-load-revision`
- If relation is wrong: click the edge in GraphView to delete, then recreate
- If baseline is wrong: create a new baseline with corrected selections