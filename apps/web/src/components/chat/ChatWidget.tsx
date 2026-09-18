import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiPost } from '../../lib/api.ts';
import './chat.css';

type ChatRole = 'user' | 'model';
interface ChatTurn {
  readonly role: ChatRole;
  readonly text: string;
}

interface ChatResponse {
  readonly reply: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<readonly ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const history = messages;
    setMessages([...history, { role: 'user', text }]);
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const result = await apiPost<ChatResponse>('/api/chat', { history, message: text });
      setMessages((prev) => [...prev, { role: 'model', text: result.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pesan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <section className="chat-widget__panel" aria-label="Chat dengan AI">
          <header className="chat-widget__header">
            <span>Asisten AI</span>
            <button
              type="button"
              className="chat-widget__close"
              aria-label="Tutup chat"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </header>

          <div className="chat-widget__list" ref={listRef}>
            {messages.length === 0 && (
              <p className="chat-widget__empty">Tanya apa saja tentang aplikasi ini ke asisten AI.</p>
            )}
            {messages.map((turn, index) => (
              <div
                key={index}
                className={`chat-widget__bubble chat-widget__bubble--${turn.role === 'user' ? 'user' : 'model'}`}
              >
                {turn.text}
              </div>
            ))}
            {loading && <div className="chat-widget__bubble chat-widget__bubble--model">Mengetik...</div>}
          </div>

          {error && <p className="chat-widget__error">{error}</p>}

          <form className="chat-widget__form" onSubmit={(event) => void handleSubmit(event)}>
            <input
              type="text"
              placeholder="Tulis pesan..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn--primary btn--sm" disabled={loading || !input.trim()}>
              Kirim
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chat-widget__fab"
        aria-label={open ? 'Tutup chat AI' : 'Buka chat AI'}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}
