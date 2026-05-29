# Portfolio

Personal portfolio project repository. As of the initial setup, the repo contains no application source, dependency manifests, or service definitions.

## Cursor Cloud specific instructions

### Repository state

- **Working tree:** Only this `AGENTS.md` file (plus `.git`).
- **Remote:** `github.com/freenandes/portfolio` on branch `main`.
- **No tooling configured:** No `package.json`, `pyproject.toml`, `Dockerfile`, `docker-compose`, `Makefile`, or CI workflows.

### Services

| Service | Required | Notes |
|---------|----------|-------|
| *(none)* | — | No services are defined until application code is added. |

### Lint / test / build / run

Not applicable until project tooling is added. When code lands, update this section with the concrete commands (and any non-obvious startup caveats) for the stack in use.

### VM update script

The startup update script is intentionally minimal (`true`) because there are no lockfiles or dependency manifests to refresh. Once dependencies exist, replace the update script with the appropriate install/sync command (for example `npm ci`, `pnpm install`, or `uv sync`).
