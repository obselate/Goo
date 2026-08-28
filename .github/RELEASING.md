# Releasing Goo

Goo releases use annotated `vX.Y.Z` tags from `main`.

## Versioning

Goo uses Semantic Versioning.

- Increase `MAJOR` for an incompatible public change after 1.0.0.
- Increase `MINOR` for a compatible feature or an incompatible 0.x change.
- Increase `PATCH` for a compatible fix.
- Use `-name.number` for a prerelease.

## One-time NuGet setup

1. Create a NuGet.org trusted-publishing policy for the package owner.
2. Set repository owner `obselate`, repository `goo`, workflow `ci.yml`, and environment `release`.
3. Set the GitHub repository variable `NUGET_USER` to the NuGet.org profile name.

## Release

1. Update both package project versions, README install commands, `CHANGELOG.md`, and `GOO_VERSION` in `.github/workflows/ci.yml`.
2. Push the release commit to `main` and require a green CI run.
3. Create and push the annotated tag: `git tag -a vX.Y.Z -m "Goo X.Y.Z"`.
4. The tag run rebuilds and validates the package, publishes it to NuGet.org, and creates the GitHub Release.

Do not move or reuse a published tag or NuGet version.
