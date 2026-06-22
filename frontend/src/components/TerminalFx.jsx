import React, { useEffect, useState } from 'react';
import '../styles/terminal-fx.css';

/** Анимация входа — играет прямо в шапке-терминале (Header.jsx) при переходе
 * из гостя в авторизованного пользователя. Одна строка в момент времени
 * (не стек из нескольких — иначе высота шапки скачет, см. баг, найденный при
 * проверке): сначала разноцветная глитч-надпись «ATOM BOOT» (в той же манере,
 * что финальный SEGFAULT при выходе), затем строки подключения. На последней
 * строке анимация "замирает" — дальше Header.jsx сам убирает её по таймауту
 * и показывает обычное меню. Раньше здесь ещё на секунду показывался
 * шестиугольник-аватар с именем перед возвратом меню — убрано по запросу:
 * лишний промежуточный кадр, после терминальных команд должно идти сразу
 * обычное меню, без этой вставки. */
export function LoginBootAnimation() {
  const steps = [
    'ATOM BOOT',
    '> connecting to atom://core ... OK',
    '> verifying credentials ... OK',
    '> mounting profile ... OK',
  ];
  const [i, setI] = useState(0);

  useEffect(() => {
    if (i >= steps.length - 1) return;
    const delay = i === 0 ? 600 : 350;
    const t = setTimeout(() => setI((v) => v + 1), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  return (
    <div className="anim-line-fx">
      <span key={i} className={`anim-line-fx__text ${i === 0 ? 'is-glitch' : ''}`}>{steps[i]}</span>
    </div>
  );
}

/** Анимация выхода — терминал построчно «удаляет» данные сессии и срывается
 * в хроматический глитч kernel panic, после чего строка схлопывается.
 * Зеркало LoginBootAnimation: те же приёмы, в обратном порядке. */
export function LogoutCrashAnimation() {
  const steps = [
    'rm -rf /session/token',
    'rm -rf /session/cache',
    'rm -rf /session/cookies',
    'SEGFAULT: session terminated',
  ];
  const [i, setI] = useState(0);
  const isLast = i === steps.length - 1;

  useEffect(() => {
    if (isLast) return;
    const t = setTimeout(() => setI((v) => v + 1), 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  return (
    <div className={`anim-line-fx ${isLast ? 'is-collapsing' : ''}`}>
      <span key={i} className={`anim-line-fx__text ${isLast ? 'is-glitch is-danger' : ''}`}>{steps[i]}</span>
    </div>
  );
}
