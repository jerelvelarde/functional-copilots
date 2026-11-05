// Concept: connect the app and the agent. CopilotKitProvider points the React app at the runtime
// (app/api/copilotkit). Everything rendered inside it can give the agent context, tools and UI:
// CopilotWiring registers all of it. The app itself stays an ordinary React app: the work column on
// the left, the copilot panel on the right (behind a toggle on a narrow screen).

"use client";

import { CopilotKitProvider } from "@copilotkit/react-core/v2";
import { MessageSquare, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatPanel } from "@/copilot/ChatPanel";
import { CopilotWiring } from "@/copilot/CopilotWiring";
import { useTellCopilot } from "@/copilot/useTellCopilot";
import { ApprovalsInbox } from "@/components/panels/ApprovalsInbox";
import { BusinessCase } from "@/components/panels/BusinessCase";
import { Insights, pendingReviews } from "@/components/panels/Insights";
import { TeamPlan } from "@/components/panels/TeamPlan";
import { ResetBoundary } from "@/components/ResetBoundary";
import { Button } from "@/components/ui/Card";
import { PolicyRulesProvider } from "@/components/ui/PolicyList";
import { CURRENT_USER } from "@/lib/headcount";
import type { Decision } from "@/lib/learning";
import type { PolicyRule } from "@/lib/policy-rules";
import { appStore, resetDemo, useAppState } from "@/lib/store";

type Props = { history: Decision[]; chatEnabled: boolean; model: string; policyRules: Record<string, PolicyRule> };

export function HeadcountApp({ history, chatEnabled, model, policyRules }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false); // narrow screens only; on desktop the panel is always there

  useEffect(() => {
    appStore.hydrate(); // localStorage is browser-only, so load the saved demo after the first render
    setHydrated(true);
  }, []);

  const onError = useCallback(({ error }: { error: Error }) => setChatError(error.message), []);
  const dismissError = useCallback(() => setChatError(null), []);

  return (
    // enableInspector: set to true to watch the AG-UI event stream in a floating panel while you demo.
    <CopilotKitProvider runtimeUrl="/api/copilotkit" onError={onError} enableInspector={false}>
      <PolicyRulesProvider value={policyRules}>
        <CopilotWiring />
        <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
          <TopBar copilotOpen={copilotOpen} onToggleCopilot={() => setCopilotOpen((open) => !open)} />
          <div className="relative flex min-h-0 flex-1">
            {hydrated ? (
              <ResetBoundary className="min-h-0 flex-1 overflow-y-auto p-6">
                <Workspace history={history} chatEnabled={chatEnabled} />
              </ResetBoundary>
            ) : (
              <div className="flex-1" />
            )}
            {/* The chat's cards read the same store: if one throws, Reset demo stays on screen here too. */}
            <ResetBoundary className="hidden w-[400px] shrink-0 border-l border-hairline bg-surface p-4 lg:block">
              <ChatPanel open={copilotOpen} model={model} error={chatError} onDismissError={dismissError} />
            </ResetBoundary>
          </div>
        </div>
      </PolicyRulesProvider>
    </CopilotKitProvider>
  );
}

function NorthstarMark() {
  return (
    <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden className="shrink-0">
      <path d="M0-8 1.6-1.6 8 0 1.6 1.6 0 8-1.6 1.6-8 0-1.6-1.6Z" fill="currentColor" />
    </svg>
  );
}

function TopBar({ copilotOpen, onToggleCopilot }: { copilotOpen: boolean; onToggleCopilot: () => void }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 bg-green px-4 text-on-green lg:px-6">
      <NorthstarMark />
      <span className="whitespace-nowrap font-semibold">Northstar People</span>
      <span aria-hidden className="opacity-60 max-sm:hidden">
        ·
      </span>
      <span className="max-sm:hidden">Headcount</span>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden truncate md:inline">
          <span className="font-medium">{CURRENT_USER.name}</span>
          <span className="opacity-75"> · {CURRENT_USER.title}</span>
        </span>
        <Button variant="on-green" size="sm" className="lg:hidden" aria-pressed={copilotOpen} aria-controls="copilot-panel" onClick={onToggleCopilot}>
          {copilotOpen ? <X aria-hidden className="size-3.5" /> : <MessageSquare aria-hidden className="size-3.5" />}
          {copilotOpen ? "Close" : "Copilot"}
        </Button>
        <Button
          variant="on-green"
          size="sm"
          onClick={() => {
            if (window.confirm("Reset the demo? This clears the draft, approvals and published skills.")) resetDemo();
          }}
        >
          Reset demo
        </Button>
      </div>
    </header>
  );
}

type Tab = "case" | "approvals" | "insights";

function Workspace({ history, chatEnabled }: { history: Decision[]; chatEnabled: boolean }) {
  const state = useAppState();
  const tellCopilot = useTellCopilot(chatEnabled);
  const [tab, setTab] = useState<Tab>("case");

  // Follow the work: a new draft opens the Business case, a new submission opens the inbox.
  const draftId = state.draft?.id ?? null;
  const submitted = state.requests.length;
  const seen = useRef({ draftId, submitted });
  useEffect(() => {
    if (draftId && draftId !== seen.current.draftId) setTab("case");
    if (submitted > seen.current.submitted) setTab("approvals");
    seen.current = { draftId, submitted };
  }, [draftId, submitted]);

  // A new tab starts at its top, wherever the last one was scrolled to.
  const column = useRef<HTMLElement>(null);
  useEffect(() => {
    column.current?.scrollTo({ top: 0 });
  }, [tab]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "case", label: "Business case", count: 0 },
    { id: "approvals", label: "Approvals", count: state.requests.filter((r) => r.status === "pending").length },
    { id: "insights", label: "Insights", count: pendingReviews(state, history) },
  ];

  return (
    <main ref={column} className="@container min-h-0 min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1180px] px-4 pb-12 @3xl:px-6">
        <TeamPlan />
        <div
          role="tablist"
          aria-label="Workspace"
          className="-mx-4 flex gap-6 overflow-x-auto border-b border-hairline px-4 @3xl:mx-0 @3xl:px-0"
          onKeyDown={(e) => {
            // Arrow keys move between tabs, as in any tab list
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            const index = tabs.findIndex((t) => t.id === tab);
            const next = tabs[(index + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length].id;
            setTab(next);
            document.getElementById(`tab-${next}`)?.focus();
          }}
        >
          {tabs.map(({ id, label, count }) => (
            <button
              key={id}
              id={`tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              className={`-mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 font-medium transition-colors ${
                tab === id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {label}
              {count > 0 && (
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-sm bg-stone px-1 text-small font-semibold text-ink">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-3">
          {tab === "case" && <BusinessCase onHumanEdit={tellCopilot} history={history} />}
          {tab === "approvals" && <ApprovalsInbox />}
          {tab === "insights" && <Insights history={history} />}
        </div>
      </div>
    </main>
  );
}
