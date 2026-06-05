# AGENTS.md

Before working on this project, read `.specdd/bootstrap.md` and `.specdd/bootstrap.project.md`.

Assume the role, rules, workflow, and implementation constraints described there. Treat SpecDD specs (`.sdd` files) as source-adjacent development contracts, not optional documentation.

## Quick Reference

- **Root spec:** `LaserReady.sdd`
- **Module specs:** `src/features/*/` directories contain `*.sdd` files
- **Feature specs:** Colocated with source files (`feature.sdd` beside `feature.ts`)
- **Workflow:** Write spec → Review → Implement → Test → Update tasks
