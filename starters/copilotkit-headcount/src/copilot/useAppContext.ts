// Concept: app context. The agent knows who the user is, her team's plan, the request draft she is
// working on, what is waiting for approval, and which skills a person has published.
//
// useAgentContext sends each value with every run. When the app state changes, the next run sees the
// new value: nothing to sync by hand. The entries are built in lib/app-context.ts, which also works
// out the dates (so the model never does) and fences text people typed as quoted data. Static
// knowledge (the written policy) lives in the agent's instructions on the server instead: see
// lib/agent-instructions.ts.

import { useAgentContext } from "@copilotkit/react-core/v2";
import { appContext } from "@/lib/app-context";
import { useAppState } from "@/lib/store";

export function useAppContext() {
  const context = appContext(useAppState());
  useAgentContext(context.user);
  useAgentContext(context.plan);
  useAgentContext(context.draft);
  useAgentContext(context.requests);
  useAgentContext(context.skills);
}
