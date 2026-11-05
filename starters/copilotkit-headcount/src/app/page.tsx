// Server component: reads the approval history and the written policy from disk, and names the model
// the chat runs on (OpenAI, or the scripted mock when there is no key), then hands off to the client app.

import { connection } from "next/server";
import { HeadcountApp } from "@/components/HeadcountApp";
import { parsePolicyRules } from "@/lib/policy-rules";
import { chatEnabled, modelLabel, readApprovalHistory, readPolicies } from "@/lib/server-data";

export default async function Page() {
  await connection(); // render at request time, so a key added to .env.local shows up after a restart
  return (
    <HeadcountApp
      history={readApprovalHistory()}
      chatEnabled={chatEnabled()}
      model={modelLabel()}
      policyRules={parsePolicyRules(readPolicies())}
    />
  );
}
