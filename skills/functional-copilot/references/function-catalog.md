# Function catalog

Starting points for the interview: for each business function, the workflows copilots usually take on,
the systems of record, where a human must approve, what to render instead of prose, the metrics, the
guardrails, and a recommended first build. Use it to propose options and defaults, then let the user's
answers override it. These are design patterns, not survey findings. The evidence (adoption surveys,
vendor offerings, sources) is in the workshop repo's `research/functional-copilots.md`.

Functions are listed roughly by adoption evidence as of late 2026: customer support and IT first.
Software engineering is left out because coding agents are their own category.

## Contents

1. Customer service and support · 2. IT service management · 3. Marketing · 4. Sales and RevOps ·
5. Accounting operations · 6. Finance and FP&A · 7. Supply chain · 8. HR and People · 9. Legal ·
10. Procurement · 11. Media and post-production · Same shape, different function

## 1. Customer service and support

- **Workflows:** draft reply with cited KB and case history; triage and route; refund, credit or RMA under policy; handoff summary; flag knowledge gaps.
- **Systems:** Zendesk, Salesforce Service Cloud, ServiceNow CSM, Intercom; KB; billing and orders; CRM.
- **Human approves:** refunds or credits above threshold; policy exceptions; outbound replies during rollout; anything legal or safety-related.
- **Render:** case timeline, customer card, draft reply with sources, refund form with policy check.
- **Metrics:** first-contact resolution, handle time, time to first response, CSAT, automated resolution rate paired with reopen rate.
- **Guardrails:** PII redaction; no commitments outside policy; always offer a human; per-agent refund limits.
- **First build:** refund or credit request with a policy check and an approval card above threshold.

## 2. IT service management

- **Workflows:** access and app requests; password and MFA resets; incident triage; runbook troubleshooting; onboarding and offboarding.
- **Systems:** ServiceNow, Jira Service Management, Okta or Entra ID, Intune or Jamf, CMDB.
- **Human approves:** privileged or production access (app owner and manager); license spend; deprovisioning; change-board items.
- **Render:** prefilled access form with entitlement and approver, ticket timeline, group-membership diff.
- **Metrics:** MTTR, self-service resolution, SLA attainment, time to provision.
- **Guardrails:** least privilege; requesters never approve their own access; identity re-verification; audit log to SIEM; never echo secrets.
- **First build:** app access request: resolve the entitlement, route to the owner and manager, and file an approval-ready ticket. Keep provisioning out of v1, or behind its own gate after approval.

## 3. Marketing

- **Workflows:** brief to first drafts; variants and localization; campaign performance Q&A; content refresh; brand and claims check.
- **Systems:** HubSpot, Marketo or Marketing Cloud; CMS; DAM; ad and analytics platforms.
- **Human approves:** anything published; regulated or comparative claims; budget shifts between channels.
- **Render:** side-by-side variants, claims diff with flags, channel performance table, content calendar.
- **Metrics:** content cycle time, cost per asset, pipeline sourced, conversion.
- **Guardrails:** brand and claims rules; copyright and likeness; email consent; no auto-publish.
- **First build:** brief-to-draft with a brand and claims checker, approved before publish.

## 4. Sales and RevOps

- **Workflows:** account research and meeting prep; lead qualification and routing; discount and quote approval (deal desk); CRM updates from calls; pipeline review.
- **Systems:** Salesforce, HubSpot or Dynamics; CPQ; call recording; billing.
- **Human approves:** discounts past the guardrail; non-standard terms; territory changes; bulk outbound.
- **Render:** deal card, discount form with margin impact, pipeline diff, forecast waterfall.
- **Metrics:** discount approval cycle time, win rate, forecast accuracy, CRM completeness.
- **Guardrails:** pricing authority matrix; reps never approve their own discount; revenue-recognition review.
- **First build:** deal-desk discount approval (policy, thresholds, an approval chain: the headcount shape).

## 5. Accounting operations

