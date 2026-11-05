# An eval recipe for a functional copilot

Unit tests prove the rules. The scripted demo against the mock proves the plumbing. Neither proves
that a real model picks the right tools in the right order, and a model upgrade can change that without
telling you. This recipe is the smallest thing that does. It is checklist item R8, and
`/functional-copilot` links here.

## 1. Cases: start from the demo script

Every step in the demo script is a case: a sentence someone types or a click, the state before it, and
what should happen after. In Open Harvey that's `src/lib/demo-script.ts` (`DEMO_SENTENCES`), played
step by step in `src/lib/demo-script.test.ts`. For each case, write down:
- **the tool calls you expect, in order:** the names and the arguments that matter, such as
  `readMatter` with the matter id, then `proposePlan`;
- **the gate that must open:** a `useHumanInTheLoop` card such as `requestApproval`, and the answer the
  case gives it (approve, or not yet);
- **the artifact afterwards,** read from the store: the findings, the route, what still needs a
  reason, and what was sent. Nothing may go out that the case didn't approve.

Add one case for each send-back reason you see in real reviews, and the four red-team cases from R8:
- an instruction planted in a document;
- approving as someone else;
- asking to send straight to the other party;
- a key pasted into a message.

## 2. Harness: the mock test, with a real model

Reuse the stand-in for the browser that the mock test already has. It runs the real tool handlers, the
real gate functions and the store, and it rebuilds the context from the store before every model call,
as `useAgentContext` sends it. Change one thing: answer each model call with the real model instead of
the scripted `nextStep()`.
- Build the model with `resolveModel("openai/gpt-5.4-mini")` from `@copilotkit/runtime/v2`, or
  whatever `COPILOT_MODEL` names.
- The harness answers each gate card exactly as the case says, and never approves anything the case
  didn't ask for.

## 3. Score: the tool calls and the artifact, not the prose

- **Tool calls.** The expected calls appear in order. Extra reads are fine. There is no write outside
  a gate, and no tool the case didn't expect to change anything.
- **Artifact.** Compare the store after the case with the expected artifact, using the same pure
  functions the unit tests use.
- **Reply.** Check only what matters, with plain string checks: it cites the rule id, it asks for the
  missing reason. Don't grade prose with another model unless nothing else works.

Real models vary from run to run, so run each case three to five times. Set a pass mark: every
red-team case passes every time, and each key flow passes, for example, at least four runs in five.

## 4. When it runs

- On every change to the prompt, the model, a tool or its schema, and before you change `COPILOT_MODEL`.
- Keep it out of the default `npm test`, because it needs a key and costs money. Give it its own
  script (for example `npm run eval`) and run it in CI with the key from CI's secret store. The agent
  running this skill never reads that key.
- Keep each run's results with the model version, so a drop after an upgrade shows up.

When a case fails, replay it with the CopilotKit web inspector on (`enableInspector` on
`CopilotKitProvider`). It shows the AG-UI events, the tool calls and the context the model saw.
