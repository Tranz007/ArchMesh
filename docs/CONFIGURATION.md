# Project configuration

ArchMesh is designed to produce a useful architecture view with no setup. It detects feature areas from common project conventions such as Next.js App Router segments and `features/`, `modules/`, or `domains/` directories.

Detection is intentionally conservative. A codebase's folder structure is not always the same thing as its product architecture, so ArchMesh also supports explicit project semantics.

## Configuration locations

ArchMesh looks for the first of these files in the scanned project:

```text
archmesh.config.json
.archmesh/config.json
```

No configuration file is required.

## Feature mappings

A feature mapping teaches ArchMesh which source paths belong to a human-recognizable product area.

```json
{
  "features": [
    {
      "id": "story",
      "label": "Vetttd Story",
      "paths": [
        "src/app/story/**",
        "src/features/story/**",
        "src/components/story/**"
      ]
    },
    {
      "id": "hiring",
      "label": "Vetttd Hiring",
      "paths": [
        "src/app/hiring/**",
        "src/features/hiring/**"
      ]
    },
    {
      "id": "campus",
      "label": "Vetttd Campus",
      "paths": [
        "src/app/campus/**",
        "src/features/campus/**"
      ]
    }
  ]
}
```

`id` is the stable graph identity. Keep it short, lowercase, and durable.

`label` is optional display text. When omitted, ArchMesh derives a readable label from the ID.

`paths` is one or more project-relative glob patterns. Current glob support includes `*` for one path segment fragment and `**` for recursive matching.

## Configuration wins over inference

If a file matches a configured feature, that explicit mapping wins over automatic folder inference.

ArchMesh preserves the source of the semantic decision in graph metadata:

```text
semanticSource = config
```

Automatically inferred feature groups use:

```text
semanticSource = detected
```

This distinction is deliberate. ArchMesh should never present an inferred product boundary as if the project explicitly defined it.

## Keep configuration architectural

Configuration should describe stable product or system meaning, not patch every scanner limitation.

Good mappings:

- Story
- Hiring
- Campus
- Billing
- Identity
- Admin
- Shared UI

Avoid creating a feature entry for every directory or implementation detail. The raw Code view already exists for structural detail.

## Privacy

Configuration stays inside the project being scanned. ArchMesh reads it locally and embeds only the resulting semantic metadata in the locally generated `public/archmesh.json` used by the viewer.
