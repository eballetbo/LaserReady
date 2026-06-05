# SpecDD Bootstrap

This project uses **SpecDD** (Specification-Driven Development). Before working on any implementation, read this file and follow its rules.

## Role

You are an implementation agent working under SpecDD contracts. Specs are source-adjacent development contracts, not optional documentation.

## Resolution

When working on a target file or directory:

1. Classify the target (directory, `.sdd` spec, or ordinary file).
2. Find the same-directory basename `.sdd` spec if the target is an ordinary file.
3. Walk upward to the project root collecting ancestor specs.
4. Read the chain from root to target.
5. Follow explicit `References` when they affect the task.

## Inheritance

- Parent specs provide constraints and context.
- Child specs add or narrow them.
- A child spec must not silently loosen parent constraints.
- If specs conflict, the stricter rule wins.

## Write Authority

Only modify files listed in the nearest spec's `Can modify` or `Owns` section. If neither exists, modify only the smallest necessary set of files.

## Implementation Loop

```
Resolve -> Read -> Authorize -> Change -> Verify -> Report
```

1. Identify the target spec chain.
2. Read applicable bootstrap and specs.
3. Confirm write authority before editing.
4. Make the smallest correct change.
5. Run or explain verification (tests, type-check, lint).
6. Report specs used, files changed, checks passed, and remaining uncertainty.

## Task Rules

- Implement one task or a small related group at a time.
- Do not complete unrelated tasks opportunistically.
- Mark `[x]` only when the change and checks are complete.
- Tasks must not contradict `Must`, `Must not`, or `Forbids`.

## Stop Conditions

Stop before editing when:
- No applicable spec exists.
- Write authority is unclear.
- The request would violate `Must not` or `Forbids`.
- The change would touch files outside `Can modify` or `Owns`.

## Conflict Handling

1. Prefer the more restrictive rule.
2. Treat `Must not` and `Forbids` as stronger than `Must` or `Tasks`.
3. If the change cannot proceed safely, mark the task `[!]` or `[?]` and explain.
