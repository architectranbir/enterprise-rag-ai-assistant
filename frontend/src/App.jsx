import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Send, Sparkles, GitBranch, ShieldCheck, KeyRound, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import "./styles.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const prompts = [
    { icon: <GitBranch size={20} />, text: "What is the EWT single-main-branch standard?" },
    { icon: <ShieldCheck size={20} />, text: "What are the branch protection requirements?" },
    { icon: <KeyRound size={20} />, text: "How should secrets be managed in Terraform repositories?" }
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function askQuestion(promptText) {
    const trimmed = (promptText || question).trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
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
        { role: "assistant", text: data.answer || "No response received." }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "I could not reach the backend API. Please check the Container App revision." }
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

  function copyText(text) {
    navigator.clipboard.writeText(text);
  }

  const isLanding = messages.length === 0;

  return (
    <main className="app">
      <section className={isLanding ? "landing" : "chatMode"}>
        {isLanding && (
          <div className="hero">
            <div className="assistantIcon">
              <Sparkles size={34} />
            </div>

            <h1>Enterprise Engineering AI Assistant</h1>
            <p>Ask questions about engineering standards, GitHub controls, CI/CD practices, IaC governance, and deployment rules.</p>

            <div className="promptGrid">
              {prompts.map((p, i) => (
                <button key={i} className="promptCard" onClick={() => askQuestion(p.text)}>
                  <div className="promptIcon">{p.icon}</div>
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!isLanding && (
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                <div className="avatar">{m.role === "assistant" ? "AI" : "You"}</div>
                <div className="messageBody">
                  <div className="messageText">{m.text}</div>

                  {m.role === "assistant" && (
                    <div className="messageActions">
                      <button onClick={() => copyText(m.text)}><Copy size={14} /></button>
                      <button><ThumbsUp size={14} /></button>
                      <button><ThumbsDown size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="message assistant">
                <div className="avatar">AI</div>
                <div className="messageBody">
                  <div className="typing"><span></span><span></span><span></span></div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        <div className="composerWrap">
          <div className="composer">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about engineering standards..."
            />
            <button className="sendBtn" onClick={() => askQuestion()} disabled={loading || !question.trim()}>
              <Send size={24} />
            </button>
          </div>
          <div className="hint">Press Enter to send · Shift + Enter for a new line</div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
