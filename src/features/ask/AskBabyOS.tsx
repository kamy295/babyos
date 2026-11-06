import { useState } from "react";
import type { FamilyNote } from "../../types/notes";
import type { Task } from "../../types/tasks";
import { answerQuestion } from "./answerQuestion";
import "./AskBabyOS.css";

type AskBabyOSProps = {
  notes: FamilyNote[];
  tasks: Task[];
};

const SUGGESTED_QUESTIONS = [
  "When did Dhruv last sleep?",
  "What did Dhruv last eat?",
  "What are my pending tasks?",
  "Show my recent notes",
];

function AskBabyOS({ notes, tasks }: AskBabyOSProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const handleAsk = () => {
    if (!question.trim()) return;

    const result = answerQuestion(question, notes, tasks);
    setAnswer(result);
  };

  const handleSuggestedQuestion = (suggestion: string) => {
    setQuestion(suggestion);
    setAnswer(answerQuestion(suggestion, notes, tasks));
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
            if (event.key === "Enter") handleAsk();
          }}
          placeholder="Ask something about your baby..."
        />

        <button type="button" onClick={handleAsk} disabled={!question.trim()}>
          Ask
        </button>
      </div>

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
