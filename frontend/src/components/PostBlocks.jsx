import React from 'react';

/** Блоки поста — минималистичная вертикальная лента: если у блока есть
 * фото, оно сверху на всю ширину, текст — под ним; блоки идут друг под
 * другом, без рамок/поворотов/масонри (заменили скрапбук-коллаж по запросу
 * пользователя на более спокойный, строгий вид). */
export default function PostBlocks({ blocks }) {
  return (
    <div className="reactor-blocks">
      {blocks.map((b, i) => (
        <div key={i} className="reactor-blocks__item">
          {b.image && <div className="reactor-blocks__photo" style={{ backgroundImage: `url(${b.image})` }} />}
          <div className="reactor-blocks__text" dangerouslySetInnerHTML={{ __html: b.text }} />
        </div>
      ))}
    </div>
  );
}
