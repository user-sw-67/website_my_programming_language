import React, { useEffect, useRef } from 'react';

function Atom({ style, size = 140, depth = 1 }) {
  return (
    <div className="bg-atom" data-depth={depth} style={{ width: size, height: size, ...style }}>
      <span className="bg-atom__nucleus" />
      <div className="bg-atom__orbit" style={{ transform: 'rotate(0deg) scaleY(0.42)' }}>
        <div className="bg-atom__spin" style={{ animationDuration: '7s' }}>
          <span className="bg-atom__electron" />
        </div>
      </div>
      <div className="bg-atom__orbit" style={{ transform: 'rotate(60deg) scaleY(0.42)' }}>
        <div className="bg-atom__spin" style={{ animationDuration: '9s', animationDirection: 'reverse' }}>
          <span className="bg-atom__electron" />
        </div>
      </div>
      <div className="bg-atom__orbit" style={{ transform: 'rotate(120deg) scaleY(0.42)' }}>
        <div className="bg-atom__spin" style={{ animationDuration: '11s' }}>
          <span className="bg-atom__electron" />
        </div>
      </div>
    </div>
  );
}

export default function BackgroundDecor() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(max-width: 700px)').matches) return;

    const layers = root.querySelectorAll('[data-depth]');
    const onMove = (e) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      layers.forEach((el) => {
        const depth = Number(el.dataset.depth) || 1;
        el.style.setProperty('--parallax-x', `${x * depth * 18}px`);
        el.style.setProperty('--parallax-y', `${y * depth * 18}px`);
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className="bg-geo" aria-hidden="true" ref={rootRef}>
      <span className="bg-geo__beam bg-geo__beam--1" />
      <span className="bg-geo__beam bg-geo__beam--2" />

      <Atom size={210} depth={2.4} style={{ top: '4%', right: '4%', opacity: 0.6 }} />
      <Atom size={130} depth={1.6} style={{ bottom: '10%', left: '3%', opacity: 0.45 }} />
      <Atom size={90} depth={1} style={{ top: '42%', left: '46%', opacity: 0.28 }} />

      <span className="bg-geo__hex" data-depth="1.8" style={{ top: '55%', right: '-60px', width: 240, height: 240 }} />
      <span className="bg-geo__hex bg-geo__hex--sm" data-depth="0.8" style={{ top: '6%', left: '20%', width: 90, height: 90 }} />
      <span className="bg-geo__triangle" data-depth="1.2" style={{ bottom: '4%', left: '10%' }} />
      <span className="bg-geo__ring" data-depth="0.6" style={{ top: '18%', left: '12%' }} />
      <span className="bg-geo__ring bg-geo__ring--sm" data-depth="1.4" style={{ bottom: '22%', right: '18%' }} />

      <svg className="bg-geo__circuit" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M0,20 H30 L38,28 H70" />
        <path d="M100,70 H75 L68,63 H40" />
        <circle cx="30" cy="20" r="1.2" />
        <circle cx="70" cy="28" r="1.2" />
        <circle cx="75" cy="70" r="1.2" />
        <circle cx="40" cy="63" r="1.2" />
      </svg>
    </div>
  );
}
