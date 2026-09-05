Consumer scope:
  in-repo: Goo, Goo.Svg, apps, tests, tools, templates, integrations
  excluded dirs: tests/GooExtended.Tests is ignored but searched; WindowReadbackFixture.gs and FailedIdleFixture.gs are removed from smoke projects and imported by test-enabled framework builds; template bin/obj excluded
  external repos: Goo Desktop, Hivemind-Goo, LOTD, LOTD-live, Reaver, android-research, diskfrisk, dotnet-os, gex, goo-gallery-wip, goo-gsharp-internal, goo-projects, goo-release-clean-audit, goo-shell, goopi, psone-research, sandbox, uproar95, uproar95-android-alpha (content search of .gs/.cs under /home/xaz/Projects, bin/obj/.git excluded, full file list consumer-files.txt)
  locked surface: tests/Goo.ApiContractTests/PublicApi.approved.txt and docs/api/Goo.xml.supplement.xml
  off-machine: external consumers exist, but user explicitly permits justified pre-1.0 breaking changes. Consumer needs are not design constraints. Avoid gratuitous breaks.
