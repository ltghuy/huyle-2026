---
paths:
  - "apps/learn-english/**"
---

# Event Handlers in JSX

Keep JSX readable: an inline handler is only allowed when it's a single,
short expression that fits on one line.

## Allowed inline

One call or one state update, on one line:

```tsx
<Button onClick={() => setItems(INITIAL_ITEMS)}>Reset</Button>
<Button onClick={() => toast.dismissAll()}>Dismiss all</Button>
<input onChange={(e) => setQuery(e.target.value)} />
<Button onClick={onClose}>Close</Button>   {/* passing a reference is best */}
```

## Not allowed inline: extract a named function

Extract the handler when any of these is true:

- the body spans more than one line (block body `{ … }`, or a call whose
  arguments wrap onto several lines)
- it has more than one statement, a condition, or a `try`/`catch`
- it builds an object/config literal (toast options, request bodies, …)
- it uses promise chains (`.then`, `.catch`, `void …promise`) or `await`
- the same logic is used by more than one element

```tsx
// ❌ Don't
<Button
  onClick={() =>
    void toast
      .promise(saveRequest(latency, failRate), {
        loading: { title: "Saving…" },
        success: (data) => ({ title: "Saved", description: data.savedAt }),
        error: (error) => ({ title: "Save failed", description: String(error) }),
      })
      .catch(() => {})
  }
>
  Save
</Button>

// ✅ Do
function handleSave() {
  void toast
    .promise(saveRequest(latency, failRate), SAVE_MESSAGES)
    .catch(() => {});
}

<Button onClick={handleSave}>Save</Button>
```

## Where the extracted function goes

| Situation | Put it |
|-----------|--------|
| Needs component state, props, or hooks | A `handleX` function inside the component, above the `return` |
| Pure, or only needs its arguments | A module-level function (outside the component), so it isn't recreated each render |
| Static config objects (messages, options) | A module-level `const` in SCREAMING_SNAKE_CASE |
| Reused across components or files | Its own module next to the feature (`apps/learn-english/src/components/{feature}/…`, `apps/learn-english/src/lib/…`) |
| Handler needs a per-item argument in a list | `onClick={() => handleDelete(item.id)}`: a one-line call to the named handler is fine |

## Naming

- Handlers in a component: `handle` + event/intent: `handleSave`, `handleDelete`, `handleKeyDown`.
- Props that receive handlers: `on` + event/intent: `onSave`, `onEscape`.

Doesn't apply to generated shadcn files in `apps/learn-english/src/components/ui/`.
