import { useState } from "react";
import type { Task } from "../../types/tasks";
import { askBabyOS } from "./askBabyOSApi";
import "./AskBabyOS.css";

type AskBabyOSProps = {
  tasks: Task[];
};

const SUGGESTED_QUESTIONS = [
  "When did Dhruv last sleep?",
  "What did Dhruv last eat?",
  "What are my pending tasks?",
  "Show my recent notes",
];

function AskBabyOS({ tasks }: AskBabyOSProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAsk = async (selectedQuestion = question) => {
    const trimmedQuestion = selectedQuestion.trim();

    if (!trimmedQuestion || isLoading) return;

    setQuestion(trimmedQuestion);
    setIsLoading(true);
    setError("");
    setAnswer("");

    try {
      const result = await askBabyOS(trimmedQuestion, tasks);
      setAnswer(result);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (suggestion: string) => {
    void handleAsk(suggestion);
  };

  return (
    <section className="ask-section">
      <div className="section-heading">
        <div>
          <h2>Ask BabyOS</h2>
          <p>Get answers from your saved family information.</p>
        </div>
      </div>

      <div className="suggested-questions">
        {SUGGESTED_QUESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => handleSuggestedQuestion(suggestion)}
            disabled={isLoading}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="ask-input-wrapper">
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleAsk();
          }}
          placeholder="Ask something about your baby..."
          disabled={isLoading}
        />

        <button
          type="button"
          onClick={() => void handleAsk()}
          disabled={!question.trim() || isLoading}
        >
          {isLoading ? "Thinking..." : "Ask"}
        </button>
      </div>

      {error && (
        <p className="ask-error" role="alert">
          {error}
        </p>
      )}

      {isLoading && (
        <p className="ask-loading" role="status">
          BabyOS is looking through your saved information...
        </p>
      )}

      {answer && (
        <div className="answer-card">
          <p className="answer-label">BABYOS ANSWER</p>
          <p className="answer-content">{answer}</p>
        </div>
      )}
    </section>
  );
}

export default AskBabyOS;
