import React, { useState } from 'react';
import apiClient from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import CommentEditor from './CommentEditor.jsx';
import { developerRoleLabel, displayName } from '../utils/userDisplay.js';

// дальше этой глубины отступ не растёт — иначе на мобильных глубокие ветки
// уезжают горизонтально за экран; вместо этого все уровни глубже рисуются
// с одним и тем же отступом и соединительной линией
const MAX_VISUAL_DEPTH = 6;

function AuthorBadges({ author, isTopicAuthor }) {
  const roleLabel = developerRoleLabel(author);
  return (
    <span className="comment__badges">
      {isTopicAuthor && <span className="badge comment__badge-author">автор</span>}
      {roleLabel && <span className="badge comment__badge-dev">{roleLabel}</span>}
    </span>
  );
}

/** Тело комментария — HTML из Tiptap (санитизирован на бэкенде). Ссылки «на
 * строки файла» внутри — обычные <a class="comment-ref-link" data-ref-*>,
 * перехватываем клик по ним делегированием и просим родителя прыгнуть в
 * терминал файлов, не открывая "#". */
function CommentBody({ html, onJumpToReference }) {
  const onClick = (e) => {
    const link = e.target.closest('a.comment-ref-link');
    if (!link) return;
    e.preventDefault();
    onJumpToReference?.({
      attachmentId: Number(link.dataset.refAttachment),
      startLine: Number(link.dataset.refStart),
      endLine: Number(link.dataset.refEnd),
    });
  };
  return <div className="comment__text" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}

// относительное время для свежих комментариев, абсолютная дата для старых —
// чтобы не считать вручную «когда же это было», но и не плодить «3421 минуту назад»
function formatCommentTime(iso) {
  const date = new Date(iso);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'только что';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} мин назад`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ч назад`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} дн назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

// считаем ВСЕХ потомков (а не только прямых ответов) — иначе на глубоких
// ветках цифра на кнопке выглядела бы заниженной
function countDescendants(replies) {
  if (!replies || replies.length === 0) return 0;
  return replies.reduce((sum, r) => sum + 1 + countDescendants(r.replies), 0);
}

function CommentNode({ comment, topicSlug, depth, onReplyPosted, onJumpToReference, attachments }) {
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [body, setBody] = useState('');
  const [bodyEmpty, setBodyEmpty] = useState(true);
  const [sending, setSending] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);
  const replyCount = countDescendants(comment.replies);

  const submitReply = async (e) => {
    e.preventDefault();
    if (bodyEmpty) return;
    setSending(true);
    try {
      const { data } = await apiClient.post('/forum/comments/', { topic: comment.topic, parent: comment.id, body });
      onReplyPosted(data);
      setBody('');
      setBodyEmpty(true);
      setEditorKey((k) => k + 1);
      setReplyOpen(false);
      setRepliesOpen(true); // свой только что отправленный ответ должен быть виден сразу, не спрятан под «посмотреть ответы»
    } catch {
      // тихо игнорируем — пользователь увидит, что ответ не появился, и попробует снова
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`comment-node comment-node--depth-${visualDepth}`}>
      <div className="comment">
        <Avatar user={comment.author} size={32} />
        <div className="comment__body">
          <div className="comment__author">
            {displayName(comment.author)}
            <AuthorBadges author={comment.author} isTopicAuthor={comment.is_topic_author} />
            <span className="comment__time" title={new Date(comment.created_at).toLocaleString('ru-RU')}>
              {formatCommentTime(comment.created_at)}
            </span>
          </div>
          <CommentBody html={comment.body} onJumpToReference={onJumpToReference} />
          <div className="comment__actions">
            {user && (
              <button
                type="button"
                className={`comment__reply-toggle ${replyOpen ? 'comment__reply-toggle--active' : ''}`}
                onClick={() => setReplyOpen((o) => !o)}
              >
                <span className="comment__reply-toggle-icon">{replyOpen ? '✕' : '↩'}</span>
                {replyOpen ? 'Отмена' : 'Ответить'}
              </button>
            )}
            {replyCount > 0 && (
              <button
                type="button"
                className={`comment__replies-toggle ${repliesOpen ? 'comment__replies-toggle--open' : ''}`}
                onClick={() => setRepliesOpen((o) => !o)}
              >
                <span className="comment__replies-toggle-count">{replyCount}</span>
                <span className="comment__replies-toggle-label">{repliesOpen ? 'Скрыть ответы' : 'Ответы'}</span>
                <span className={`comment__replies-caret ${repliesOpen ? 'open' : ''}`}>▾</span>
              </button>
            )}
          </div>

          {replyOpen && (
            <form onSubmit={submitReply} className="comment-form comment-form--reply">
              <CommentEditor key={editorKey} attachments={attachments} onChange={(html, isEmpty) => { setBody(html); setBodyEmpty(isEmpty); }} />
              <button className="btn btn-primary" disabled={sending || bodyEmpty} style={{ marginTop: '0.5rem' }}>
                {sending ? <span className="skeleton-spin" /> : 'Отправить'}
              </button>
            </form>
          )}
        </div>
      </div>

      {repliesOpen && (comment.replies || []).map((child) => (
        <CommentNode
          key={child.id}
          comment={child}
          topicSlug={topicSlug}
          depth={depth + 1}
          onReplyPosted={onReplyPosted}
          onJumpToReference={onJumpToReference}
          attachments={attachments}
        />
      ))}
    </div>
  );
}

/** Дерево комментариев без ограничения глубины — реальное дерево строит
 * backend (один SQL-запрос на тему), здесь только рекурсивный рендер.
 * onReplyPosted получает уже сохранённый комментарий с сервера; родительская
 * страница (ReactorPostPage) сама решает, как обновить состояние (проще и
 * надёжнее всего — перезапросить дерево целиком). */
export default function CommentThread({ comments, topicSlug, attachments, onReplyPosted, onJumpToReference }) {
  if (!comments || comments.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>Пока нет ответов — будьте первым.</p>;
  }
  return (
    <div className="comment-thread">
      {comments.map((c) => (
        <CommentNode
          key={c.id}
          comment={c}
          topicSlug={topicSlug}
          depth={0}
          onReplyPosted={onReplyPosted}
          onJumpToReference={onJumpToReference}
          attachments={attachments}
        />
      ))}
    </div>
  );
}
