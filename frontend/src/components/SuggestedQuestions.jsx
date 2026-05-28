import { useState, useEffect } from 'react';

export default function SuggestedQuestions({ onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback suggestions if API fails
  const fallbackSuggestions = [
    { question: 'How do I onboard my church?', category: 'Onboarding' },
    { question: 'How to create a group?', category: 'Groups' },
    { question: 'What roles exist in Ark Connect?', category: 'Permissions' },
    { question: 'How do prayer requests work?', category: 'Prayer & Devotions' },
    { question: 'How to invite members?', category: 'Members' },
    { question: 'How to create an event?', category: 'Events' },
  ];

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch('/api/suggestions');
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions.length > 0 ? data.suggestions : fallbackSuggestions);
      } else {
        setSuggestions(fallbackSuggestions);
      }
    } catch {
      setSuggestions(fallbackSuggestions);
    } finally {
      setLoading(false);
    }
  };

  const displaySuggestions = suggestions.length > 0 ? suggestions : fallbackSuggestions;

  return (
    <div className="suggestions-grid">
      {displaySuggestions.map((s, i) => (
        <div
          key={i}
          className={`suggestion-card ${loading ? 'loading-shimmer' : ''}`}
          onClick={() => onSelect(s.question)}
          id={`suggestion-${i}`}
        >
          <div className="suggestion-card-category">{s.category}</div>
          <div className="suggestion-card-text">{s.question}</div>
        </div>
      ))}
    </div>
  );
}
