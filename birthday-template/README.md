# Birthday template

`prototype.html` is the self-contained recipient template and an executable
default sample. Its only recipient-specific payload is the
`<script id="birthday-data" type="application/json">` block.

Use the marker-preserving renderer to package a fixture or future Generator
form data into a final HTML file:

```powershell
node scripts/render-birthday-html.mjs tests/fixtures/birthday-short.json outputs/HappyBirthday_LeAn.html
```

The renderer validates the schema, escapes JSON for an HTML script context,
embeds the two MP3 files in `public/audio/` as data URLs, and rejects external
asset references. Run `npm run sync:template-audio` after replacing either
default MP3 so `prototype.html` remains directly executable too.
