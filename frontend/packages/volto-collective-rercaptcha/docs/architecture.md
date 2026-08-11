# Architecture

## File structure

```
src/
├── components/
│   ├── Blocks/                        "Captcha Test" demo block (not used in production)
│   └── Widget/
│       ├── CapJsWidget.tsx            low-level PoW engine (wraps @cap.js/widget)
│       ├── CaptchaPendingFeedback.tsx "verification in progress" feedback for invisible mode
│       └── FormWidget/
│           ├── RerCaptchaWidget.tsx   public component: assembles engine + UI
│           ├── useRerCaptchaEngine.ts state machine (status, execute, reset), no JSX
│           └── CaptchaCheckControl.tsx  UI for the explicit-button mode
├── hooks/
│   └── useRerCaptchaShowButton.ts     reads the `show-button` flag from rercaptcha-data
└── customizations/
    ├── volto-form-block/components/Widget/Captcha.jsx           Form block integration
    ├── design-comuni-plone-theme/.../CustomerSatisfaction/FeedbackForm.jsx
    └── @redturtle/volto-newsletter/views/Channel.jsx
```

## Responsibility of each module

### `CapJsWidget.tsx`

Renders nothing (`return null`). Wraps the `@cap.js/widget` library:

- starts `cap.solve()` — on mount if `autoStart` (default `true`, for
  backward compatibility with consumers that don't opt into the new
  contract), or on demand via `execute()` exposed through a `ref`
  (`forwardRef`/`useImperativeHandle`);
- forwards `onSolve`/`onError`/`onProgress` to the caller;
- forwards `onReset`, emitted by `cap.js` both when the token expires
  (internal timer based on `resp.expires`) and — suppressed by
  `suppressResetRef` — during its own cleanup (unmount/remount), to avoid
  an infinite loop when the widget's consumer remounts the instance in
  response to `onReset`.

### `useRerCaptchaEngine.ts`

The actual state machine, independent of any JSX (so it's testable on its
own, without mounting anything visual):

- states: `idle → solving → solved | error`;
- a queue of pending callbacks (`pendingCallbacksRef`), because
  `execute({ async: true })` can be called more than once before the
  computation finishes (e.g. submit + click on the button in quick
  succession);
- `solvedTokenRef`: tracks the resolved token independently of the
  external `captchaToken` (optional — not every consumer passes it).
  Without this, calling `execute()` again after the explicit button has
  already resolved the check would leave the Promise hanging forever,
  because the engine wouldn't restart (it's no longer `idle`/`error`) and
  no `onSolve`/`onError` would ever arrive to settle it;
- `generation`: used as the `key` of `CapJsWidget` to remount it (cap.js
  tokens are single-use: after a `reset()` — manual or on expiry — a fresh
  instance is needed to compute another one);
- exposes `execute()`/`reset()` to the caller through `captchaRef`
  (`useImperativeHandle`), if passed.

### `CaptchaCheckControl.tsx`

Purely presentational. Receives `status` and an `onExecute` callback, and
knows nothing else about the state machine. Three variants:

1. checkbox (idle) / disabled checkbox + spinner (solving);
2. green checkmark "Verification completed" (solved);
3. red X "Verification failed" + icon "Retry" button (error) — simply
   calls `onExecute` again.

The icons are Unicode symbols with inline color (✓/✕/↻), not
`semantic-ui-react`'s `Icon` component: that icon depends on a font/CSS
that isn't loaded on the public theme (Bootstrap Italia), so it would
stay invisible — `Loader` is fine instead (pure CSS, no font).

### `RerCaptchaWidget.tsx`

The component used inside forms. Decides the mode by reading
`rercaptcha-data.show-button`, and assembles `CapJsWidget` +
`useRerCaptchaEngine` + (in button mode) `CaptchaCheckControl` +
`CaptchaPendingFeedback` + the validation error message, if any. See
[how-it-works.md](./how-it-works.md) for the full usage contract.

### `hooks/useRerCaptchaShowButton.ts`

The single place that reads `rercaptcha-data` from Redux and the
`show-button` flag. Used both internally by `RerCaptchaWidget` and by
whoever consumes the widget (`FormView.jsx`, `FeedbackForm.jsx`,
`Channel.jsx`) to decide whether to pre-block their own submit button.
**The flag's name is provisional**: if the backend renames it, this is
the only file that needs updating.

## Why this split

Before the refactor, `RerCaptchaWidget.tsx` was a single 450-line file
mixing the state machine, the Redux data read, and the presentation — the
`show-button` flag read, in particular, was duplicated almost verbatim in
4 different places (the consumers). Separating the state machine from the
presentation makes each testable/modifiable without touching the other;
centralizing the flag read in an exported hook removes the duplication
and reduces a future rename to a single file.
