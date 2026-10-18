<!-- generated from shared/references/kb-discovery.md; edit the source, then run npm run sync -->
# Finding the KB

Search in this order, and stop at the first folder whose `manifest.json` is valid (it has `"kbeeVersion": 1` and a `repos` list):

1. The current folder and each of its parent folders.
2. A **pointer block** in `AGENTS.md` or `CLAUDE.md` at the root of the current git repo. Its path is relative to that repo root:

   ```
   <!-- kbee:start -->
   kbee-kb-path: ../shop-kb
   <!-- kbee:end -->
   ```

3. Folders next to the current git repo's root (siblings), for example `../shop-kb`.

`node <skill-dir>/scripts/kbee-tool.mjs find` does all three steps.

If the user names a KB path or URL, use that instead.

If no KB is found, say so and offer to run **kbee-init**. Never invent a KB, and never write KB files outside a real KB folder.

## Pointer block

`kbee-init` offers to add this block to each code repo, **only with permission**. The full snippet is in `templates/pointer-snippet.md`.
