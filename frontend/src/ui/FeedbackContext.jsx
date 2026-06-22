import React, { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/feedback.css';

const ConfirmContext = createContext(null);
const ToastContext = createContext(null);

let toastSeq = 0;

/** Единая замена window.confirm()/window.alert() на стилизованные под сайт
 * модалку подтверждения и тосты — рендерятся через портал в document.body
 * (см. предупреждение про position:sticky в CLAUDE.md: иначе fixed-модалка
 * внутри sticky-шапки улетает в случайную точку экрана). */
export function FeedbackProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);
  const [toasts, setToasts] = useState([]);

  const confirm = useCallback((opts) => {
    const normalized = typeof opts === 'string' ? { text: opts } : opts;
    const {
      title = 'Подтвердите действие',
      text = '',
      confirmLabel = 'Подтвердить',
      cancelLabel = 'Отмена',
      danger = false,
    } = normalized;
    return new Promise((resolve) => {
      setConfirmState({ title, text, confirmLabel, cancelLabel, danger, resolve });
    });
  }, []);

  const resolveConfirm = (result) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  const toast = useCallback((opts) => {
    const normalized = typeof opts === 'string' ? { text: opts } : opts;
    const { text, tone = 'info', duration = 4500 } = normalized;
    const id = ++toastSeq;
    setToasts((list) => [...list, { id, text, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), duration);
  }, []);

  const dismissToast = (id) => setToasts((list) => list.filter((t) => t.id !== id));

  return (
    <ConfirmContext.Provider value={confirm}>
      <ToastContext.Provider value={toast}>
        {children}
        {createPortal(
          <>
            {confirmState && (
              <div className="confirm-backdrop" onClick={() => resolveConfirm(false)}>
                <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                  <h3 className="confirm-modal__title">{confirmState.title}</h3>
                  {confirmState.text && <p className="confirm-modal__text">{confirmState.text}</p>}
                  <div className="confirm-modal__actions">
                    <button className="btn btn-secondary" onClick={() => resolveConfirm(false)}>
                      {confirmState.cancelLabel}
                    </button>
                    <button
                      className={`btn ${confirmState.danger ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => resolveConfirm(true)}
                      autoFocus
                    >
                      {confirmState.confirmLabel}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="toast-stack">
              {toasts.map((t) => (
                <div key={t.id} className={`toast toast--${t.tone}`} onClick={() => dismissToast(t.id)}>
                  <span className="toast__icon">{t.tone === 'error' ? '⚠' : t.tone === 'success' ? '✓' : 'ℹ'}</span>
                  <span className="toast__text">{t.text}</span>
                </div>
              ))}
            </div>
          </>,
          document.body,
        )}
      </ToastContext.Provider>
    </ConfirmContext.Provider>
  );
}

/** Возвращает confirm(text | {title, text, confirmLabel, cancelLabel, danger}) -> Promise<boolean> */
export function useConfirm() {
  return useContext(ConfirmContext);
}

/** Возвращает toast(text | {text, tone: 'info'|'success'|'error', duration}) */
export function useToast() {
  return useContext(ToastContext);
}
