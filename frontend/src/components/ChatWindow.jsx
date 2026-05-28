import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import SuggestedQuestions from './SuggestedQuestions';

let messageId = 0;

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const question = text || input.trim();
    if (!question || loading) return;

    const userMsg = {
      id: ++messageId,
      role: 'user',
      content: question
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Build chat history from recent messages (last 10) for context
      const history = updatedMessages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, history })
      });

      const data = await res.json();

      const aiMsg = {
        id: ++messageId,
        role: 'ai',
        content: data.response || 'Sorry, I could not process your request. Please try again.',
        userQuestion: question,
        sources: data.sources,
        agent: data.agent,
        intent: data.intent
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = {
        id: ++messageId,
        role: 'ai',
        content: '⚠️ Sorry, I\'m having trouble connecting right now. Please make sure the backend services are running and try again.',
        userQuestion: question
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionSelect = (question) => {
    sendMessage(question);
  };

  const clearChat = () => {
    setMessages([]);
    messageId = 0;
  };

  return (
    <>
      {/* Messages Area */}
      <div className="chat-messages" id="chat-messages">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon">✨</div>
            <h2 className="welcome-title">Ark Connect Assistant</h2>
            <p className="welcome-subtitle">
              I'm your AI-powered guide to the Ark Connect platform. Ask me about features, 
              church onboarding, permissions, or anything else — in any language you're comfortable with!
            </p>
            <SuggestedQuestions onSelect={handleSuggestionSelect} />
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {loading && (
              <div className="typing-indicator">
                <div className="message-avatar">✨</div>
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Ask me anything about Ark Connect..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            id="chat-input"
            autoFocus
          />
          <button
            className="send-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            id="send-button"
            title="Send message"
          >
            ➤
          </button>
        </div>
        <div className="chat-input-hint">
          Ark Connect Assistant can answer in any language. Press Enter to send.
        </div>
      </div>
    </>
  );
}

export { ChatWindow };
