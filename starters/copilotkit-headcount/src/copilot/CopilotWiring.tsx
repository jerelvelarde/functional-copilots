// Everything the app registers with the agent, in one place. Each hook is one concept; open the file
// it comes from to see how it works. Renders nothing.

import { useAppContext } from "./useAppContext";
import { useGenerativeUI } from "./useGenerativeUI";
import { useHeadcountTools } from "./useHeadcountTools";
import { useSubmitForApproval } from "./useSubmitForApproval";
import { useSuggestionChips } from "./useSuggestionChips";
import { useWorkRows } from "./useWorkRows";

export function CopilotWiring() {
  useAppContext(); // what the agent knows
  useHeadcountTools(); // what the agent can do
  useGenerativeUI(); // what the agent can show
  useWorkRows(); // how the agent's work reads while it runs
  useSubmitForApproval(); // what only the human can decide
  useSuggestionChips(); // how the user can start
  return null;
}
