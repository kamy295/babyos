import { useState } from "react";
import type { SleepSession } from "../../types/sleep";
import { getTodaySleepDuration, getWeeklySleepSummary } from "./sleepUtils";
import "./SleepTracker.css";

type SleepTrackerProps = {
  sleepSessions: SleepSession[];
  onStartSleep: () => void;
  onEndSleep: () => void;
  onAddSleepSession: (startTime: string, endTime: string) => Promise<boolean>;
  isSleepActionInProgress: boolean;
  areEventsLoaded: boolean;
};

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDuration(startTime: string, endTime: string): string {
  const durationMs =
    new Date(endTime).getTime() - new Date(startTime).getTime();

  const totalMinutes = Math.max(0, Math.floor(durationMs / 60000));

  if (totalMinutes === 0) return "Less than 1m";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

function formatTotalDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

function SleepTracker({
  sleepSessions,
  onStartSleep,
  onEndSleep,
  onAddSleepSession,
  areEventsLoaded,
  isSleepActionInProgress,
}: SleepTrackerProps) {
  const [showPastSleepForm, setShowPastSleepForm] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [durationHours, setDurationHours] = useState("0");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [formError, setFormError] = useState("");

  const todaySleepDuration = getTodaySleepDuration(sleepSessions);
  const activeSession = sleepSessions.find(
    (session) => session.endTime === null,
  );

  const weeklySummary = getWeeklySleepSummary(sleepSessions);

  const maxDailySleep = Math.max(
    ...weeklySummary.days.map((day) => day.totalMinutes),
    1,
  );

  const handlePastSleepSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!startTime || durationHours === "") {
      setFormError("Please enter the sleep start time and duration.");
      return;
    }

    const startDate = new Date(startTime);
    const hours = Number(durationHours);
    const minutes = Number(durationMinutes || 0);

    if (
      Number.isNaN(startDate.getTime()) ||
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      setFormError("Please enter valid sleep details.");
      return;
    }

    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes <= 0) {
      setFormError("Sleep duration must be greater than zero.");
      return;
    }

    const now = new Date();

    if (startDate > now) {
      setFormError("Sleep start time cannot be in the future.");
      return;
    }

    const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);

    if (endDate > now) {
      setFormError("Calculated wake-up time cannot be in the future.");
      return;
    }

    const saved = await onAddSleepSession(
      startDate.toISOString(),
      endDate.toISOString(),
    );

    if (saved) {
      setStartTime("");
      setDurationHours("0");
      setDurationMinutes("");
      setFormError("");
      setShowPastSleepForm(false);
    }
  };

  const [maxDateTime] = useState(() => {
    const now = new Date();

    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });

  return (
    <section className="sleep-section">
      <div className="section-heading">
        <div>
          <h2>Sleep Tracker</h2>
          <p>Keep track of your baby's sleep sessions.</p>
        </div>
      </div>

      <button
        type="button"
        className="sleep-past-button"
        onClick={() => {
          setShowPastSleepForm((previous) => !previous);
          setFormError("");
        }}
      >
        {showPastSleepForm ? "Cancel" : "+ Add Past Sleep"}
      </button>

      {showPastSleepForm && (
        <form className="sleep-past-form" onSubmit={handlePastSleepSubmit}>
          <h3>Add Past Sleep</h3>

          <label htmlFor="sleep-start-time">Sleep date and start time</label>

          <input
            id="sleep-start-time"
            type="datetime-local"
            value={startTime}
            max={maxDateTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
          />

          <label>Sleep duration</label>

          <div className="sleep-duration-inputs">
            <div>
              <input
                type="number"
                min="0"
                max="23"
                value={durationHours}
                onChange={(event) => setDurationHours(event.target.value)}
                required
              />
              <span>Hours</span>
            </div>

            <div>
              <input
                type="number"
                min="0"
                max="59"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
              />
              <span>Minutes</span>
            </div>
          </div>

          {formError && <p className="sleep-form-error">{formError}</p>}

          <button
            type="submit"
            className="sleep-start-button"
            disabled={isSleepActionInProgress}
          >
            Save Sleep
          </button>
        </form>
      )}

      <div className="sleep-summary">
        <div>
          <p>Today's Total Sleep</p>
          <h3>{formatTotalDuration(todaySleepDuration)}</h3>
        </div>
        <span className="sleep-summary-icon">🌙</span>
      </div>

      <div className="sleep-weekly-summary">
        <h3>Last 7 Days</h3>

        <div className="sleep-weekly-stats">
          <div>
            <p>Total Sleep</p>
            <strong>{formatTotalDuration(weeklySummary.weeklyTotal)}</strong>
          </div>

          <div>
            <p>Daily Average</p>
            <strong>{formatTotalDuration(weeklySummary.dailyAverage)}</strong>
          </div>
        </div>

        <div className="sleep-weekly-chart">
          {weeklySummary.weeklyTotal === 0 ? (
            <p className="sleep-weekly-empty">
              No sleep recorded in the last 7 days.
            </p>
          ) : (
            weeklySummary.days.map((day, index) => (
              <div
                className={`sleep-weekly-day ${day.isToday ? "is-today" : ""}`}
                key={`${day.label}-${index}`}
              >
                <span className="sleep-weekly-bar-value">
                  {day.totalMinutes > 0
                    ? formatTotalDuration(day.totalMinutes)
                    : ""}
                </span>

                <div className="sleep-weekly-bar-container">
                  <div
                    className="sleep-weekly-bar"
                    style={{
                      height: `${(day.totalMinutes / maxDailySleep) * 100}%`,
                    }}
                  />
                </div>

                <span className="sleep-weekly-day-label">{day.label}</span>
                <span className="sleep-weekly-date">{day.dateLabel}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {activeSession ? (
        <div className="sleep-active-card">
          <div className="sleep-status">
            <span className="sleep-status-dot" />
            Currently sleeping
          </div>

          <p className="sleep-muted">Started at</p>
          <h3>{formatTime(activeSession.startTime)}</h3>

          <button
            className="sleep-end-button"
            onClick={onEndSleep}
            disabled={!areEventsLoaded || isSleepActionInProgress}
          >
            {isSleepActionInProgress ? "Saving..." : "End Sleep"}
          </button>
        </div>
      ) : (
        <div className="sleep-start-card">
          <p>No active sleep session</p>
          <button
            className="sleep-start-button"
            onClick={onStartSleep}
            disabled={!areEventsLoaded || isSleepActionInProgress}
          >
            {!areEventsLoaded
              ? "Loading..."
              : isSleepActionInProgress
                ? "Starting..."
                : "Start Sleep"}
          </button>
        </div>
      )}

      <div className="sleep-history">
        <h3>Recent Sleep Sessions</h3>

        {sleepSessions.filter((session) => session.endTime !== null).length ===
        0 ? (
          <p className="sleep-empty">No completed sleep sessions yet.</p>
        ) : (
          sleepSessions
            .filter((session) => session.endTime !== null)
            .slice(0, 5)
            .map((session) => (
              <div className="sleep-history-item" key={session.id}>
                <div className="sleep-history-duration">
                  <strong>
                    {formatDuration(session.startTime, session.endTime!)}
                  </strong>
                </div>

                <div className="sleep-history-details">
                  <div>
                    <span>{formatSessionDate(session.startTime)}</span>
                    <span>
                      {formatTime(session.startTime)} –{" "}
                      {formatTime(session.endTime!)}
                    </span>
                  </div>

                  <span className="sleep-history-icon">🌙</span>
                </div>
              </div>
            ))
        )}
      </div>
    </section>
  );
}

export default SleepTracker;