- **Workflows:** AP invoice intake and three-way-match exceptions; reconciliations; close checklist and variance explanations; expense policy checks; collections and disputes.
- **Systems:** ERP (NetSuite, SAP S/4HANA, Oracle, Dynamics, Workday Financials); AP tools; bank feeds; close tools.
- **Human approves:** payment release; journal entries (preparer is not the approver); write-offs; vendor bank-detail changes.
- **Render:** match table with exceptions highlighted, debit and credit journal preview before posting, variance table, vendor-change diff.
- **Metrics:** days to close, invoice cycle time, touchless rate, exception rate, DSO.
- **Guardrails:** segregation of duties; SOX-grade audit trail; out-of-band verification of bank changes; materiality thresholds; nothing posts without approval.
- **First build:** AP invoice exception (price or quantity mismatch), ending in a journal preview and an approval. It is an exception queue, not a typed request: see "Same shape, different function".

## 6. Finance and FP&A

- **Workflows:** headcount and spend requests; variance commentary; budget and forecast Q&A; scenario comparison; management reporting drafts.
- **Systems:** planning tool (Anaplan, Adaptive, Pigment); GL; HRIS for headcount; BI.
- **Human approves:** out-of-plan spend; reallocations; anything above the delegation-of-authority thresholds.
- **Render:** cost breakdown with annual run-rate and fiscal-year impact side by side, budget-remaining bar, scenario table, approval-chain stepper.
- **Metrics:** request cycle time, send-back rate, budget variance, forecast accuracy.
- **Guardrails:** delegation-of-authority matrix; cost-center data scoping; plan version control; no writes to the plan without approval.
- **First build:** headcount or spend request (the workshop demo), measured on cycle time and send-backs.

Modelling notes for cost: compute employer payroll tax with the Social Security wage cap rather than a
flat rate; model health benefits per person plus a retirement percentage; show equity separately from
cash; agency fees run 20% to 25% of first-year base. A flat-rate model is fine for a demo; say so.

## 7. Supply chain and operations

- **Workflows:** supplier follow-ups (PO confirmations, delays); late-shipment and stock-out exceptions; inventory and demand Q&A; expedite and reroute options; order status.
- **Systems:** ERP or SCM, WMS, TMS, supplier portals, EDI.
- **Human approves:** PO changes; expedite spend; reorder-parameter changes; supplier switches.
- **Render:** exception queue, shipment timeline, PO change diff, options compared by cost and date.
- **Metrics:** OTIF, exception resolution time, expedite cost, inventory turns.
- **Guardrails:** spend limits; no supplier commitments without approval; supplier data confidentiality; trade compliance.
- **First build:** late-shipment exception: chase the supplier, propose costed options, a person chooses. An exception queue: see "Same shape, different function".

## 8. HR and People

- **Workflows:** cited policy and benefits Q&A; leave requests; onboarding checklists; recruiting support (job descriptions, screening summaries, scheduling); headcount requests with Finance.
- **Systems:** HRIS (Workday, SuccessFactors, Oracle HCM, Rippling); ATS (Greenhouse, Ashby, Lever); HR case management; comp bands.
- **Human approves:** any change to employee records or pay; offers; terminations; employee-relations cases; candidate advance or reject decisions.
- **Render:** leave-balance card, offer form checked against the band, org chart, onboarding timeline, policy answer with citation.
- **Metrics:** case resolution time, self-service rate, time to fill, offer acceptance.
- **Guardrails:** sensitive PII (health, pay); managers see only their own team; automated hiring-decision laws such as NYC Local Law 144 bias audits; audit log.
- **First build:** leave request with a cited policy answer, manager approval, then an HRIS write-back behind its own gate.

## 9. Legal

- **Workflows:** NDA and contract first-pass review against a playbook; redlining; legal intake and routing; obligation extraction; policy Q&A.
- **Systems:** CLM (Ironclad, Icertis, DocuSign CLM); document management; e-signature; Word.
- **Human approves:** every redline (a lawyer accepts or rejects); signature authority; playbook deviations; privileged matters.
- **Render:** redline diff with the playbook reason per change, clause risk table, obligations table, intake form.
- **Metrics:** contract cycle time, NDA turnaround, share on standard paper, outside counsel spend.
- **Guardrails:** privilege and confidentiality; verify every citation; no legal advice outside policy; data residency.
- **First build:** inbound NDA review against the playbook: redline diff, a lawyer approves or escalates.

