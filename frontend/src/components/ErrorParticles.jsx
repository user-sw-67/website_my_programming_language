import React from 'react';

export default function ErrorParticles({ count = 18 }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    left: `${(i * 97) % 100}%`,
    delay: `${(i % 7) * 0.6}s`,
    duration: `${4 + (i % 5)}s`,
  }));

  return (
    <div className="error-particles" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {particles.map((p, i) => (
        <span
          key={i}
          style={{ left: p.left, bottom: 0, animationDelay: p.delay, animationDuration: p.duration }}
        />
      ))}
    </div>
  );
}
