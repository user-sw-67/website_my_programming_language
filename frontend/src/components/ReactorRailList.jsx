import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating.jsx';
import { displayName } from '../utils/userDisplay.js';

/** Лента «Реактора» — выбранный пользователем дизайн: неоновый рельс слева
 * (узел + энергобимп на hover) совмещённый с терминальной строкой
 * `$ open <заголовок>` и мигающим курсором на hover. summary — это и есть
 * «описание статьи»: поле уже существует в Topic, отдельного поля в БД не
 * требовалось, в форме создания оно теперь подписано «Описание статьи». */
export default function ReactorRailList({ topics }) {
  return (
    <div className="reactor-rail">
      {topics.map((topic) => (
        <Link key={topic.id} to={`/forum/${topic.slug}`} className="reactor-rail__row">
          <span className="reactor-rail__node" />
          <span className="reactor-rail__beam" />
          <div className="reactor-rail__body">
            <div className="reactor-rail__title-line">
              <span className="reactor-rail__prompt">$ open</span>
              <strong className="reactor-rail__title">{topic.title}</strong>
              {topic.is_resolved && <span className="badge badge--solved">решено</span>}
              {topic.is_hidden && <span className="badge reactor-card__hidden-badge">скрыт</span>}
            </div>
            {topic.summary && <p className="reactor-rail__desc">{topic.summary}</p>}
            <div className="reactor-rail__meta">
              {topic.category && <span className="badge reactor-card__category">{topic.category.name}</span>}
              <div className="reactor-card__tags">
                {(topic.tags || []).map((t) => <span key={t} className="badge">#{t}</span>)}
              </div>
              <span className="reactor-rail__author">{topic.author ? displayName(topic.author) : 'аноним'}</span>
              <StarRating value={topic.avg_rating || 0} count={topic.ratings_count} size={12} />
              <span className="reactor-rail__comments">💬 {topic.comments_count ?? 0}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
