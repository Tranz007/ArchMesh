# Security Lens

ArchMesh Security Lens answers a narrow, evidence-based question:

> **What sensitive data appears to move through this architecture, where does it go, and what security controls can ArchMesh actually see?**

It is intentionally conservative. ArchMesh does not mark a connection "secure" simply because it uses a familiar provider or SDK. When a protection cannot be proven from repository evidence, the Security Lens reports it as **Unknown**.

## Current evidence

The first Security Lens supports:

- conservative detection of statically visible sensitive payload field names;
- external-boundary detection for static HTTP/HTTPS destinations;
- cleartext `http://` detection;
- `https://` classification as **TLS requested**, not runtime-verified TLS;
- same-origin request transport classified as **Unknown** when deployment transport is not visible in source;
- Firestore read/write relationships with statically visible write field names;
- managed-service transport and at-rest protection classified as **Unknown** unless repository evidence proves more;
- security findings kept separate from runtime health, Git change impact, and architecture drift.

## Sensitive-data classification

ArchMesh currently recognizes an intentionally limited set of explicit field names. Examples include:

- PII: `email`, `phoneNumber`, `firstName`, `lastName`, `dateOfBirth`, `ssn`, `address`, `resume`, `salary`;
- credentials: `password`, `accessToken`, `refreshToken`, `apiKey`, `clientSecret`;
- financial data: `cardNumber`, `cvv`, `bankAccountNumber`, `routingNumber`;
- identifiers: `userId`, `accountId`, `candidateId`, `customerId`.

Only field names and classifications are written into ArchMesh graph metadata. Payload values are not copied into the graph.

This is not semantic taint analysis yet. If a sensitive value is assigned to a generic field such as `value` or `data`, the first version may not classify it.

## Transport states

### Cleartext

A statically visible `http://` destination is direct evidence that the requested transport is cleartext.

If the same request contains a statically visible sensitive payload, ArchMesh raises a high-severity `sensitive-data-over-cleartext` finding.

### TLS requested

A statically visible `https://` destination proves that the application requests TLS transport. It does **not** prove:

- certificate validity at runtime;
- negotiated protocol/cipher details;
- proxy or load-balancer configuration;
- TLS termination behavior;
- provider-side storage protection.

For that reason the UI says **TLS requested**, not **encrypted/secure**.

### Unknown

Unknown means repository evidence is insufficient. It does not mean the protection is absent.

Examples:

- relative same-origin URLs whose production scheme depends on deployment;
- provider SDK transport where runtime/provider behavior is not inspected;
- encryption at rest managed outside the repository.

## External boundaries

Static absolute HTTP/HTTPS destinations are treated as external boundaries. A sensitive-data flow that crosses one is surfaced even when TLS is requested, because the boundary crossing itself is architecturally important.

A boundary crossing is not automatically a vulnerability.

## Relationship to Flow mode

Security Lens and Flow mode can be used together. Security color remains on the connection while Flow pulses show detected movement direction.

Read relationships animate from the data resource back to the reader. Write and call relationships animate from source to target. When both read and write evidence exists between the same nodes, pulses can move in both directions.

The animation represents static evidence, not captured network packets, request volume, or throughput.

## What Security Lens is not

The first version is not a replacement for SAST, DAST, dependency scanning, cloud-security posture management, penetration testing, or a compliance audit.

ArchMesh is designed to make security evidence understandable **in architectural context** and to integrate richer security evidence over time.

## Planned security intelligence

Future slices can add:

- authentication and authorization enforcement mapping;
- cookie/session/JWT configuration analysis;
- client-side secret exposure detection;
- sensitive-data logging detection;
- broader schema/type-aware data classification;
- configurable organization-specific data classes;
- cloud/provider configuration evidence;
- runtime TLS, latency, throughput, and failure telemetry;
- trust-boundary modeling;
- attack-path and security blast-radius exploration;
- import of findings from established SAST/dependency/security tools.

The governing rule remains: **evidence over inference**.
