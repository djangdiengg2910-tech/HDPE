# Shared modules

- `birthday-schema.mjs`: schema validation, Vietnamese/Unicode-safe initials,
  and safe fallback values.
- `escape.mjs`: HTML escaping and JSON serialization safe for an
  `application/json` script tag.
- `template-builder.mjs`: replaces exactly one data marker and rejects external
  asset dependencies in the final HTML.
