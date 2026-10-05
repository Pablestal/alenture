---
description: Verify the schema, the migrations and the generated types all agree
---

Check that three things say the same thing, and report where they diverge:

1. `supabase/migrations/` — what the history claims
2. The live schema — what's actually deployed
3. `src/types/database.ts` — what the code believes

Steps:

- `npx supabase migration list` — every migration should appear in both columns
- Confirm `src/types/database.ts` is CLI-generated, not hand-written: check its
  encoding (UTF-8, not UTF-16), its formatting, and its mtime
- Grep the file **on disk** for the columns the most recent migration added or
  removed. Do not grep the CLI's output.
- `npx tsc -b --noEmit`

Report what you found. Do not fix anything and do not regenerate the types —
say what needs running and let me run it.

A green `tsc` is not evidence of agreement. State that in the report if the
other checks didn't pass.
