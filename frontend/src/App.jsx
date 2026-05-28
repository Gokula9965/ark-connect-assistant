import { useState } from 'react';
import ChatWindow from './components/ChatWindow';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const startNewChat = () => {
    setChatKey(prev => prev + 1);
    closeSidebar();
  };

  return (
    <div className="app-container">
      {/* Sidebar Overlay (Mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar — Clean & Minimal */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">A</div>
          <div className="sidebar-title">
            <h1>Ark Connect</h1>
            <span>AI Assistant</span>
          </div>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-section">
            <div
              className="sidebar-item active"
              onClick={startNewChat}
              id="sidebar-new-chat"
            >
              <span className="sidebar-item-icon">💬</span>
              New Conversation
            </div>
          </div>

          <div className="sidebar-about">
            <p>Your AI-powered guide for Ark Connect. Ask about:</p>
            <ul>
              <li>Feature walkthroughs</li>
              <li>Church onboarding</li>
              <li>Roles & permissions</li>
              <li>How-to guides</li>
              <li>FAQs</li>
            </ul>
            <p className="sidebar-lang-note">🌐 Ask in any language!</p>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="new-chat-btn" onClick={startNewChat} id="new-chat-btn">
            ✨ Start New Chat
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="main-area">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              className="mobile-menu-btn"
              onClick={toggleSidebar}
              id="mobile-menu"
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <span className="chat-header-title">Ark Connect Assistant</span>
          </div>
          <div className="chat-header-status">
            <div className="status-dot"></div>
            <span>Online</span>
          </div>
        </header>

        {/* Chat Window */}
        <ChatWindow key={chatKey} />
      </main>
    </div>
  );
}
