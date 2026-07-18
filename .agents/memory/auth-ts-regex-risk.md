---
name: auth.ts regex corruption risk
description: Using String.replace() with regex capture groups ($&) in Edit tool new_string corrupts files
---

**Rule:** Never use JavaScript `String.replace()` with a regex replacement that contains `$&`, `$1`, etc. inside the `new_string` argument of the Edit tool. The Edit tool applies the replacement literally, but if the old_string itself contained regex-special patterns, the replace call will inject the matched text and corrupt the file.

**Why:** When old_string contained a `new RegExp(...)` pattern with `$&` in a `.replace()` call, the Edit tool's internal string replacement interpreted `$&` as "insert entire matched string", embedding the entire source file inside itself.

**How to apply:** Use Python to perform file surgery when replacing content that contains special characters (`$`, `\`, backticks). Read the file, manipulate `lines[]` directly in Python, and write it back.
