# Automated changes log

This file is updated after every automated change so it can be used for descriptive, conventional commit messages.

**Last updated:** 2025-03-02

## Recent changes

_Summary of the most recent automated edits. Use this section when crafting commit messages._

- Added `.cursor/CHANGES.md` and Cursor rules to log automated changes and use them for conventional commit messages.
- Added `.cursor/rules/update-changes-after-edit.mdc` and `commit-conventions.mdc` for change logging and commit/push behavior.
- Added root `.gitignore` for OS, env, Python, and Node artifacts.
- Created `docs/SETUP.md` for partner onboarding (clone, deps, run web + python-service).
- Updated root `README.md` with quick start and repo structure.
- Added `.nvmrc` (Node 20) for consistent Node version across machines.

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
