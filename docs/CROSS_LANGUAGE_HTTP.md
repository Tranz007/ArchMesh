# Cross-language HTTP evidence

ArchMesh can connect a statically visible JavaScript/TypeScript `fetch()` request to a semantic API handler produced by another framework adapter, including a FastAPI handler in Python.

The goal is not to guess at runtime routing. The goal is to make a cross-language relationship visible when repository evidence is strong enough to defend it.

## Example

Given a TypeScript caller:

```ts
await fetch('/orders', {
  method: 'POST',
  body: JSON.stringify({ email }),
});
```

and one FastAPI handler:

```py
@app.post('/orders')
def create_order():
    ...
```

ArchMesh can add this relationship to the shared graph:

```text
Web source ── POST /orders ──► FastAPI handler
   │                              │
JavaScript/TypeScript           Python
   │                              │
Web system                     API system
```

If system boundaries were detected, the System Map can aggregate the same evidence into:

```text
Web App ── POST /orders ──► Orders API
```

The original source-level relationship remains the evidence underneath the projection.

## Matching rules

ArchMesh links a request only when:

1. the caller is a scanned JavaScript/TypeScript source file;
2. `fetch()` has a static relative URL;
3. the HTTP method is statically knowable;
4. a semantic API handler exposes a compatible static route path and method; and
5. exactly one handler matches.

An exact method/path match is preferred. If there is no exact match, one parameterized route such as `/orders/{order_id}` may match a concrete path such as `/orders/123` when its segment shape is unambiguous.

## Cases ArchMesh deliberately leaves unresolved

ArchMesh does not create an internal endpoint edge for:

- template/dynamic URLs;
- environment-variable or runtime-composed base URLs;
- absolute external URLs such as `https://example.com/orders`;
- two or more semantic handlers with the same compatible method/path;
- reverse-proxy or ingress rewrites that cannot be proven from repository evidence.

An omitted relationship is preferable to a convincing but fabricated one.

## Provenance

Matched edges include graph metadata describing:

- `endpointMatch: static-method-path`;
- the matched route path;
- the matched framework;
- source and target language;
- whether the edge crosses a language boundary;
- whether it crosses a detected system boundary.

Request security evidence, such as statically visible sensitive body fields, is retained on the same edge.

Selecting the connection in the viewer explains this evidence and reminds the user that source-level matching does not prove the request succeeds at runtime or that deployment routing preserves the same path.

## Existing framework resolution wins

If a framework adapter has already resolved the same request — for example a Next.js relative call to a local App Router API handler — the cross-language linker does not add a competing edge.

Framework-native evidence is allowed to be more specific than the generic linker.

## What this enables

Because the result is a normal ArchMesh `calls` edge, the relationship automatically participates in:

- System Map aggregation;
- Trace investigation;
- directional Flow;
- Security Lens evidence;
- runtime health propagation;
- Git change impact;
- architecture drift.

Cross-language HTTP matching is therefore a graph-evidence layer, not a separate visualization mode.
