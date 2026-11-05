// The copilot panel: CopilotKit's prebuilt chat (CopilotChat), talking to the runtime at
// /api/copilotkit, dressed in the app's own type and palette (app/globals.css, .copilot-surface).
//
// Four slots do the work, all on CopilotChat's own API:
// - messageView.toolCallDisplay "turn": the agent works in the open, then folds its steps into one
//   line that names them once it replies (rows and TurnSummary come from useWorkRows.tsx).
// - messageView.userMessage: an edit made in the Business case shows as an event row, not a bubble
//   (ChatUserMessage.tsx).
// - input: ChatComposer, CopilotKit's composer with the suggestion chips pinned above it (the chips
//   follow the draft: see useSuggestionChips.ts), no attachments menu and no disclaimer line.
// - welcomeScreen: a short intro above that composer.
// The chat always answers: without a key the scripted mock plays the demo (lib/mock-model.ts). An
// error from a run shows above the chat and clears itself after the next run that succeeds.

"use client";

import {
  CopilotChat,
  CopilotChatInput,
  CopilotChatView,
  UseAgentUpdate,
  useAgent,
  useSuggestions,
  type CopilotChatInputProps,
} from "@copilotkit/react-core/v2";
import { CircleAlert } from "lucide-react";
import { useEffect, type ComponentProps } from "react";
import { CURRENT_USER } from "@/lib/headcount";
import { useApprovalCardWaiting } from "./approval-card-state";
import { ChatUserMessage } from "./ChatUserMessage";
import { TurnSummary } from "./useWorkRows";

type Props = { open: boolean; model: string; error: string | null; onDismissError: () => void };

// Slot values live at module scope so the chat's memoised messages do not re-render on every keystroke.
const MESSAGE_VIEW = {
  toolCallDisplay: "turn",
  userMessage: ChatUserMessage,
  workSummary: TurnSummary,
  assistantMessage: { toolbarVisible: false },
} as const;
const NoAddMenu = () => null;
const LABELS = { chatInputPlaceholder: "Describe the hire you need…", welcomeMessageText: `Hi ${CURRENT_USER.name.split(" ")[0]}. Who do you need to hire?` };

export function ChatPanel({ open, model, error, onDismissError }: Props) {
  useClearErrorAfterSuccess(error, onDismissError);
  return (
    <aside
      id="copilot-panel"
      aria-label="Copilot"
      className={`copilot-surface flex-col border-hairline bg-surface max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-12 max-lg:z-30 lg:flex lg:w-[400px] lg:shrink-0 lg:border-l ${
        open ? "flex" : "hidden"
      }`}
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-4">
        <h2 className="font-semibold text-ink">Copilot</h2>
        <span className="text-small text-muted">powered by CopilotKit</span>
        <span className="ml-auto inline-flex h-5 items-center rounded-sm bg-stone px-1.5 text-small text-muted" title="The model the copilot runs on">
          {model.replace(/^[^/]+\//, "")}
        </span>
      </header>
      {error && (
        <div role="alert" className="flex items-start gap-2 border-b border-hairline bg-red-tint px-4 py-2.5 text-small text-red">
          <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" strokeWidth={2.25} />
          <span className="min-w-0 flex-1">
            The copilot hit an error: {error}. Try again; this clears after the next reply.
          </span>
          <button type="button" className="shrink-0 font-medium underline underline-offset-[3px]" onClick={onDismissError}>
            Dismiss
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <CopilotChat className="h-full" labels={LABELS} welcomeScreen={ChatWelcome} messageView={MESSAGE_VIEW} input={ChatComposer} />
      </div>
    </aside>
  );
}

type WelcomeProps = ComponentProps<typeof CopilotChatView.WelcomeScreen>;

/**
 * The composer, with the suggestion chips pinned right above it (CopilotKit would put them at the end
 * of the transcript). A chip sends its sentence exactly as if it were typed. The chips step aside
 * while the copilot works and while its approval card waits for a click.
 */
function ChatComposer(props: CopilotChatInputProps) {
  const { suggestions } = useSuggestions();
  const cardWaiting = useApprovalCardWaiting() !== null;
  const chips = props.isRunning || cardWaiting ? [] : suggestions;
  return (
    <div>
      {chips.length > 0 && (
        <div data-testid="copilot-chips" className="pointer-events-auto mx-auto mb-2 flex max-w-3xl flex-wrap gap-1.5 px-4">
          {chips.map((chip) => (
            <button
              key={chip.title}
              type="button"
              onClick={() => props.onSubmitMessage?.(chip.message)}
              className="max-w-full rounded-[6px] border border-hairline bg-surface px-2.5 py-1.5 text-left text-small font-medium text-ink transition-colors duration-150 hover:border-rule hover:bg-stone"
            >
              {chip.title}
            </button>
          ))}
        </div>
      )}
      <CopilotChatInput {...props} showDisclaimer={false} addMenuButton={NoAddMenu} />
    </div>
  );
}

/** Before the first message: what the copilot does, then the composer (with its chips) at the bottom. */
function ChatWelcome({ input }: WelcomeProps) {
  return (
    <div data-testid="copilot-welcome-screen" className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5">
        <p className="font-semibold text-ink">{LABELS.welcomeMessageText}</p>
        <p className="mt-1.5 text-muted">
          Tell me the role in a sentence. I draft the business case on the left, price it with the cost model, check it against the FY2027 plan and the written
          policy, and route it. You can edit anything, and nothing is submitted until you click.
        </p>
      </div>
      <div className="pb-4">{input}</div>
    </div>
  );
}

/** The error banner goes away by itself once a later run finishes successfully. */
function useClearErrorAfterSuccess(error: string | null, clear: () => void) {
  const { agent } = useAgent({ updates: [UseAgentUpdate.OnRunStatusChanged] });
  useEffect(() => {
    if (!error) return;
    const subscription = agent.subscribe({
      onRunFinishedEvent: ({ outcome }) => {
        if (outcome === "success") clear();
      },
    });
    return () => subscription.unsubscribe();
  }, [agent, error, clear]);
}
