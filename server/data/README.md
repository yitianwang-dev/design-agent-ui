# server/data/

Static data files consumed at runtime by the generation pipeline.

## library-dict.json

Structured dictionary extracted from the Twomi Library file's `⚒️ Component State - *` documentation pages. Each entry describes a component's:

- catalog metadata (key, name, official description, variant axes)
- behavioral states (when each state appears, what's displayed)
- user-flow interactions (taps / swipes → resulting screens)
- design constraints / caveats (e.g. "Self Avatar does not have LOCK state")
- agent usage hints (spec keyword → state/variant mapping)
- screens-level inverted index (which components appear together on which screens)

### Current coverage

Only 2 of 286 Library components are documented so far — Hori is in early documentation phase. The 2 covered:

- `profile/avatarThumbnail` (key `3571bee8...`)
- `Avatar Card` (key `fe32a4db...`)

### Not yet consumed by the agent

This file is **data only**. The generation pipeline (`server/src/services/claude.js`) does not yet load it. Integration planned for when ≥20 components are documented; see `_next_steps` inside the JSON for the planned approach.

### How to refresh

When Hori adds more dictionary pages in Figma:

1. Run the Figma MCP `get_design_context` against each `⚒️ Component State - <name>` page
2. Extract states / interactions / display rules per the schema documented inside the JSON (`_meta.intent`)
3. Append to `components[]` array
4. Validate with `node -e "JSON.parse(require('fs').readFileSync('server/data/library-dict.json','utf8'))"`

### Field tiers for agent consumption

Not all fields should be injected into the agent system prompt. When integration is wired in:

**Tier A — always inject when a component matches (~500B per component)**:
`name`, `component_key`, `default_state`, `agent_usage_hint.spec_signal_to_state`, `agent_usage_hint.spec_signal_to_variant`, `caveats[severity=critical]`

**Tier B — inject for complex specs (~1KB more)**:
`purpose`, `display_rules`, `display_constraints`, `states.{X}.display`, `states.{X}.actions`, `states.{X}._inferred_user_flow.next_actions`, `interactions`, `agent_usage_hint.common_combinations`

**Tier C — never inject (humans / integration code only)**:
all `_*` meta fields, `_source.*`, `page_id`/`page_name`/`library_key`/`updated_at`, `_inferred_user_flow.enter_via/user_intent/preceded_by_*`, `_agent_integration_examples`, `_screens_index` (use as separate retrieval index, not in prompt)
