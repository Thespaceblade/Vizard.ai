# Automated changes log

This file is updated after every automated change so it can be used for descriptive, conventional commit messages.

**Last updated:** 2026-03-03

## Recent changes

_Summary of the most recent automated edits. Use this section when crafting commit messages._

- Implemented multi-agent feedback loop framework in `web/src/lib/multi-agent.ts`.
- Added autonomous D3.js code generation for custom visualizations.
- Updated web frontend and API routes to support sandboxed D3 chart rendering.
- Added comprehensive agent feedback test script.
- Reorganized IDE rules and process tracking into the `IDE/` directory.

---

## Commit convention

When committing, use this file to write the commit message in [Conventional Commits](https://www.conventionalcommits.org/) style:

- **feat:** new feature
- **fix:** bug fix
- **docs:** documentation only
- **chore:** tooling, deps, config (no production code)
- **refactor:** code change that neither fixes a bug nor adds a feature
- **style:** formatting, whitespace, etc.
- **test:** adding or updating tests

Example: `feat(web): add upload API route for agent attachments`
