"use client";
import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import type { Diagnosis } from "../../types";
import { MascotAssistant } from "../brand";
import { Button } from "../ui/button";

export function answer(
  question: string,
  page: string,
  findings: Diagnosis[],
  advanced: boolean,
) {
  const q = question.toLowerCase();
  if (/upload|import|csv|json/.test(q))
    return "Open Settings → Data import. Use the example dataset to check field names. Include token counts, timestamps and latency in milliseconds.";
  if (/diagnos|recommend|evidence|improve/.test(q))
    return findings.length
      ? `In ${page}, the current selection has ${findings.length} findings. Example: ${findings[0].evidence}. ${findings[0].action} ${findings[0].steps}`
      : "There are no findings in the current selection. Check Overview filters or start a scenario in Live Token Usage.";
  if (/cache/.test(q))
    return advanced
      ? "Cache reuse is cached input divided by total input. Diagnosis groups matching fingerprints by provider, model and application."
      : "Caching lets a model reuse work from repeated instructions. Check how many input tokens were reused in Overview.";
  if (/latency|slow|speed/.test(q))
    return "Inference latency is the time an AI request took, as reported in the usage record. Live Token Usage measures local diagnosis processing separately.";
  if (/cost|spend|pric/.test(q))
    return "Estimated spend uses the per-million-token rates in Settings. Uncached input, cached input and output use separate rates. Models without a rate are excluded from spend.";
  if (/token/.test(q))
    return advanced
      ? "Total processed tokens are input plus output. Cached input is a subset of input."
      : "Tokens are chunks of text. Input is what you send to the model and output is what it generates.";
  if (/where|navigate|help|tour/.test(q))
    return "Overview summarises usage. Live Token Usage simulates requests. Token Diagnosis shows evidence and Recommendations tracks changes. Restart the guided tour in Settings.";
  return "I don’t have an answer for that in this prototype. Try asking about tokens, costs, caching, latency, diagnoses, uploads or navigation.";
}
export function Assistant({
  page,
  findings,
  advanced,
}: {
  page: string;
  findings: Diagnosis[];
  advanced: boolean;
}) {
  const [open, setOpen] = useState(false),
    [question, setQuestion] = useState(""),
    [reply, setReply] = useState("");
  return (
    <div className="assistant">
      {open && (
        <section className="panel assistant-chat" aria-label="Ask Token Doctor">
          <header>
            <MascotAssistant size={42} />
            <strong>Ask Token Doctor</strong>
            <Button aria-label="Close assistant" onClick={() => setOpen(false)}>
              <X size={16} />
            </Button>
          </header>
          <p aria-live="polite">
            {reply ||
              "Ask me about your usage, a finding, or how to import data."}
          </p>
          <div className="actions">
            {["What are tokens?", "Explain my diagnoses"].map((prompt) => (
              <Button
                key={prompt}
                onClick={() =>
                  setReply(answer(prompt, page, findings, advanced))
                }
              >
                {prompt}
              </Button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) {
                setReply(answer(question, page, findings, advanced));
                setQuestion("");
              }
            }}
          >
            <input
              aria-label="Question"
              placeholder="Ask a question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button variant="primary" aria-label="Send question">
              <Send size={16} />
            </Button>
          </form>
        </section>
      )}
      <Button
        variant="primary"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <MessageCircle size={18} /> Ask Token Doctor
      </Button>
    </div>
  );
}
