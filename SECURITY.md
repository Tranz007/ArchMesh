# Security and privacy

ArchMesh is designed to inspect source code, so privacy boundaries are part of the product architecture.

## Local-first default

The core scanner and viewer are intended to run on the developer's machine. The initial implementation does not require source code to be uploaded to an ArchMesh service, model provider, hosted graph database, or telemetry backend.

Generated graph data is written locally to:

```text
public/archmesh.json
```

Treat that file as potentially sensitive because it may contain project filenames, paths, integration names, and architectural relationships.

## Generated data

Do not commit `public/archmesh.json` when it contains a scan of a private or proprietary repository. Purpose-built public fixtures should contain only deliberate sample source.

## Future integrations

Optional future production/runtime adapters must document:

- what data leaves the machine;
- destination/service;
- authentication requirements;
- retention assumptions;
- whether source code, logs, identifiers, or graph data are transmitted;
- how the integration can be disabled.

Cloud integration must not become a hidden requirement for core architecture exploration.

## Local server exposure

The development viewer binds through Vite for local use. If future CLI packaging allows binding to non-loopback interfaces, that behavior must be explicit and documented. Do not assume a local architecture graph is safe to expose on an untrusted network.

## Dependencies

Keep third-party dependencies deliberate, especially packages that execute native code, download binaries, run install scripts, or communicate externally. Prefer well-maintained libraries with a narrow reason for being present.

## Reporting a vulnerability

Please avoid opening a public issue containing exploit details or sensitive project data. Until a dedicated private security contact/process is published, contact the repository owner privately through an appropriate GitHub/private channel and provide reproduction details with sensitive information removed where possible.

## Scope statement

Security documentation will evolve with the product. The current first slice is a local development tool, not a hardened multi-user hosted service.
