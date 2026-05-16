const workflowSteps = [
  {
    number: '01',
    title: 'Create event types',
    description: 'Set up quick intro calls, paid sessions, or team meetings from one admin dashboard.',
  },
  {
    number: '02',
    title: 'Share your booking page',
    description: 'Send one clean public link so people can pick a time without the usual back-and-forth.',
  },
  {
    number: '03',
    title: 'Stay organized',
    description: 'Track bookings and keep every meeting flow visible from a single place.',
  },
];

const repoTopics = [
  'scheduling',
  'calendar',
  'availability',
  'booking-links',
  'productivity',
  'nextjs',
  'typescript',
  'fullstack',
  'ui-ux',
  'open-source',
];

const visibleTopicCount = 5;

export default function Home() {
  return (
    <main className="landing-shell">
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow">Scheduling for modern teams</p>
          <h1 className="landing-title">A sharper Calendly-style booking experience for your own workflow.</h1>
          <p className="landing-description">
            Create meeting types, share a polished booking link, and let people schedule without the
            usual email ping-pong.
          </p>

          <div className="landing-actions">
            <a href="/admin" className="landing-button landing-button-primary">
              Open Admin Dashboard
            </a>
            <a
              href="${process.env.NEXT_PUBLIC_API_BASE_URL}/health"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-button landing-button-secondary"
            >
              Check Backend Status
            </a>
          </div>

          <div className="landing-highlights-wrapper" aria-label="Community highlights">
            <p className="landing-highlights-title">Community Highlights</p>
            <div className="landing-highlights">
              {repoTopics.slice(0, visibleTopicCount).map((topic) => (
                <span key={topic} className="landing-chip">
                  #{topic}
                </span>
              ))}

              <details className="landing-topics-expandable">
                <summary className="landing-chip landing-topics-toggle" aria-label="Show more topics">
                  More topics
                </summary>
                <div className="landing-topics-extra">
                  {repoTopics.slice(visibleTopicCount).map((topic) => (
                    <span key={topic} className="landing-chip">
                      #{topic}
                    </span>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>

        <div className="landing-showcase" aria-hidden="true">
          <div className="landing-card landing-card-primary">
            <p className="landing-card-label">This week</p>
            <h2>12 bookings confirmed</h2>
            <p>Keep event setup, availability, and booking links moving from one focused dashboard.</p>
          </div>

          <div className="landing-card-grid">
            <div className="landing-card">
              <p className="landing-stat">30 min</p>
              <p className="landing-card-caption">Most-booked meeting</p>
            </div>
            <div className="landing-card">
              <p className="landing-stat">3 steps</p>
              <p className="landing-card-caption">From event creation to booking</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-band">
        <p>Built for quick setup, smoother scheduling, and easier sharing across your public booking flow.</p>
      </section>

      <section className="landing-workflow">
        <div className="landing-section-heading">
          <p className="landing-section-label">How it works</p>
          <h2>Everything you need to launch a simple scheduling flow.</h2>
        </div>

        <div className="landing-step-grid">
          {workflowSteps.map((step) => (
            <article key={step.number} className="landing-step-card">
              <p className="landing-step-number">{step.number}</p>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
