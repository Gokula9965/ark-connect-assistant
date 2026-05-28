import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import FeedbackButton from './FeedbackButton';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isAi = message.role === 'ai';

  return (
    <div className={`message ${message.role}`} id={`message-${message.id}`}>
      <div className="message-avatar">
        {isUser ? '👤' : '✨'}
      </div>
      <div className="message-content-wrapper">
        <div className="message-content">
          {isAi ? (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          ) : (
            <span>{message.content}</span>
          )}
        </div>
        {isAi && (
          <FeedbackButton
            userMessage={message.userQuestion || ''}
            aiResponse={message.content}
            agent={message.agent}
            intent={message.intent}
          />
        )}
      </div>
    </div>
  );
}
