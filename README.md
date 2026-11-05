# Building Enterprise-Ready Functional Copilots

Workshop materials for the CopilotKit session on **Thu Nov 5 2026** (https://luma.com/a3gyijc6).

> **Beta.** The skills, starters and checklist are early and still changing. Expect rough edges, and
> open an issue when something doesn't work.

Repo: https://github.com/jerelvelarde/functional-copilots (the one place the repo's URL is written; everything else points here).

A *functional copilot* is an agent built for one business function (HR, finance, procurement, supply
chain, legal, IT, support) that takes one real workflow from the first question to an approval-ready
result, with the people who own it in control. This repo follows one story end to end, "Signed by
Friday" ([`docs/story.md`](docs/story.md)): Northstar Software's senior counsel gets a vendor contract
reviewed, approved and signed with a contract-review copilot. A second example applies the same blueprint
to HR and Finance (a headcount request). Every company, person and vendor is fictional.

## What's here

| Path | What it is |
| --- | --- |
| [`starters/open-harvey/`](starters/open-harvey/) | **The live demo.** Open Harvey, a contract-review copilot: a 17-task plan you approve, a checklist it works live, cited findings, redlines you can edit, routed approvals and a playbook that learns. Next.js + CopilotKit + AG-UI; runs without a key on a scripted mock |
| [`starters/openbot-legal/`](starters/openbot-legal/) | **The OpenBot segment.** Open Harvey on [OpenBot](https://github.com/CopilotKit/openbot): the same legal copilot as a coworker, the Contract Copilot, with Northstar Legal (a tested MCP server that owns every finding, number and route), granted tools and skills, an ask-first rule before anything is resubmitted, and an audit trail. A tenant package, a branding patch for OpenBot `af42cc6f`, and the recorded "Friday morning" clip |
| [`starters/copilotkit-headcount/`](starters/copilotkit-headcount/) | The second example: an HR and Finance headcount copilot built on the same blueprint (generative UI, shared state, human approvals, a learning panel) |
| [`starters/openbot-headcount/`](starters/openbot-headcount/) | The headcount copilot as an [OpenBot](https://github.com/CopilotKit/openbot) coworker package: granted tools and skills, an approval rule before submit, an audit trail (Slack through OpenTag is in preview) |
| [`starters/shared-data/`](starters/shared-data/) | The fictional dataset the two headcount starters share: headcount plan, comp bands, policy, past approvals |
| [`skills/functional-copilot/`](skills/functional-copilot/) | **The root skill. Start here.** It walks the whole process and hands off to a step skill at each step. Its own step is 3, spec and build: it interviews you, writes a copilot spec (markdown, plus an HTML page you keep open) for your approval and adapts a starter (Open Harvey or headcount). Example page: [`examples/contract-review-spec.html`](skills/functional-copilot/examples/contract-review-spec.html) |
| [`skills/user-map/`](skills/user-map/) | Step 1, Research: the role, its software's UI pattern, its jobs-to-be-done and flows, and where the copilot sits in that workspace |
| [`skills/agent-context/`](skills/agent-context/) | Step 2, Context and access: the files, systems and people the agent needs, from the computer to the cloud (app context, runtime tools, MCP, Channels, Intelligence) |
| [`skills/deploy/`](skills/deploy/) | Step 4, Deploy: from a laptop to a running deployment, with a filled deploy checklist |
| [`skills/secure-governance/`](skills/secure-governance/) | Step 5, Secure and govern: security and governance in prototype or production mode |
| [`docs/decision-checklist.md`](docs/decision-checklist.md) | The decisions behind your own copilot (build, deploy, govern), each with what the starter does and the CopilotKit docs page |
| [`research/functional-copilots.md`](research/functional-copilots.md) | Which functions are adopting copilots, common workflows per function, sources |
| [`docs/story.md`](docs/story.md) | The story the session tells ("Signed by Friday") |

## Build your own in an afternoon

Start with `/functional-copilot`. It is the root of a small suite: it explains the whole process, does
the spec and the build itself, and hands off to a step skill at each other step.

```
functional-copilot
  1 Research          /user-map
  2 Context & access  /agent-context
  3 Spec & build      /functional-copilot
  4 Deploy            /deploy
  5 Secure & govern   /secure-governance
  Learn               CopilotKit Intelligence
```

1. Clone this repo (its URL is at the top of this README) and install the skills: copy (don't symlink)
   the five folders in `skills/` into your project's `.claude/skills/` (or `~/.claude/skills/` for every project, but not
   both: a copy in `~/.claude/skills/` wins over the project's). In this repo they are already linked
   from `.claude/skills/`, so the slash commands work when you open Claude Code here.
2. Run `/functional-copilot` and say what you want to build: *"I want a copilot for our purchase
   requests."* It offers `/user-map` first if the role or its workspace is new to it, then
   `/agent-context`, so the spec builds on what the agent must see and touch. Both are optional.
3. It interviews you, picks a bounded first workflow and writes a spec on the seven-layer stack below,
   as markdown and as an HTML page with the hard stop at the top. It writes no code until you approve
   the spec.
4. Then it adapts a starter: Open Harvey for a review against a playbook, the headcount copilot for a
   request that goes through approvals. It writes unit tests for your rules and calculations first, runs
   the flow on a real model with your key in `.env.local`, and keeps a short scripted mock for demos and
   tests.
5. Then steps 4 and 5: `/deploy` to host it, `/secure-governance` for prototype or production mode.

## The functional agent stack

Every functional agent stands on seven layers. Five you build once; two you swap for each function.

1. **Products and interfaces:** the copilot lives inside the workspace where the work happens (for
   legal, a document reader and editor), not in a chat box beside it, with cards instead of paragraphs
   and a person's click before every write. *Built with* the CopilotKit React v2 hooks (`useComponent`,
   `useHumanInTheLoop`, `useAgent`), `CopilotChat` only where it fits, and the Channels SDK for Slack
   and Teams.
2. **Domain capabilities** *(swapped)*: the jobs of one function (review, draft, check, route), as tools
   that call tested code. The model picks the tool; the code does the math. *Built with*
   `useFrontendTool`, and `defineTool` in the runtime for server-side tools.
3. **Context and knowledge** *(swapped)*: policies, playbooks, history, and the rules it learns from
   corrections, which a person publishes. *Built with* `useAgentContext` and CopilotKit Intelligence's
   Automatic Learning.
4. **Data and integrations:** systems of record. *Built with* MCP servers and server-side tools in the
   CopilotKit Runtime.
5. **Agent harness:** plans, tools and approvals. *Built with* the CopilotKit Runtime and `BuiltInAgent`
   over AG-UI, or a LangGraph, Mastra, Google ADK or Pydantic AI agent through its AG-UI integration.
6. **Models:** any model you choose; the key stays on the server. *Built with* `BuiltInAgent`'s `model`
   and `maxSteps`.
7. **Security and governance**, around every layer: gates in code, your cloud, SSO, roles, audit and
   logs.

Open Harvey is the legal column (contract review against a playbook); the headcount starter is the HR
one. The skill's [`references/blueprint.md`](skills/functional-copilot/references/blueprint.md) shows
both on each layer.

All company data in this repo is fictional.
