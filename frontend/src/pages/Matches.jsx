import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../services/api';
import { socket } from '../services/socket';
import './Matches.css';

function Matches() {
  const navigate = useNavigate();
  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'dark';

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [content, setContent] = useState('');

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  }, []);

  // Função para ativar/desativar match
  const handleToggleMatchStatus = async (matchId) => {
    if (!window.confirm('Deseja realmente desativar este match?')) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chat/matches/${matchId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: false }),
        }
      );

      if (!response.ok) throw new Error('Erro ao atualizar match');

      // Atualiza estado local removendo visualmente da tela
      setMatches((prev) => prev.filter((m) => m._id !== matchId));

      if (selectedMatch?._id === matchId) {
        setSelectedMatch(null);
        setMessages([]);
      }
    } catch (error) {
      console.error(error);
      alert('Não foi possível desativar o match.');
    }
  };

  // Carregar matches do usuário
  useEffect(() => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/api/chat/users/${user._id}/matches`)
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao buscar matches');
        return res.json();
      })
      .then((data) => {
        setMatches(data.filter((m) => m.active !== false)); // só ativos
        setLoading(false);
        if (data.length > 0) setSelectedMatch(data[0]);
      })
      .catch((error) => {
        console.log(error);
        setLoading(false);
      });
  }, [user?._id]);

  // Socket para novas mensagens
  useEffect(() => {
    socket.connect();
    socket.on('connect', () => console.log('Socket conectado:', socket.id));

    socket.on('new-message', (message) => {
      setMessages((prev) => {
        const exists = prev.some((m) => String(m._id) === String(message._id));
        if (exists) return prev;
        return [...prev, message];
      });
    });

    return () => {
      socket.off('connect');
      socket.off('new-message');
      socket.disconnect();
    };
  }, []);

  // Carregar mensagens do match selecionado
  useEffect(() => {
    if (!selectedMatch?._id || !user?._id) return;

    socket.emit('join-match-room', { matchId: selectedMatch._id });
    setMessageLoading(true);

    fetch(
      `${API_BASE_URL}/api/chat/matches/${selectedMatch._id}/messages?userId=${user._id}`
    )
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao carregar mensagens');
        return res.json();
      })
      .then((data) => {
        setMessages(data);
        setMessageLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setMessages([]);
        setMessageLoading(false);
      });
  }, [selectedMatch?._id, user?._id]);

  // Helpers
  const getOtherUser = (match) => {
    if (!user?._id || !match) return null;
    return String(match.ownerId?._id) === String(user._id)
      ? match.interestedUserId
      : match.ownerId;
  };

  const getPreviewMedia = (clothing) => {
    if (!clothing) return [];
    if (clothing.media?.length > 0) {
      const images = clothing.media.filter((m) => m.type === 'image');
      return images.length ? images : clothing.media;
    }
    if (clothing.images?.length > 0)
      return clothing.images.map((url) => ({ type: 'image', url }));
    if (clothing.image) return [{ type: 'image', url: clothing.image }];
    return [];
  };

  const getOtherUserClothing = (match) => {
    if (!user?._id || !match) return null;
    return String(match.ownerId?._id) === String(user._id)
      ? match.interestedClothingId
      : match.ownerClothingId;
  };

  const getMyClothing = (match) => {
    if (!user?._id || !match) return null;
    return String(match.ownerId?._id) === String(user._id)
      ? match.ownerClothingId
      : match.interestedClothingId;
  };

  const renderClothingMedia = (clothing, altText) => {
    const media = getPreviewMedia(clothing);
    const first = media[0];
    if (!first?.url)
      return <div className="chat-item-placeholder">Sem imagem</div>;
    return first.type === 'video' ? (
      <video src={first.url} muted playsInline className="chat-item-video" />
    ) : (
      <img src={first.url} alt={altText} />
    );
  };

  const handleSendMessage = async () => {
    if (!selectedMatch?._id || !user?._id || !content.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: selectedMatch._id,
          senderId: user._id,
          content,
        }),
      });
      if (!res.ok) throw new Error('Erro ao enviar mensagem');
      setContent('');
    } catch (err) {
      console.log(err);
      alert('Erro ao enviar mensagem');
    }
  };

  if (loading)
    return <div className="matches-loading">Carregando matches...</div>;

  return (
    <main className="matches-container">
      <div className="matches-header">
        <h1>Matches</h1>
      </div>

      {matches.length === 0 ? (
        <div className="matches-empty">
          <p>Ainda não há matches.</p>
        </div>
      ) : (
        <div className="matches-layout">
          <aside className="matches-sidebar">
            {matches.map((match) => {
              if (!match.active) return null;
              const otherUser = getOtherUser(match);
              const isActive = String(selectedMatch?._id) === String(match._id);
              return (
                <button
                  key={match._id}
                  className={`match-list-item ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedMatch(match)}
                >
                  <strong>{otherUser?.name || 'Usuário'}</strong>
                  <span>{otherUser?.email || 'Email não disponível'}</span>
                </button>
              );
            })}
          </aside>

          {selectedMatch && selectedMatch.active && (
            <section className="chat-panel">
              <div className="chat-panel-header">
                <div className="chat-panel-user-info">
                  <div className="chat-panel-user-text">
                    <h2>{getOtherUser(selectedMatch)?.name || 'Conversa'}</h2>
                    <p>{getOtherUser(selectedMatch)?.email || ''}</p>
                  </div>

                  <button
                    type="button"
                    className="chat-panel-delete-btn"
                    onClick={() => handleToggleMatchStatus(selectedMatch._id)}
                    title="Desativar match"
                  >
                    <img
                      src={
                        currentTheme === 'dark'
                          ? '/trash_sem_fundo.png'
                          : '/trash_sem_fundo_dark.png'
                      }
                      alt="Excluir"
                    />
                  </button>
                </div>
              </div>

              <div className="chat-items-preview">
                {getOtherUserClothing(selectedMatch) && (
                  <div className="chat-item-preview">
                    <div className="chat-item-media">
                      {renderClothingMedia(
                        getOtherUserClothing(selectedMatch),
                        getOtherUserClothing(selectedMatch)?.title ||
                          'Peça do outro usuário'
                      )}
                    </div>
                    <div className="chat-item-info">
                      <h3>
                        {getOtherUserClothing(selectedMatch)?.title ||
                          'Peça sem título'}
                      </h3>
                      <p>Peça do outro usuário</p>
                    </div>
                  </div>
                )}
                {getMyClothing(selectedMatch) && (
                  <div className="chat-item-preview">
                    <div className="chat-item-media">
                      {renderClothingMedia(
                        getMyClothing(selectedMatch),
                        getMyClothing(selectedMatch)?.title || 'Sua peça'
                      )}
                    </div>
                    <div className="chat-item-info">
                      <h3>
                        {getMyClothing(selectedMatch)?.title ||
                          'Peça sem título'}
                      </h3>
                      <p>Sua peça no match</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="chat-messages">
                {messageLoading ? (
                  <div className="chat-empty">Carregando mensagens...</div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty">Nenhuma mensagem ainda.</div>
                ) : (
                  messages.map((msg) => {
                    const isMine =
                      String(msg.senderId?._id || msg.senderId) ===
                      String(user?._id);
                    return (
                      <div
                        key={msg._id}
                        className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}
                      >
                        <p>{msg.content}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="chat-input-area">
                <input
                  type="text"
                  placeholder="Digite sua mensagem"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                />
                <button
                  type="button"
                  className="chat-send-btn"
                  onClick={handleSendMessage}
                >
                  <img
                    src={
                      currentTheme === 'dark'
                        ? '/send_sem_fundo.png'
                        : '/send_sem_fundo_dark.png'
                    }
                    alt="Enviar"
                    className="chat-send-icon"
                  />
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

export default Matches;
