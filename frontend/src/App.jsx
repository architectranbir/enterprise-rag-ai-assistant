import React, { useEffect, useRef, useState } from "react";
import { Send, FileText, Sparkles } from "lucide-react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi, I can help you understand engineering standards and approved practices.",
      citations: []
    }
  ]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSources, setActiveSources] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function askQuestion() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed, citations: [] }]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed })
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer || "No response received.",
          citations: data.citations || []
        }
      ]);

      setActiveSources(data.citations || []);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Unable to connect to the backend API.",
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  }

  return (
    <div className="appShell">
      <main className="mainPanel">
        <header className="header">
          <div className="badge">
            <Sparkles size={15} />
            Enterprise RAG Assistant
          </div>
          <h1>Enterprise Engineering AI Assistant</h1>
          <p>Ask questions about engineering standards, GitHub controls, CI/CD, IaC, and governance.</p>
        </header>

        <section className="chatCard">
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`messageRow ${m.role}`}>
                <div className="avatar">{m.role === "assistant" ? "AI" : "You"}</div>
                <div className="messageBlock">
                  <div className="bubble">{m.text}</div>

                  {m.role === "assistant" && m.citations?.length > 0 && (
                    <div className="citationChips">
                      {m.citations.map((c, idx) => (
                        <button
                          key={idx}
                          className="citationChip"
                          onClick={() => setActiveSources(m.citations)}
                        >
                          <FileText size={13} />
                          {c.document || "Source"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="messageRow assistant">
                <div className="avatar">AI</div>
                <div className="bubble muted">Thinking...</div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="composer">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about engineering standards..."
            />
            <button onClick={askQuestion} disabled={loading || !question.trim()}>
              <Send size={20} />
            </button>
          </div>
        </section>

        <div className="hint">Press Enter to send · Shift + Enter for a new line</div>
      </main>

      <aside className="sourcesPanel">
        <div className="sourcesHeader">
          <FileText size={18} />
          <h2>Sources</h2>
        </div>

        {activeSources.length === 0 ? (
          <p className="emptySource">Sources will appear here after a grounded answer.</p>
        ) : (
          <div className="sourceList">
            {activeSources.map((s, i) => (
              <div className="sourceCard" key={i}>
                <div className="sourceNumber">Source {i + 1}</div>
                <div className="sourceTitle">{s.document || "Unknown Document"}</div>
                <div className="sourceMeta">Section: {s.section || "Engineering Standards"}</div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
