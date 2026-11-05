# Functional copilots: where they land, what to build first

Research for the CopilotKit workshop "Building Enterprise-Ready Functional Copilots" (Nov 5 2026). Compiled 2026-11-03. Feeds the design skill's reference catalog and two deck slides.

**How to read this**

- Every figure has an inline source and publication date. Survey numbers are self-reported shares of respondents, not measured outcomes.
- **Vendor claim** marks a number from the company selling the product.
- Several primary pages (McKinsey, Gartner, Oracle, Coupa) blocked automated fetching. Figures marked *(excerpt)* were read from the publisher's own page text in search results, not from the full document.
- "No reliable figure found" means just that. Nothing here is estimated unless labelled "my arithmetic".

## Slide-ready findings

1. **Support spends the most on AI and is the least sure it pays.** Service and support leaders put a median 12% of their 2025 budget into AI, the highest of the 10 functions Gartner assessed. Only 24% can show positive financial returns ([Gartner, 2026-07-08](https://www.gartner.com/en/newsroom/press-releases/2026-07-08-gartner-survey-finds-customers-are-three-times-more-likely-to-use-third-party-genai-than-company-provided-chatbots-for-customer-service) *(excerpt)*).
2. **The gap is governance, not models.** Only 21% of companies have a mature governance model for agents ([Deloitte, 2026-01-21](https://www.deloitte.com/us/en/about/press-room/state-of-ai-report-2026.html)). 49% of large US companies have defined high-risk use cases where agents may not decide on their own, and the share building controls into agents fell from 43% to 30% in two quarters ([KPMG Q3 AI Pulse, 2026-09-24](https://kpmg.com/us/en/media/news/q3-ai-pulse-2026.html)). An approval-gated copilot is the pattern that clears this bar.
3. **Agents scale in one place, value shows up in another.** Agents are most often scaled in IT, knowledge management and software engineering. Cost savings are most often reported in supply chain and service operations, and revenue gains in marketing and sales ([McKinsey State of AI 2026, Aug 2026](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai) *(excerpt)*). Similarly, more than half of gen AI budgets go to sales and marketing tools, but MIT NANDA found the biggest ROI in back-office automation ([Fortune on MIT NANDA, 2025-08-18](https://fortune.com/2025/08/18/mit-report-95-percent-generative-ai-pilots-at-companies-failing-cfo/)).

---

## 1. Which functions are adopting, and where the value is

### The evidence

| Source (date, sample) | What it says about functions |
| --- | --- |
| [McKinsey, State of AI 2026](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai) (Aug 2026; n=1,719) *(excerpt)* | Agents most often scaled in **IT, knowledge management, software engineering**. Cost cuts most reported in **supply chain, service operations, manufacturing**; revenue gains in **marketing and sales**. Only 37% report any EBIT impact. |
| [McKinsey, State of AI 2025](https://www.mckinsey.com/~/media/mckinsey/business%20functions/quantumblack/our%20insights/the%20state%20of%20ai/november%202025/the-state-of-ai-in-2025.pdf) (Nov 2025; n=1,993) *(excerpt)* | 23% scaling an agent somewhere; agent use concentrated in **IT (service desk)** and **knowledge management**; no more than 10% scaling agents in any one function. |
| [Gartner](https://www.gartner.com/en/newsroom/press-releases/2026-07-08-gartner-survey-finds-customers-are-three-times-more-likely-to-use-third-party-genai-than-company-provided-chatbots-for-customer-service) (2026-07-08; n=1,303) *(excerpt)* | **Service and support** put a median 12% of 2025 budget into AI, the highest of 10 functions; 24% show positive returns. Service AI spend rose 38% while the budget rose 2% ([Gartner, 2026-08-26](https://www.gartner.com/en/newsroom/press-releases/2026-08-26-gartner-survey-finds-ai-spending-by-customer-service-leaders-has-surged-by-38-percent-despite-overall-service-and-support-function-budgets-rising-by-just-2-percent) *(excerpt)*). |
| [Menlo Ventures](https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/) (2025-12-09; n=495) | $7.3B departmental AI spend: **coding $4.0B (55%)**, IT $700M, marketing $660M, customer success $630M, HR about 5%. Legal is a $650M vertical. |
| [Bain](https://www.bain.com/insights/executive-survey-ai-moves-from-pilots-to-production/) (2025-11-24; n=197) | Use cases scaling: software development 40%, **customer service 32%**, sales, marketing and knowledge work 20% to 33%. |
| [Deloitte](https://www.deloitte.com/us/en/about/press-room/state-of-ai-report-2026.html) (2026-01-21; n=3,235) | **Customer support** is the top expected agentic impact, then supply chain, R&D, knowledge management, cybersecurity ([report page](https://www.deloitte.com/ce/en/issues/generative-ai/state-of-ai-in-enterprise.html) *(excerpt)*). |
| [BCG](https://www.bcg.com/press/30september2025-ai-leaders-outpace-laggards-revenue-growth-cost-savings) (2025-09-30; n=1,250) | 70% of AI's potential value is in **core functions** (sales and marketing, manufacturing, supply chain, pricing, R&D); IT 13%. Agents are 17% of AI value, heading to 29% by 2028. |
| [Microsoft WTI 2025](https://www.microsoft.com/en-us/worklab/work-trend-index/2025-the-year-the-frontier-firm-is-born) (2025-04-23; n=31,000) | Leaders' top AI investment areas: **customer service, marketing, product development**. |
| [KPMG](https://kpmg.com/us/en/media/news/q3-ai-pulse-2026.html) (2026-09-24; n=314) | 62% building, deploying or developing agents. No function breakdown. |

No independent function breakdown was found in the [IBM CEO Study](https://newsroom.ibm.com/2025-05-06-ibm-study-ceos-double-down-on-ai-while-navigating-enterprise-hurdles) (2025-05-06) or the Stanford AI Index 2026, which reuses McKinsey's data ([Bloomberg Law, Apr 2026](https://news.bloomberglaw.com/ip-law/ai-business-boom-includes-performance-woes-stanford-index-shows)).

**Function-specific surveys** (all *(excerpt)*)

- **Finance:** 59% of finance functions use AI, flat on 2024. Top uses: knowledge management 49%, AP automation 37%, anomaly detection 34% ([Gartner, 2025-11-18](https://www.gartner.com/en/newsroom/press-releases/2025-11-18-gartner-survey-shows-finance-ai-adoption-remains-steady-in-2025)).
- **HR:** 39% use AI in HR; recruiting leads at 27% ([SHRM, 2026](https://www.shrm.org/executive-network/insights/state-of-ai-hr-2026-5-critical-insights-chros)).
- **Legal:** 47% of corporate legal departments use gen AI, up from 23% ([Thomson Reuters, 2026](https://legal.thomsonreuters.com/blog/highlights-from-the-2026-ai-in-professional-services-report-and-what-it-means-for-legal-teams-tri/)).
- **Supply chain:** 67% of digital investment goes to AI, but 55% of supply chain chiefs are unclear on the return ([Gartner, 2026-08-05](https://www.gartner.com/en/newsroom/press-releases/2026-08-05-gartner-survey-finds-majority-of-chief-supply-chain-officers-unclear-on-ai-investment-returns)). 47% cut headcount by an average of 10.5% in two years, mainly due to AI ([Gartner, 2026-10-28](https://www.gartner.com/en/newsroom/press-releases/2026-10-28-gartner-survey-shows-47-percent-of-supply-chains-reduced-headcount-by-an-average-of-10-5-percent-over-the-past-two-years-primarily-due-to-the-impact-of-ai)).
- **Procurement:** 63% expect significant gains; only 25% have redesigned roles ([Gartner, 2026-10-08](https://www.gartner.com/en/newsroom/press-releases/2026-10-08-gartner-survey-shows-chief-procurement-officers-stalling-on-needed-ai-role-redesign)).
- **Sales:** 31% of sales chiefs struggle to prove AI tool ROI ([Gartner, 2026-05-19](https://www.gartner.com/en/newsroom/press-releases/2026-05-19-gartner-survey-shows-thirty-one-percent-of-chief-sales-officers-cited-difficulty-proving-roi-of-ai-driven-tools-as-a-top-challenge-for-sales-objectives-in-two-thousand-twenty-si)).
- **Support (causal):** AI assistance raised resolutions per hour 14% on average and 34% for novices across 5,179 agents ([NBER w31161, 2023](https://www.nber.org/papers/w31161)); the published version reports about 15% and 30% ([QJE 2025](https://www.eurekalert.org/news-releases/1071936)).

### Ranking

Cross-function surveys and spend data count most, then function-only surveys, then vendor signal (section 2). Ranks 3 to 10 compare different samples, so read them as tiers.

**Outside the ranking: software engineering.** It leads every spend and scaling measure (55% of departmental spend, 40% of use cases scaling), but coding agents are their own product category and attendees build for business functions.

| # | Function | Evidence | Tier |
| --- | --- | --- | --- |
| 1 | **Customer service and support** | Largest AI budget share (Gartner); 32% scaling (Bain); top expected agent impact (Deloitte); causal gains (NBER). Weak on ROI. | 1 |
| 2 | **IT service management** | Where agents scale most (McKinsey 2025, 2026); $700M spend (Menlo); dense vendor coverage. | 1 |
| 3 | **Marketing** | Revenue gains (McKinsey); top investment area (Microsoft); $660M (Menlo). | 2 |
| 4 | **Sales and Sales Ops / RevOps** | Revenue gains (McKinsey), but "most lagging" per Bain; GA qualification agents. | 2 |
| 5 | **Accounting operations** (AP/AR, reconciliation, close) | AP automation and anomaly detection lead finance's transactional uses (Gartner); back-office ROI (MIT NANDA); most GA vendor agents. | 2 |
| 6 | **Finance / FP&A** (budgets, spend and headcount approvals) | Same Gartner data; knowledge management is the top use; few packaged agents. | 2 |
| 7 | **Supply chain and operations** | Most-reported cost savings (McKinsey); heavy investment, unclear ROI (Gartner). | 3 |
| 8 | **HR / People** | 39% adoption, recruiting first (SHRM); about 5% of spend (Menlo); heavy vendor signal. | 3 |
| 9 | **Legal** | 47% adoption (Thomson Reuters); $650M vertical (Menlo); high-risk outputs. | 3 |
| 10 | **Procurement** | Big expectations, little redesign (Gartner); strong vendor push. | 3 |

**Knowledge management is the on-ramp, not a function.** It is the top finance AI use (49%) and a top agent area for McKinsey. Copilots start as "answer from our policy" and earn value when they handle transactions.

### Where sources disagree

- **Sales.** McKinsey puts marketing and sales first for revenue gains. Bain's commercial survey (n=1,263) calls sales "the function that has lagged most others" and says about a quarter of sales and marketing pilots failed ([Bain, 2025-04-23](https://www.bain.com/insights/parsing-how-winners-use-ai-commercial-excellence-agenda-2025/)). MIT NANDA puts the budget in sales and marketing and the ROI in the back office.
- **Support.** Highest spend, yet only 24% show returns. Gartner predicts half of companies that cut service staff over AI will rehire by 2027 ([Gartner, 2026-02-03](https://www.gartner.com/en/newsroom/press-releases/2026-02-03-gartner-predicts-half-of-companies-that-cut-customer-service-staff-due-to-ai-will-rehire-by-2027)). 87% of customers say gen AI service must offer a human ([Gartner, 2026-08-04](https://www.gartner.com/en/newsroom/press-releases/2026-08-04-gartner-survey-finds-87-percent-of-customers-say-companies-using-genai-for-customer-service-must-provide-access-to-a-human-agent0) *(excerpt)*).
- **"How many have agents?"** From 17% deployed ([Gartner Hype Cycle for Agentic AI, 2026](https://www.gartner.com/en/articles/hype-cycle-for-agentic-ai) *(excerpt)*) to 62% building, deploying or developing (KPMG). Definitions differ, so quote them with the number.
- **Build vs. buy.** MIT NANDA says purchased tools succeed about 67% of the time and internal builds "one-third as often" ([Fortune, 2025-08-18](https://fortune.com/2025/08/18/mit-report-95-percent-generative-ai-pilots-at-companies-failing-cfo/)). The study is gated; treat this with care.
- **Backdrop:** Gartner expects over 40% of agentic AI projects to be cancelled by end of 2027 ([Gartner, 2025-06-25](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027)).

---

## 2. Vendor signal: which function agents the platforms ship

Status and dates come from vendor announcements. Every capability and number in this table is a vendor claim.

| Vendor | Function | Named agent / workflow | Link |
| --- | --- | --- | --- |
| Microsoft Dynamics 365 | Sales | Sales Qualification Agent (GA Oct 2025); Sales Close and Sales Research agents (preview) | [Dynamics blog, 2025-10-21](https://www.microsoft.com/en-us/dynamics-365/blog/business-leader/2025/10/21/from-systems-of-record-to-systems-of-action-dynamics-365-agentic-business-applications-for-the-frontier/) |
| Microsoft Dynamics 365 | Support | Case Management, Customer Intent, Customer Knowledge Management, Quality Evaluation agents (GA Oct 2025) | same |
| Microsoft Dynamics 365 | Accounting, supply chain, project ops | Account Reconciliation, Payables (Business Central), Supplier Communications, Time and Expense, Activity Approvals agents | same |
| Microsoft 365 Copilot | Finance | Finance in M365 Copilot, starting with reconciliation in Excel (GA) | [Dynamics blog, 2025-10-20](https://www.microsoft.com/en-us/dynamics-365/blog/it-professional/2025/10/20/empowering-finance-with-an-ai-assistant-in-microsoft-365-copilot/) |
| Microsoft 365 Copilot | HR and IT | Employee Self-Service Agent (GA Nov 2025), with Workday, SuccessFactors and ServiceNow connectors | [Tech Community](https://techcommunity.microsoft.com/blog/microsoft365copilotblog/announcing-general-availability-of-the-employee-self-service-agent-in-microsoft-/4469413) |
| Salesforce Agentforce | Sales | Agentforce SDR, Sales Coach | [Salesforce news](https://www.salesforce.com/news/stories/einstein-sales-agents-announcement/) |
| Salesforce Agentforce | HR | Agentforce HR Service (May 2025) | [Salesforce news](https://www.salesforce.com/news/stories/agentforce-hr-service-announcement/) |
| Salesforce Agentforce | IT | Agentforce IT Service (Oct 2025) | [Salesforce news](https://www.salesforce.com/news/stories/agentforce-it-service-announcement/) |
| ServiceNow | IT, HR, support, procurement | Prebuilt AI agents for ITSM, HRSD and CSM; voice agents for password resets, PTO and case status; AI Control Tower | [Product page](https://www.servicenow.com/products/ai-agents.html), [newsroom 2024-09-10](https://newsroom.servicenow.com/press-releases/details/2024/ServiceNow-to-unlock-247-productivity-at-massive-scale-with-AI-agents-for-IT-Customer-Service-Procurement-HR-Software-Development-and-more-09-10-2024-traffic/default.aspx) |
| Workday | HR | Recruiting Agent (HiredScore) and Payroll Agent; Case, Performance and Job Architecture agents (announced Sep 2025, available 2026) | [Workday, 2025-09-16](https://newsroom.workday.com/2025-09-16-Workday-Illuminate-TM-Expands-with-New-AI-Agents-for-HR,-Finance,-and-Industry) |
| Workday | Finance, accounting | Expenses Agent; Financial Close, Cost and Profitability, Financial Test agents (2026) | same; [Workday, 2024-09-17](https://newsroom.workday.com/2024-09-17-Workday-Announces-New-AI-Agents-to-Transform-HR-and-Finance-Processes) |
| SAP Joule | Accounting, treasury | Cash Management Agent (GA planned Q1 2026), AR Dispute Resolution Agent | [SAP Joule agents](https://www.sap.com/products/artificial-intelligence/ai-agents.html), [Innovation Guide H2 2025](https://www.sap.com/topics/innovation-guide/h2) |
| SAP Ariba | Procurement | Joule bid comparison (total cost incl. shipping and terms); Sourcing Assistant | [SAP Joule agents](https://www.sap.com/products/artificial-intelligence/ai-agents.html) |
| Oracle Fusion | Accounting | Payables, Ledger, Expenses, Payments agents (GA in Release 26B) | [Oracle Fusion Insider](https://blogs.oracle.com/fusioninsider/agentic-ai-in-erp-four-agents-you-can-use-today) |
| Oracle Fusion | HR, supply chain | Talent Advisor, Manager Concierge; Job Architect Agent (Aug 2026); SCM agentic apps (Jun 2026) | [Oracle, 2025-10-15](https://www.oracle.com/news/announcement/ai-world-oracle-advances-enterprise-ai-with-new-agents-across-fusion-applications-2025-10-15/), [Oracle, 2026-08-11](https://www.oracle.com/news/announcement/oracle-adds-new-fusion-agentic-applications-and-ai-agents-to-help-improve-talent-management-2026-08-11/) |
| Atlassian | IT, support | Jira Service Management virtual service agent; Rovo agents in the help center; request routing | [Atlassian docs](https://support.atlassian.com/jira-service-management-cloud/docs/set-up-your-virtual-agent-in-jira-service-management/) |
| Zendesk | Support | AI agents that "resolve up to 80% of interactions"; outcome-based pricing | [Zendesk AI agents](https://www.zendesk.com/service/ai/ai-agents/) |
| Coupa | Procurement | Navi agents for bid evaluation, request creation, supplier discovery and sourcing-event creation; "450+ customers in production" | [Coupa, Oct 2025](https://www.coupa.com/newsroom/coupa-launches-new-ai-agents-to-accelerate-source-to-pay-roi-featuring-autonomous-sourcing-collaboration-and-orchestration/), [Coupa, Sep 2026](https://www.coupa.com/newsroom/coupas-september-release-accelerates-agentic-spend-capabilities/) |
| Ironclad | Legal | Contract Review Agent (formerly Jurist): playbook redlining that a reviewer accepts or rejects per change; Intake Agent | [Ironclad](https://ironcladapp.com/resources/articles/contract-review-agent-redlining-playbook) |

**What the map says.** Packaged agents cluster in four places:

- support and IT service desks (case triage, password and access, knowledge)
- accounting operations (AP, reconciliation, close, expenses)
- HR service (policy and case Q&A, recruiting)
- sales qualification

FP&A planning and cross-functional approvals are thin. **I found no packaged headcount-request agent** in these announcements; the nearest are Workday's and Oracle's job-architecture agents. A request that spans HRIS, the plan and the budget is the gap a custom copilot fills.

---

## 3. Function profiles

Design guidance distilled from what the vendors above package, not survey findings. "Render" = show a component, not prose. Each first build is bounded, frequent, approval-gated and measurable.

### 1. Customer service and support

| | |
| --- | --- |
| Workflows | Draft reply with cited KB and case history; triage and route by intent; refund, credit or RMA under policy; case summary for handoff; flag knowledge gaps |
| Systems of record | Zendesk, Salesforce Service Cloud, ServiceNow CSM, Intercom; KB; billing and order system; CRM |
| Human approves | Refunds or credits above threshold; policy exceptions; outbound replies during rollout; anything legal or safety |
| Render | Case timeline, customer card, draft reply with sources, refund form with policy check, handoff summary |
| Metrics | First-contact resolution, average handle time, time to first response, CSAT, automated resolution rate paired with reopen rate |
| Guardrails | PII redaction; no commitments outside policy; always offer a human; log every action; per-agent refund limits |
| **First build** | **Refund or credit request with policy check and an approval card above threshold.** Moves handle time and reopen rate. |

### 2. IT service management

| | |
| --- | --- |
| Workflows | Access and app requests; password and MFA reset; incident triage and categorization; runbook troubleshooting; onboarding and offboarding provisioning |
| Systems of record | ServiceNow, Jira Service Management, Okta or Entra ID, Intune or Jamf, CMDB |
| Human approves | Privileged or production access (app owner and manager); license spend; deprovisioning; change-board items |
| Render | Prefilled access form with entitlement and approver, ticket status timeline, before/after group-membership diff |
| Metrics | MTTR, self-service resolution rate, first-contact resolution, SLA attainment, time to provision |
| Guardrails | Least privilege; requester cannot approve own access; identity re-verification for resets; audit log to SIEM; never echo secrets |
| **First build** | **App access request in Slack or Teams:** resolve the entitlement, route to the owner, provision on approval. |

### 3. Marketing

| | |
| --- | --- |
| Workflows | Brief to first drafts; variants and localization; campaign performance Q&A; content refresh; brand and claims check |
| Systems of record | HubSpot, Marketo or Salesforce Marketing Cloud; CMS; DAM; ad and analytics platforms; CRM |
| Human approves | Anything published; regulated or comparative claims (legal); budget shifts between channels |
| Render | Side-by-side variants, claims diff with flags, channel performance table, content calendar |
| Metrics | Content cycle time, cost per asset, pipeline sourced, conversion rate |
| Guardrails | Brand and claims rules; copyright and likeness; consent rules for email; no auto-publish |
| **First build** | **Brief-to-draft with a brand and claims checker,** approved before publish. |

### 4. Sales and Sales Ops / RevOps

| | |
| --- | --- |
| Workflows | Account research and meeting prep; lead qualification and routing; discount and quote approval (deal desk); CRM updates from calls; pipeline review |
| Systems of record | Salesforce, HubSpot or Dynamics; CPQ; call recording; billing |
| Human approves | Discounts past the guardrail (deal desk, finance); non-standard terms (legal); territory changes; bulk outbound |
| Render | Deal card, discount form with margin impact, week-over-week pipeline diff, forecast waterfall |
| Metrics | Discount approval cycle time, win rate, forecast accuracy, CRM completeness |
| Guardrails | Pricing authority matrix; rep cannot approve own discount; revenue-recognition review of non-standard terms |
| **First build** | **Deal-desk discount approval:** the headcount demo's shape (policy, thresholds, approval chain). |

### 5. Accounting operations

| | |
| --- | --- |
| Workflows | AP invoice intake and 3-way match exceptions; account reconciliation; close checklist and variance explanations; expense policy checks; AR collections and disputes |
| Systems of record | ERP (NetSuite, SAP S/4HANA, Oracle, Dynamics, Workday Financials); AP tools; bank feeds; close tools |
| Human approves | Payment release; journal entries (preparer is not approver); write-offs; vendor bank-detail changes |
| Render | Match table with exceptions highlighted, debit/credit journal preview before posting, variance table with explanations, vendor-change diff, close checklist |
| Metrics | Days to close, invoice cycle time, touchless rate, exception rate, DSO |
| Guardrails | Segregation of duties; SOX-grade audit trail; out-of-band verification of vendor bank changes; materiality thresholds; nothing posts without approval |
| **First build** | **AP invoice exception resolution** (price or quantity mismatch), ending in a journal preview and approval. |

### 6. Finance / FP&A

| | |
| --- | --- |
| Workflows | Headcount and spend requests; variance commentary; budget and forecast Q&A; scenario comparison; management reporting drafts |
| Systems of record | Planning tool (Anaplan, Adaptive, Pigment); GL; HRIS for headcount; BI |
| Human approves | Out-of-plan spend; budget reallocations; CFO thresholds per the delegation-of-authority matrix |
| Render | Cost breakdown (annual run-rate and FY impact side by side), budget-remaining bar, scenario table, approval-chain stepper |
| Metrics | Request cycle time, send-back rate, budget variance, forecast accuracy |
| Guardrails | Delegation-of-authority matrix; cost-center data scoping; plan version control; no writes to the plan without approval |
| **First build** | **Headcount or spend request** (the workshop demo), measured on cycle time and send-backs. |

### 7. Supply chain and operations

| | |
| --- | --- |
| Workflows | Supplier follow-ups (PO confirmations, delays); exception handling for late shipments and stockouts; inventory and demand Q&A; expedite and reroute options; order status |
| Systems of record | ERP or SCM, WMS, TMS, supplier portals, EDI |
| Human approves | PO changes; expedite spend; reorder-parameter changes; supplier switches |
| Render | Exception queue table, shipment timeline, PO change diff, option-by-cost comparison |
| Metrics | OTIF, exception resolution time, expedite cost, inventory turns |
| Guardrails | Spend limits; never commit to a supplier without approval; supplier data confidentiality; trade compliance |
| **First build** | **Late-shipment exception:** chase the supplier, propose costed options, a human chooses. |

### 8. HR / People

| | |
| --- | --- |
| Workflows | Cited policy and benefits Q&A; leave requests; onboarding checklists; recruiting support (job descriptions, screening summaries, scheduling); headcount requests with Finance |
| Systems of record | HRIS (Workday, SuccessFactors, Oracle HCM, Rippling); ATS (Greenhouse, Ashby, Lever); HR case management; comp bands |
| Human approves | Any change to employee records or pay; offers; terminations; employee-relations cases; candidate advance or reject decisions |
| Render | Leave-balance card, offer form checked against the band, org chart, onboarding timeline, policy answer with citation |
| Metrics | HR case resolution time, self-service rate, time to fill, offer acceptance rate |
| Guardrails | Sensitive PII (health, pay); manager sees only their own team; hiring-tool rules such as NYC Local Law 144 bias audits ([NYC DCWP](https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page)); audit log |
| **First build** | **Policy Q&A plus leave request** with manager approval and HRIS write-back. |

### 9. Legal

| | |
| --- | --- |
| Workflows | NDA and contract first-pass review against a playbook; redlining; legal intake and routing; obligation extraction; policy Q&A |
| Systems of record | CLM (Ironclad, Icertis, DocuSign CLM); document management; e-signature; Word |
| Human approves | Every redline (a lawyer accepts or rejects); signature authority; playbook deviations; privileged matters |
| Render | Redline diff with the playbook reason per change, clause risk table, obligations table, intake form |
| Metrics | Contract cycle time, NDA turnaround, share of contracts on standard paper, outside counsel spend |
| Guardrails | Privilege and confidentiality; verify every citation; no legal advice outside policy; data residency |
| **First build** | **Inbound NDA review against the playbook:** redline diff, lawyer approves or escalates. |

### 10. Procurement

| | |
| --- | --- |
| Workflows | Purchase intake to PO with policy routing; supplier onboarding with risk and sanctions checks; bid comparison; renewal alerts; spend Q&A |
| Systems of record | Coupa, SAP Ariba, Zip, Oracle Procurement; ERP vendor master |
| Human approves | Supplier award; POs above threshold; new vendors; contract terms |
| Render | Intake form with routing preview, bid table with total cost, supplier risk card, approval stepper |
| Metrics | Request-to-PO cycle time, spend under management, savings, off-contract spend share |
| Guardrails | Requester, approver and receiver must be different people; sanctions screening; conflict-of-interest check; vendor master controls |
| **First build** | **Purchase intake to routed request** (the headcount shape, applied to spend). |

---

## 4. Headcount request sanity check (Northstar dataset)

### Approval chain

No authoritative benchmark exists; workflow-vendor guides agree on this shape for a net-new request at a mid-size tech company:

**Hiring manager → department head/VP (need, plan fit) → Finance BP or FP&A (budget) → HRBP or comp (level, band) → CFO or delegate if out of plan or over a cost threshold → recruiting opens the req.**

Sources: Fitgap routes out-of-plan and net-new requests to finance and the budget owner, with a CFO delegate above a threshold ([Fitgap](https://us.fitgap.com/stack-guides/align-staffing-plans-to-budget-cycles-without-freezing-execution)). A Yeeflow template has HRBP check the plan, finance the budget, and an exec approve above a limit ([Yeeflow](https://www.yeeflow.com/templates/forms/Recruitment-Approval)). ChartHop's example is VP People → CFO → CEO ([ChartHop, 2023-05-02](https://www.charthop.com/resource/approval-workflows-for-headcount-planning)). ATSs separate approval to open a job from a second offer approval ([Greenhouse](https://support.greenhouse.io/hc/en-us/articles/360025756071)).

**Verdict: Northstar's chain is realistic.** It runs department head → Finance BP, with the CFO added above $350K, for L7, or out of plan; backfills go to the Finance BP only. Adjustments:

- **Add the HRBP (Sam Okafor) as a consulted level and band check.** Every template includes HR, and Sam is in `company.json` but not in the policy.
- **Note that above-midpoint pay is often settled at offer approval.** Keeping it at request time is fine for the live-edit beat.
- **$350K CFO threshold:** no reliable benchmark found. Plausible; these limits are company-specific.

### Cost model

| Component | Northstar | What the data says | Verdict |
| --- | --- | --- | --- |
| **Benefits, 18% of base** | $38,160 at L5 mid | Employers pay about **$20,832** for family health cover and **$8,132** for single ([KFF 2026, 2026-10-22](https://www.kff.org/health-costs/2026-employer-health-benefits-survey/): premiums $28,303 / $9,804 minus worker share $7,471 / $1,672; my arithmetic). Insurance plus retirement is 16.1% of wages for professional jobs ([BLS ECEC Table 4, June 2026, released 2026-09-09](https://www.bls.gov/news.release/ecec.t04.htm); my arithmetic). Bottom-up at $212K: family health plus 5.4% retirement ≈ **$32K (15%)**; single ≈ **$20K (9%)**. | **Realistic, slightly generous**; defensible as a planning rate that includes perks. Health is a per-person cost, so 18% overstates L7 ($55,800 vs. ~$37.6K) and understates L3 with family cover. |
| **Employer taxes, 8% of base** | $16,960 | 2027 Social Security: 6.2% up to **$192,300**, max $11,922.60 ([SSA, 2026-10-14](https://www.ssa.gov/blog/en/posts/2026-10-14.html)). Medicare 1.45%, uncapped. FUTA net 0.6% on $7,000 = $42 ([IRS](https://www.irs.gov/taxtopics/tc759)). NY UI 2026: 4.1% on $17,600 ≈ $722 ([NY DOL](https://dol.ny.gov/unemployment-insurance-rate-information)). **L5 NY bottom-up** on $243,800 cash = **$16,221 (7.7%)**, or **$16,874 (8.0%)** with Medicare on $45K RSUs. Large NYC payrolls add 0.60% to 0.895% MCTMT ([NY Tax](https://www.tax.ny.gov/bus/mctmt/emp.htm)). | **Accurate for the L5 demo.** Because of the Social Security cap, a flat 8% overstates L7 (~6%) and understates L3 (~9% to 10%) (my arithmetic). |
| **Bonus 10% to 20%** | $31,800 at L5 | No authoritative benchmark by level found. Levels.fyi shows little or no engineer bonus at some mid-size private companies *(excerpt)*. | **Plausible** for a public-company-style plan; the most company-specific number. |
| **Equity $45K/yr at L5** | L5 NY total comp $288,800 | US senior SWE median total comp **$255,000** ([Levels.fyi, 2026-11-03](https://www.levels.fyi/t/software-engineer/levels/senior/locations/united-states)); L5 at [Carta](https://www.levels.fyi/companies/carta/salaries/software-engineer) $329,273, at [Google](https://www.levels.fyi/companies/google/salaries/software-engineer) $417,530. | **Realistic** for a mid-size NYC company. |
| **Internal recruiting $15,000** | one-time | SHRM 2026 median *executive* cost per hire is $15,000 ([SHRM](https://www.shrm.org/topics-tools/research/recruiting-benchmarking/full-data-brief) *(excerpt)*). No engineering-specific figure found. | **High vs. SHRM,** plausible if recruiter time is loaded in. |
| **Agency 20% of base** | one-time | Typically 20% to 25% of first-year base; 25% to 30% for senior roles ([Underdog, 2026](https://underdog.io/blog/recruitment-agency-costs), vendor). | **Realistic, low end.** |
| **Equipment $4,000** | one-time | No reliable figure found. | Plausible, unsourced. |
| **Multiplier** | 1.26x before bonus and equity; 1.62x all-in | Rule of thumb: 1.25x to 1.4x for salary, taxes and benefits ([Hadzima, MIT Sloan](https://dspace.mit.edu/bitstream/handle/1721.1/103557/15-975-january-iap-2005/contents/study-materials/art8.pdf) *(excerpt)*). | **In range.** |

**Overall verdict: keep the numbers. They are realistic, and the demo math survives the stricter method.** If the tax line used the capped bottom-up method instead of a flat 8%, the L5 midpoint becomes **$343,181**, still under $350K. The $225K live edit becomes **$360,688**, still over, so the CFO still joins (my arithmetic, cash wages only).

Changes I would make in the skill's reference catalog (not the demo):

1. Compute taxes with the Social Security cap.
2. Model benefits as a per-person health cost plus a retirement percentage.
3. Use 20% to 25% for agency fees.
4. Show equity (non-cash stock-based comp) separately from cash cost, the same way Priya asks for FY impact and run-rate separately in `approval-history.jsonl` (a recommendation, not a sourced practice).

---

## 5. How to pick your first functional copilot (5-minute checklist)

Score one point per "yes". **Build at 6 or more out of 8.** At 5 or fewer, narrow the workflow. (The threshold is a heuristic, not a benchmark.)

1. **Frequent.** It happens every week on your team, so it can be measured within a month.
2. **Bounded.** One request type and one decision; the inputs fit on a single form.
3. **Written rules exist.** There is a policy, playbook or matrix the copilot can cite by ID, like `POL-HC-02`. If the rules live only in someone's head, write them down first.
4. **Readable system of record.** You can get API or MCP read access to the data the decision needs: HRIS, ERP, CRM, ticketing.
5. **A named human approves.** The copilot prepares, a person decides, and the approval chain is known. This is what clears the governance gap (21% have mature agent governance per Deloitte; 49% wall off high-risk decisions per KPMG).
6. **Small blast radius.** Writes happen only after approval and can be reversed. No money moves and no record changes without a human.
7. **A baseline metric today.** Cycle time, send-back rate, first-contact resolution, days to close. If you cannot measure it now, you cannot prove the copilot helped.
8. **It lives where the work happens and leaves a feedback trail.** It runs in Slack, Teams or the app people already use, and its send-backs and corrections can become new rules, like Northstar's security-justification pattern.

**Red flags:** the decision is pure judgment with no written rule; it is a consequential decision about a person with no human review (hiring tools may fall under audit laws); the data needs access you cannot get; or the first version would act on its own outside the app.

---

## Not verified / gaps

- **Read from excerpts, not full documents:**
  - McKinsey's per-function exhibit percentages: the PDF could not be fetched, so only the ordering of functions is used.
  - Gartner releases (fetching returned 403).
  - Deloitte's function ranking, which comes from one Deloitte regional page.
  - Hadzima's 1.25x to 1.4x rule: the MIT-hosted PDF returned 404 when fetched; the quote was seen in a search excerpt of that file.
- **No reliable public benchmark found:**
  - target bonus by level
  - equipment cost per hire
  - CFO approval thresholds for headcount
  - internal cost per hire for engineers
- **Secondary or vendor-sourced:**
  - MIT NANDA figures come only from press coverage; the report is gated.
  - BCG's per-function value split (R&D 15% and so on) appears only in secondary sources and is excluded.
- **Not yet published:** NY unemployment insurance base and rate for 2027.
- **Release status changes often:** Workday's Sep 2025 agents ship "in 2026", and the SAP Cash Management Agent had a planned Q1 2026 GA that I did not confirm.

## Sources

1. McKinsey, *The state of AI in 2026: On the road to ROI*, Aug 2026. https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai (PDF: https://www.mckinsey.com/~/media/mckinsey/business%20functions/quantumblack/our%20insights/the%20state%20of%20ai/the-state-of-ai-in-2026-on-the-road-to-roi.pdf)
2. McKinsey, *The state of AI in 2025: Agents, innovation, and transformation*, Nov 2025. https://www.mckinsey.com/~/media/mckinsey/business%20functions/quantumblack/our%20insights/the%20state%20of%20ai/november%202025/the-state-of-ai-in-2025.pdf
3. Gartner, functional leaders and customer service survey, 2026-07-08. https://www.gartner.com/en/newsroom/press-releases/2026-07-08-gartner-survey-finds-customers-are-three-times-more-likely-to-use-third-party-genai-than-company-provided-chatbots-for-customer-service
4. Gartner, customer service AI spending up 38%, 2026-08-26. https://www.gartner.com/en/newsroom/press-releases/2026-08-26-gartner-survey-finds-ai-spending-by-customer-service-leaders-has-surged-by-38-percent-despite-overall-service-and-support-function-budgets-rising-by-just-2-percent
5. Gartner, 87% of customers want access to a human, 2026-08-04. https://www.gartner.com/en/newsroom/press-releases/2026-08-04-gartner-survey-finds-87-percent-of-customers-say-companies-using-genai-for-customer-service-must-provide-access-to-a-human-agent0
6. Gartner, half of companies that cut service staff will rehire, 2026-02-03. https://www.gartner.com/en/newsroom/press-releases/2026-02-03-gartner-predicts-half-of-companies-that-cut-customer-service-staff-due-to-ai-will-rehire-by-2027
7. Gartner, finance AI adoption steady in 2025, 2025-11-18. https://www.gartner.com/en/newsroom/press-releases/2025-11-18-gartner-survey-shows-finance-ai-adoption-remains-steady-in-2025
8. Gartner, 40% of agentic AI projects canceled by 2027, 2025-06-25. https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027
9. Gartner, Hype Cycle for Agentic AI, 2026. https://www.gartner.com/en/articles/hype-cycle-for-agentic-ai
10. Gartner, CPO survey, 2026-10-08. https://www.gartner.com/en/newsroom/press-releases/2026-10-08-gartner-survey-shows-chief-procurement-officers-stalling-on-needed-ai-role-redesign
11. Gartner, chief supply chain officers unclear on AI returns, 2026-08-05. https://www.gartner.com/en/newsroom/press-releases/2026-08-05-gartner-survey-finds-majority-of-chief-supply-chain-officers-unclear-on-ai-investment-returns
12. Gartner, supply chain headcount reduced 10.5%, 2026-10-28. https://www.gartner.com/en/newsroom/press-releases/2026-10-28-gartner-survey-shows-47-percent-of-supply-chains-reduced-headcount-by-an-average-of-10-5-percent-over-the-past-two-years-primarily-due-to-the-impact-of-ai
13. Gartner, CSO survey on AI ROI, 2026-05-19. https://www.gartner.com/en/newsroom/press-releases/2026-05-19-gartner-survey-shows-thirty-one-percent-of-chief-sales-officers-cited-difficulty-proving-roi-of-ai-driven-tools-as-a-top-challenge-for-sales-objectives-in-two-thousand-twenty-si
14. Menlo Ventures, *2025: The State of Generative AI in the Enterprise*, 2025-12-09. https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/
15. Bain, *Executive Survey: AI Moves from Pilots to Production*, 2025-11-24. https://www.bain.com/insights/executive-survey-ai-moves-from-pilots-to-production/
16. Bain, *Parsing How Winners Use AI* (Commercial Excellence Agenda 2025), 2025-04-23. https://www.bain.com/insights/parsing-how-winners-use-ai-commercial-excellence-agenda-2025/
17. Deloitte, *State of AI in the Enterprise 2026* press release, 2026-01-21. https://www.deloitte.com/us/en/about/press-room/state-of-ai-report-2026.html; report page: https://www.deloitte.com/ce/en/issues/generative-ai/state-of-ai-in-enterprise.html
18. BCG, *The Widening AI Value Gap*, 2025-09-30. https://www.bcg.com/press/30september2025-ai-leaders-outpace-laggards-revenue-growth-cost-savings
19. Microsoft, *2025 Work Trend Index*, 2025-04-23. https://www.microsoft.com/en-us/worklab/work-trend-index/2025-the-year-the-frontier-firm-is-born
20. KPMG, *Q3 2026 AI Quarterly Pulse*, 2026-09-24. https://kpmg.com/us/en/media/news/q3-ai-pulse-2026.html
21. IBM, *2025 CEO Study*, 2025-05-06. https://newsroom.ibm.com/2025-05-06-ibm-study-ceos-double-down-on-ai-while-navigating-enterprise-hurdles
22. Fortune on MIT NANDA *The GenAI Divide*, 2025-08-18. https://fortune.com/2025/08/18/mit-report-95-percent-generative-ai-pilots-at-companies-failing-cfo/
23. Brynjolfsson, Li, Raymond, *Generative AI at Work*, NBER w31161 (2023). https://www.nber.org/papers/w31161; QJE 2025 release: https://www.eurekalert.org/news-releases/1071936
24. SHRM, *State of AI in HR 2026*. https://www.shrm.org/executive-network/insights/state-of-ai-hr-2026-5-critical-insights-chros
25. Thomson Reuters, *2026 AI in Professional Services Report*, legal highlights. https://legal.thomsonreuters.com/blog/highlights-from-the-2026-ai-in-professional-services-report-and-what-it-means-for-legal-teams-tri/
26. Bloomberg Law on the Stanford AI Index 2026, Apr 2026. https://news.bloomberglaw.com/ip-law/ai-business-boom-includes-performance-woes-stanford-index-shows
27. Vendor pages: see the links in the section 2 table (Microsoft, Salesforce, ServiceNow, Workday, SAP, Oracle, Atlassian, Zendesk, Coupa, Ironclad).
28. NYC DCWP, Automated Employment Decision Tools (Local Law 144). https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page
29. Headcount approval guides:
    - Fitgap: https://us.fitgap.com/stack-guides/align-staffing-plans-to-budget-cycles-without-freezing-execution
    - Yeeflow: https://www.yeeflow.com/templates/forms/Recruitment-Approval
    - ChartHop, 2023-05-02: https://www.charthop.com/resource/approval-workflows-for-headcount-planning
    - Greenhouse: https://support.greenhouse.io/hc/en-us/articles/360025756071
30. KFF, *2026 Employer Health Benefits Survey*, 2026-10-22. https://www.kff.org/health-costs/2026-employer-health-benefits-survey/
31. BLS, *Employer Costs for Employee Compensation*, Table 4, June 2026 data (released 2026-09-09). https://www.bls.gov/news.release/ecec.t04.htm
32. SSA, 2027 COLA and wage base, 2026-10-14. https://www.ssa.gov/blog/en/posts/2026-10-14.html
33. IRS, Topic 759 (FUTA). https://www.irs.gov/taxtopics/tc759
34. NY DOL, unemployment insurance rate information. https://dol.ny.gov/unemployment-insurance-rate-information
35. NY Tax, MCTMT for employers. https://www.tax.ny.gov/bus/mctmt/emp.htm
36. Levels.fyi pages (updated 2026-11-03/04):
    - US senior SWE: https://www.levels.fyi/t/software-engineer/levels/senior/locations/united-states
    - Carta: https://www.levels.fyi/companies/carta/salaries/software-engineer
    - Google: https://www.levels.fyi/companies/google/salaries/software-engineer
37. SHRM, recruiting benchmarking data brief, 2026. https://www.shrm.org/topics-tools/research/recruiting-benchmarking/full-data-brief
38. Underdog, *Recruitment Agency Costs*, 2026 (vendor). https://underdog.io/blog/recruitment-agency-costs
39. Hadzima, *How Much Does An Employee Cost?* (MIT Sloan course material). https://dspace.mit.edu/bitstream/handle/1721.1/103557/15-975-january-iap-2005/contents/study-materials/art8.pdf
