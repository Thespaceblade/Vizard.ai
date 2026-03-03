# Automated changes log

This file is updated after every automated change so it can be used for descriptive, conventional commit messages.

**Last updated:** 2026-03-03

## Recent changes

_Summary of the most recent automated edits. Use this section when crafting commit messages._

- Updated `IDE/rules/*.mdc` to point to the correct `IDE/CHANGES.md` path.
- Established the `IDE` folder as the primary context for pushes, pulls, and automated process tracking.

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
