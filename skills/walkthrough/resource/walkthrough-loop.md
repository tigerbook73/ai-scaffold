# walkthrough-loop

Shared interaction loop — loaded by `create-walkthrough` and `start-walkthrough` when entering the presentation phase.

---

## Preconditions

When entering this loop, the following variables are already available from the caller:

- `{stateKey}` — the current walkthrough state key
- `{repo}` — path to the skill repository (from `~/.ai-skills/config.json`)
- `{cwd}` — the user's project working directory

If index.json is not yet loaded in the current context, run:

```
state read --key {stateKey}
```

Fetch `currentGroup`, `totalGroups`, `intent`, `groups[]`, and other fields from it.

---

## Display current group

Read and output `{cwd}/.ai-skills/walkthrough/{stateKey}/g{currentGroup}.md` (using the Read tool).

After outputting the content, immediately append the lookahead prompt (see below).

---

## Lookahead prompt format

After each group's content, append one line:

```
---
Walkthrough (G{N}/{totalGroups}) — `wtgroup next` next · `wtgroup G{N}` goto · `wtgroup list` list · `wtgroup finish` finish
```

**Note**: Do not guess whether the last group has been reached based on position — users may read non-sequentially.
Only proactively enter the completion flow when reading index.json shows **all** `groups[].done === true`.
Otherwise always display the standard prompt line.

---

## Command recognition model

### Strong keywords (signal walkthrough navigation intent)

`wtgroup` · `walkthrough group` · `走读组`

A strong keyword alone defaults to the `next` action.

### Action words

| Action word (English and Chinese accepted) | Intent                         |
| ------------------------------------------ | ------------------------------ |
| next / 下一个 / 下一步 / 继续              | Advance to next group          |
| prev / 上一个 / 返回                       | Go back to previous group      |
| G{N} / goto N / 第{N}组 / {N}              | Jump to group N                |
| finish / 完成 / 结束                       | Finish the walkthrough         |
| list / 列表                                | List all groups and done state |
| overview / 概览                            | Re-display global overview     |

### Strong trigger (strong keyword + action word, any order — execute immediately)

Examples: `wtgroup next` · `next wtgroup` · `走读组 G3` · `wtgroup finish` · `wtgroup 3`

### Weak trigger (action word only, no strong keyword)

Execute only when context is **unambiguous**; otherwise answer the question first.

Ambiguity criteria: message contains a question, code references, or discussion unrelated to walkthrough navigation → treat as ambiguous, do not trigger.

### Ambiguity handling

Answer the user's question normally, then append at the end:

> To navigate, say `wtgroup next` / `wtgroup G{N}` / `wtgroup finish`.

---

## Command execution

**next**

```
state next --key {stateKey}
```

- Success → output the command's stdout (the next group's content), append lookahead prompt
- exit 1 (no next group file) → enter completion flow

**prev**

```
state prev --key {stateKey}
```

- Success → output the previous group's content, append lookahead prompt
- exit 1 (already at first group) → inform "Already at the first group"

**goto N**

```
state goto --n {N} --key {stateKey}
```

- Success → output the target group's content, append lookahead prompt
- exit 1 (N out of range) → report valid range `1..{totalGroups}`

**list**

Read index.json directly and output all group labels and done status (no CLI call):

```
G1 [✓] {groups[0].label}
G2 [ ] {groups[1].label}
...
Current: G{currentGroup}
```

**overview**

Reconstruct and output global overview from index.json:

```
Change intent: {intent}

{totalGroups} groups:
  G1 {label} — (done / in progress / not started)
  G2 {label} — ...
  ...
```

**finish**

Enter completion flow (see below).

---

## Completion flow

1. Run `state finish --key {stateKey}` (sets status to completed)
2. If `index.checkedOut === true`: prompt the user to run `git checkout -`
3. Ask: "Walkthrough complete. Delete the state record?"
   - Yes → `state delete --key {stateKey}`
   - No → keep it; inform the user they can resume anytime with `start-walkthrough`
