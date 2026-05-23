import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Send, Plus, Clock, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import "./styles.css";

function App() {
  const initialMessage = {
    role: "assistant",
    text: "Hi, I can help you understand EWT engineering standards, GitHub controls, CI/CD practices, IaC governance, and deployment rules.",
    citations: []
  };

  const [messages, setMessages] = useState([initialMessage]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
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

    setChatHistory((prev) => {
      const exists = prev.some((item) => item.question === trimmed);
      if (exists) return prev;
      return [{ question: trimmed, messages: [...messages, { role: "user", text: trimmed, citations: [] }] }, ...prev];
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed })
      });

      const data = await response.json();

      const assistantMessage = {
        role: "assistant",
        text: data.answer || "No response received.",
        citations: data.citations || []
      };

      setMessages((prev) => [...prev, assistantMessage]);

      setChatHistory((prev) =>
        prev.map((item, index) =>
          index === 0
            ? { ...item, messages: [...item.messages, assistantMessage] }
            : item
        )
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I could not reach the backend API. Please check the Container App revision and API link.",
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

  function startNewChat() {
    setMessages([initialMessage]);
    setQuestion("");
  }

  function openHistory(item) {
    setMessages(item.messages);
    setShowHistory(false);
  }

  function copyText(text) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="app">
      {showHistory && (
        <aside className="historyDrawer">
          <div className="drawerHeader">
            <h3>Chat history</h3>
            <button onClick={() => setShowHistory(false)}>×</button>
          </div>

          {chatHistory.length === 0 ? (
            <p className="emptyHistory">No chat history yet.</p>
          ) : (
            chatHistory.map((item, index) => (
              <button key={index} className="historyItem" onClick={() => openHistory(item)}>
                <Clock size={15} />
                <span>{item.question}</span>
              </button>
            ))
          )}
        </aside>
      )}

      <main className="chatShell">
        <header className="topbar">
          <div className="leftActions">
            <button className="iconBtn" onClick={() => setShowHistory(true)}>
              <Clock size={18} />
            </button>
            <button className="newBtn" onClick={startNewChat}>
              <Plus size={17} />
              New chat
            </button>
          </div>

          <div className="titleBlock">
            <h1>Enterprise Engineering AI Assistant</h1>
          </div>

          <div></div>
        </header>

        <section className="conversation">
          {messages.map((m, index) => (
            <div key={index} className={`message ${m.role}`}>
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
                <div className="typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </section>

        <div className="composerWrap">
          <div className="composer">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about engineering standards..."
            />
            <button className="sendBtn" onClick={askQuestion} disabled={loading || !question.trim()}>
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
