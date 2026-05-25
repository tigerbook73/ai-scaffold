# confirm-intent

Confirm the user's intended outcome before acting, then wait for explicit final confirmation unless the user has clearly allowed direct execution.

---

## Constraints

- Do not execute the task until the final confirmed interpretation is summarized and the user explicitly confirms it.
- Skip the final confirmation gate only when the user explicitly says to proceed without confirmation, execute directly, or continue after clarification without waiting.
- Do not edit files, run destructive commands, deploy, migrate data, change credentials, or make broad architectural decisions until material ambiguity is resolved and final confirmation is received.

## Scope

- This skill applies only to the current user request and its clarification loop.
- After the user confirms the final interpretation and the confirmed task is completed, immediately return to default agent behavior.
- Do not apply this skill's final confirmation gate to unrelated later requests unless the user explicitly invokes this skill again.
- If a later request is ambiguous but this skill was not invoked, follow the agent's normal clarification behavior instead of this skill's stricter confirmation gate.
- Treat "exit confirm-intent", "确认模式结束", or equivalent wording as an explicit instruction to stop applying this skill.

## Input

`$ARGUMENTS`: optional natural language request or clarification focus.

- No argument -> clarify the current user request using conversation context.
- Request text -> clarify that request before implementation.
- Focus hint -> prioritize that ambiguity area, such as scope, output format, risk, audience, or implementation approach.

## Steps

### Step 1 — Infer intent

Read the user's request and relevant conversation context. State the likely intended outcome in concrete terms, including the deliverable or action the user appears to want.

### Step 2 — Identify assumptions

List only assumptions that affect the result, such as scope, files, audience, platform, constraints, success criteria, or whether implementation should begin immediately.

### Step 3 — Surface material ambiguity

Call out ambiguity only when different interpretations would change the work, cost, risk, user experience, architecture, data, or external side effects.

### Step 4 — Resolve material ambiguity

- No material ambiguity -> continue to the final confirmation gate.
- Materially ambiguous -> explicitly state the ambiguity, explain why it matters, ask concise clarification questions, and stop until the user answers.
- Partial clarification -> update the working interpretation with resolved points, state what remains unresolved, and ask only about remaining material ambiguities.

High-impact actions include destructive operations, broad refactors, database migrations, deployments, credential changes, payment or billing changes, public release actions, and changes with external side effects.

### Step 5 — Ask focused questions

Ask the fewest questions needed to avoid doing the wrong work. Prefer concrete options when useful, but do not force choices when the user needs to describe intent freely.

### Step 6 — Final confirmation gate

After ambiguity is resolved, summarize the final clarified request, including scope, assumptions, exclusions, and intended next action. Ask the user to confirm before implementation.

Proceed only after the user explicitly confirms the full summarized interpretation, unless they already instructed the agent to skip confirmation or execute directly.

---

## Response Patterns

When clarification is needed:

```text
I understand your goal as: ...
I would proceed with these assumptions: ...
The points that could change the result are: ...
Please confirm: ...
```

When the clarified request is ready for final confirmation:

```text
Final interpretation:
- Goal: ...
- Scope: ...
- Assumptions: ...
- Exclusions: ...
- Next action after confirmation: ...

Please confirm this full interpretation before I proceed.
```

## Notes

- Do not over-explain obvious context.
- Treat "go ahead", "confirmed", "yes, proceed", or equivalent wording as final confirmation when it clearly refers to the summarized interpretation.
- Do not require the user to restate the full request after partial clarification; carry forward prior context and ask only about unresolved material ambiguity.
- If the user explicitly asks only for clarification, stop after producing the clarified request unless they ask to implement.
