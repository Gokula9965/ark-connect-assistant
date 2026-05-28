import { useState } from 'react';

export default function FeedbackButton({ userMessage, aiResponse, agent, intent }) {
  const [feedback, setFeedback] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = async (isHelpful) => {
    setFeedback(isHelpful);
    setSubmitted(true);

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: userMessage,
          ai_response: aiResponse,
          is_helpful: isHelpful,
          agent: agent,
          intent: intent
        })
      });
    } catch (err) {
      // Silently fail — feedback is non-critical
      console.log('Feedback send failed:', err);
    }
  };

  if (submitted) {
    return (
      <div className="feedback-section">
        <span className="feedback-thanks">
          {feedback ? '✅ Thanks for the feedback!' : '📝 Thanks, we\'ll improve!'}
        </span>
      </div>
    );
  }

  return (
    <div className="feedback-section">
      <span className="feedback-label">Was this helpful?</span>
      <button
        className="feedback-btn positive"
        onClick={() => handleFeedback(true)}
        title="Helpful"
        id="feedback-helpful"
      >
        👍
      </button>
      <button
        className="feedback-btn negative"
        onClick={() => handleFeedback(false)}
        title="Not helpful"
        id="feedback-not-helpful"
      >
        👎
      </button>
    </div>
  );
}