## 10. Procurement

- **Workflows:** purchase intake to PO with policy routing; supplier onboarding with risk and sanctions checks; bid comparison; renewal alerts; spend Q&A.
- **Systems:** Coupa, SAP Ariba, Zip, Oracle Procurement; ERP vendor master.
- **Human approves:** supplier award; POs above threshold; new vendors; contract terms.
- **Render:** intake form with a routing preview, bid table with total cost, supplier risk card, approval stepper.
- **Metrics:** request-to-PO cycle time, spend under management, savings, off-contract spend.
- **Guardrails:** requester, approver and receiver are different people; sanctions screening; conflict-of-interest check; vendor master controls.
- **First build:** purchase intake to a routed request (the headcount shape, applied to spend).

## 11. Media and post-production

The workspace-assist shape: the copilot works inside the editor's own tool, and each change it makes is a
proposal the editor accepts. The artifact is the edit itself, so the "approver" is often the editor, then
a producer or client on review.

- **Workflows:** log and tag footage; find selects for a brief; assemble a rough cut from a script or
  transcript; captions and subtitles; versions for each platform (aspect, length, safe areas); apply notes
  from a review round; check deliverables against the spec.
- **Systems:** the NLE (Premiere Pro, DaVinci Resolve, Final Cut Pro, Avid Media Composer) and its
  project, bins and timeline; review tools (Frame.io); media asset management; transcription; the
  delivery spec.
- **Human approves:** every change to the timeline (a proposal the editor accepts or rejects); the cut a
  producer or client signs off; anything published or delivered.
- **Render:** proposed edits on the timeline, a selects list with thumbnails and timecodes, a notes
  checklist tied to timecodes, a deliverables check.
- **Metrics:** time from footage to first cut, review rounds per deliverable, notes resolved per round,
  deliverables rejected on QC.
- **Guardrails:** never destructive: proposals go on a new track or sequence, and the original media and
  timeline stay untouched; rights and usage limits on footage and music; client material stays private.
- **First build:** apply a review round's notes: read the timecoded notes, propose each change on its own
  track, and the editor accepts or rejects each one. Bounded, frequent, and every change is checkable.

## Same shape, different function

Many first builds share the headcount request's skeleton: **request → gather facts → compute → check
rules → render an editable artifact → gated submit → approval chain → learn from send-backs**. When the
user's workflow has that shape (discount approvals, purchase requests, access requests, refunds),
adapting the starter is mostly swapping data, rules, calculations and labels.

Workflows with a different shape need more thought:
- **Review against a playbook** (NDA, vendor contracts, claims check): the artifact is a review table of
  cited findings plus redlines; the agent proposes a plan the user approves, then works it as a checklist.
  Start from `starters/open-harvey/`, which implements this shape end to end.
- **Exception queues** (late shipments, AP invoice exceptions): a system fills a list; nobody types a
  request. The intake is new work: an event trigger, a store that holds many items rather than one
  draft, and batch actions, each behind a gate that lists every item it touches. Resolving *one* item
  does have the headcount shape: an invoice exception's fix (look up the PO and receipt, compute the
  variance, check the tolerance rules, preview the journal, gated approval) is one request with an
  approval chain. So the per-item resolution reuses the starter's tools, cards and gate; the queue
  around it does not exist in the starter.
- **Q&A with a write at the end** (leave requests): keep the answer cited, gate only the write.
- **Workspace assist** (a video editor's or designer's assistant): the copilot works inside an expert
  tool on what is open, and each change is a proposal the person accepts. Take Open Harvey's patterns (a
  plan the user approves, cited suggestions, edits the agent hears and never undoes) and apply them to the
  tool's own model, such as a timeline instead of a contract. The tool's data model and its integration
  are new work; neither starter has them.

Whatever the shape, name the write after the final approval (HRIS update, posted journal, provisioned
access) and give it its own gate. The starter doesn't do it: approved requests are not written back.

Red flags: the decision is pure judgment with no written rule; a consequential decision about a person
with no human review; data the copilot can't get read access to; or a first version that would act on
its own outside the app.
