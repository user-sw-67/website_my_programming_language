import React, { useEffect, useRef } from 'react';

export default function CursorFX() {
  const glowRef = useRef(null);
  const rippleHostRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const glow = glowRef.current;
    const onMove = (e) => {
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };

    const onDown = (e) => {
      const ripple = document.createElement('span');
      ripple.className = 'cursor-ripple';
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      rippleHostRef.current.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
    };
  }, []);

  return (
    <>
      <span className="cursor-glow" ref={glowRef} aria-hidden="true" />
      <div className="cursor-ripple-host" ref={rippleHostRef} aria-hidden="true" />
    </>
  );
}
