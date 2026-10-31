import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../services/api';
import './FeedTikTok.css';
import Footer from '../components/Footer';
import NotificationBell from '../components/NotificationBell';
import { sortClothingPieces } from '../utils/searchPieces';

function FeedTikTok({ theme, toggleTheme }) {
  const [clothes, setClothes] = useState([]);
  const [likedIds, setLikedIds] = useState([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState({});
  const [matchAlert, setMatchAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeClothingId, setActiveClothingId] = useState(null);
  const [settingsMenuKey, setSettingsMenuKey] = useState(null);
  const [likeCounts, setLikeCounts] = useState({});

  const cardRefs = useRef({});
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/clothes`)
      .then((res) => res.json())
      .then((data) => {
        const items = data || [];
        setClothes(items);

        const counts = {};

        items.forEach((item) => {
          counts[item._id] =
            item.likesCount ||
            item.likeCount ||
            item.likes?.length ||
            item.likedBy?.length ||
            0;
        });

        setLikeCounts(counts);
      })
      .catch((error) => console.log('Erro ao carregar feed:', error));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API_BASE_URL}/api/my-likes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const ids = data.map((item) => item.clothingId?._id || item.clothingId);
        setLikedIds(ids);
      })
      .catch((error) => console.log('Erro ao buscar likes:', error));
  }, []);

  const filteredClothes = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return sortClothingPieces(
      clothes.filter((item) => {
        const ownerId =
          typeof item.userId === 'object' ? item.userId?._id : item.userId;

        const isOwnClothing = String(ownerId) === String(user?._id);

        if (isOwnClothing) return false;

        const title = item.title?.toLowerCase() || '';
        const description = item.description?.toLowerCase() || '';

        if (!search) return true;

        return title.includes(search) || description.includes(search);
      })
    );
  }, [clothes, searchTerm, user]);

  const activeItem = useMemo(() => {
    return (
      filteredClothes.find(
        (item) => String(item._id) === String(activeClothingId)
      ) ||
      filteredClothes[0] ||
      null
    );
  }, [filteredClothes, activeClothingId]);

  useEffect(() => {
    if (filteredClothes.length > 0 && !activeClothingId) {
      setActiveClothingId(filteredClothes[0]._id);
    }
  }, [filteredClothes, activeClothingId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);

        if (visibleEntry?.target?.dataset?.id) {
          setActiveClothingId(visibleEntry.target.dataset.id);
        }
      },
      {
        threshold: 0.55,
      }
    );

    filteredClothes.forEach((item) => {
      const element = cardRefs.current[item._id];

      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [filteredClothes]);

  const generateTags = (item) => {
    const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();

    const tagRules = [
      'jeans',
      'camiseta',
      'calça',
      'bermuda',
      'vestido',
      'moletom',
      'blusa',
      'jaqueta',
      'casaco',
      'shorts',
      'azul',
      'preto',
      'branco',
      'rosa',
      'vermelho',
      'verde',
      'amarelo',
      'cinza',
      'novo',
      'nova',
      'seminovo',
      'seminova',
      'usado',
      'usada',
      'infantil',
      'bebê',
      'menino',
      'menina',
      'tamanho p',
      'tamanho m',
      'tamanho g',
      'tamanho gg',
      'p',
      'm',
      'g',
      'gg',
    ];

    const tags = tagRules.filter((tag) => text.includes(tag));
    return [...new Set(tags)].slice(0, 5);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getAllMedia = (item) => {
    if (item?.media?.length > 0) return item.media;

    if (item?.images?.length > 0) {
      return item.images.map((url) => ({ type: 'image', url }));
    }

    if (item?.image) return [{ type: 'image', url: item.image }];

    return [];
  };

  const getOwnerId = (item) => {
    if (!item?.userId) return null;

    if (typeof item.userId === 'object') {
      return item.userId._id;
    }
    return item.userId;
  };

  const getOwnerName = (item) => {
    if (!item?.userId) return 'Usuário desconhecido';
    return typeof item.userId === 'object'
      ? item.userId.name || item.userId.email.split('@')[0]
      : 'Usuário externo';
  };

  const handleNextMedia = (itemId, total) => {
    setCurrentMediaIndex((prev) => {
      const current = prev[itemId] || 0;

      return {
        ...prev,
        [itemId]: current === total - 1 ? 0 : current + 1,
      };
    });
  };

  const handlePrevMedia = (itemId, total) => {
    setCurrentMediaIndex((prev) => {
      const current = prev[itemId] || 0;

      return {
        ...prev,
        [itemId]: current === 0 ? total - 1 : current - 1,
      };
    });
  };

  const showToast = (title, message) => {
    setMatchAlert({ title, message });

    setTimeout(() => {
      setMatchAlert(null);
    }, 3000);
  };

  const handleLike = async (clothingId) => {
    const token = localStorage.getItem('token');

    if (!token) {
      alert('Você precisa estar logado para curtir.');
      return;
    }

    const alreadyLiked = likedIds.includes(clothingId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/like/${clothingId}`, {
        method: alreadyLiked ? 'DELETE' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar like');
      }

      if (alreadyLiked) {
        setLikedIds((prev) => prev.filter((id) => id !== clothingId));

        setLikeCounts((prev) => ({
          ...prev,
          [clothingId]: Math.max((prev[clothingId] || 0) - 1, 0),
        }));

        showToast(
          'Like removido',
          'A peça foi removida da sua lista de curtidas.'
        );

        return;
      }

      setLikedIds((prev) => [...prev, clothingId]);

      setLikeCounts((prev) => ({
        ...prev,
        [clothingId]: Math.min((prev[clothingId] || 0) + 1, 99),
      }));

      if (data.matchCreated) {
        showToast(
          'Deu match!',
          'Vocês demonstraram interesse em trocar peças. A conversa já está disponível em Matches.'
        );
      } else {
        showToast(
          'Like enviado!',
          'Se houver interesse mútuo, o match aparecerá na área de Matches.'
        );
      }
    } catch (error) {
      console.log(error);
      alert('Não foi possível atualizar o like.');
    }
  };

  const handleShareWhatsApp = (mediaUrl, item) => {
    if (!mediaUrl) {
      alert('Não há imagem ou vídeo para compartilhar.');
      return;
    }

    const title = item?.title || 'Peça do Reveste Kids';
    const text = `${title}\n\nVeja essa peça no Reveste Kids:\n${mediaUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(whatsappUrl, '_blank');
  };

  const renderSearchBox = (variant = '') => (
    <div className={`feed-search-box ${variant}`}>
      <input
        type="text"
        placeholder="Buscar peças..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {searchTerm && (
        <button
          type="button"
          className="feed-clear-search"
          onClick={() => setSearchTerm('')}
        >
          Limpar
        </button>
      )}
    </div>
  );

  const renderSettingsMenu = (menuKey) => {
    const isOpen = settingsMenuKey === menuKey;

    return (
      <div className="settings-menu-wrapper">
        <button
          type="button"
          className="tiktok-action-btn settings-action-btn"
          onClick={() => setSettingsMenuKey(isOpen ? null : menuKey)}
          title="Configurações"
        >
          <img
            src={
              theme === 'dark'
                ? '/setting_sem_fundo.png'
                : '/setting_sem_fundo_dark.png'
            }
            alt="Configurações"
            className="action-icon-img"
          />
        </button>
        <span>Config.</span>

        {isOpen && (
          <div className="settings-dropdown">
            <button
              type="button"
              className="settings-dropdown-item"
              onClick={() => {
                toggleTheme();
                setSettingsMenuKey(null);
              }}
            >
              <img
                src={theme === 'dark' ? './sun.png' : './moon.png'}
                alt="Alternar tema"
              />
              {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            </button>

            <button
              type="button"
              className="settings-dropdown-item danger"
              onClick={() => {
                setSettingsMenuKey(null);
                handleLogout();
              }}
            >
              <img
                src={
                  theme === 'dark'
                    ? '/logout_sem_fundo.png'
                    : '/logout_sem_fundo_dark.png'
                }
                alt="Sair"
              />
              Sair
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderActionButtons = (item, isLiked, isOwnClothing, variant = '') => {
    const menuKey = `${variant || 'default'}-${item?._id || 'navigation'}`;

    return (
      <div className={`tiktok-actions ${variant}`}>
        <NotificationBell />

        <button
          type="button"
          className="tiktok-action-btn"
          onClick={() => navigate('/closet')}
          title="Closet"
        >
          <img
            src={
              theme === 'dark'
                ? '/closet_sem_fundo.png'
                : '/closet_sem_fundo_dark.png'
            }
            alt="Closet"
            className="action-icon-img"
          />
        </button>
        <span>Closet</span>

        <button
          type="button"
          className="tiktok-action-btn"
          onClick={() => navigate('/matches')}
          title="Match"
        >
          <img
            src={
              theme === 'dark'
                ? '/match_sem_fundo.png'
                : '/match_sem_fundo_dark.png'
            }
            alt="Match"
            className="action-icon-img"
          />
        </button>
        <span>Match</span>

        <button
          type="button"
          className="tiktok-action-btn"
          onClick={() => navigate('/search-closets')}
          title="Buscar Closets"
        >
          <img
            src={
              theme === 'dark'
                ? '/addClothes_sem_fundo.png'
                : '/addClothes_sem_fundo_dark.png'
            }
            alt="Buscar Closets"
            className="action-icon-img"
          />
        </button>
        <span>Buscar</span>

        <button
          type="button"
          className="tiktok-action-btn"
          onClick={() => navigate('/search-pieces')}
          title="Buscar peças"
        >
          <img
            src={
              theme === 'dark'
                ? '/search_sem_fundo.png'
                : '/search_sem_fundo_dark.png'
            }
            alt="Buscar peças"
            className="action-icon-img"
          />
        </button>
        <span>Peças</span>

        {renderSettingsMenu(menuKey)}
      </div>
    );
  };

  const activeOwnerId = getOwnerId(activeItem);
  const isActiveLiked = activeItem ? likedIds.includes(activeItem._id) : false;
  const isActiveOwnClothing =
    activeItem && String(activeOwnerId) === String(user?._id);

  return (
    <>
      <div className="tiktok-layout">
        <aside className="tiktok-sidebar compact-brand">
          <img
            src={
              theme === 'dark'
                ? '/logo_sem_fundo.png'
                : '/logo-dark-sem-fundo.png'
            }
            alt="logo"
            className="tiktok-logo"
          />

          {renderSearchBox()}

          {renderActionButtons(
            activeItem,
            isActiveLiked,
            isActiveOwnClothing,
            'sidebar-actions'
          )}
        </aside>

        <div className="tiktok-mobile-header">
          <div className="tiktok-mobile-header-top">
            <img
              src={
                theme === 'dark'
                  ? '/logo_sem_fundo.png'
                  : '/logo-dark-sem-fundo.png'
              }
              alt="logo"
              className="tiktok-mobile-logo"
            />

            {renderActionButtons(
              activeItem,
              isActiveLiked,
              isActiveOwnClothing,
              'mobile-actions'
            )}
          </div>

          {renderSearchBox('mobile-search')}
        </div>

        <main className="tiktok-feed">
          {clothes.length === 0 ? (
            <section className="tiktok-empty">
              <h2>Nenhuma peça encontrada</h2>
              <p>Cadastre roupas para visualizar o feed.</p>
            </section>
          ) : filteredClothes.length === 0 ? (
            <section className="tiktok-empty">
              <h2>Nenhum resultado encontrado</h2>
              <p>Tente buscar por cor, tipo de peça, tamanho ou condição.</p>
            </section>
          ) : (
            filteredClothes.map((item) => {
              const mediaList = getAllMedia(item);
              const activeIndex = currentMediaIndex[item._id] || 0;
              const activeMedia = mediaList[activeIndex];

              const isLiked = likedIds.includes(item._id);
              const ownerId = getOwnerId(item);
              const isOwnClothing = String(ownerId) === String(user?._id);
              const tags = generateTags(item);

              return (
                <section
                  key={item._id}
                  data-id={item._id}
                  ref={(element) => {
                    cardRefs.current[item._id] = element;
                  }}
                  className="tiktok-card"
                  onMouseEnter={() => setActiveClothingId(item._id)}
                >
                  <div className="tiktok-info-card">
                    <p className="tiktok-owner-text">
                      Peça de <strong>{getOwnerName(item)}</strong>
                    </p>
                    <h2>{item.title || 'Peça sem título'}</h2>
                    <p>{item.description || 'Peça disponível para troca.'}</p>
                    {tags.length > 0 && (
                      <div className="tiktok-tags">
                        {tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="tiktok-media-frame">
                    {activeMedia?.type === 'video' ? (
                      <video
                        src={activeMedia.url}
                        className="tiktok-media"
                        loop
                        playsInline
                        controls
                      />
                    ) : activeMedia?.url ? (
                      <img
                        src={activeMedia.url}
                        alt={item.title || 'Peça'}
                        className="tiktok-media"
                      />
                    ) : (
                      <div className="tiktok-no-media">Sem mídia</div>
                    )}

                    {mediaList.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="media-arrow media-arrow-left"
                          onClick={() =>
                            handlePrevMedia(item._id, mediaList.length)
                          }
                        >
                          ‹
                        </button>

                        <button
                          type="button"
                          className="media-arrow media-arrow-right"
                          onClick={() =>
                            handleNextMedia(item._id, mediaList.length)
                          }
                        >
                          ›
                        </button>

                        <div className="media-dots">
                          {mediaList.map((_, index) => (
                            <span
                              key={index}
                              className={index === activeIndex ? 'active' : ''}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    <div className="media-floating-actions">
                      <button
                        type="button"
                        className={`media-action-btn ${isLiked ? 'liked' : ''}`}
                        onClick={() => handleLike(item._id)}
                        disabled={isOwnClothing}
                        title={
                          isOwnClothing
                            ? 'Você não pode curtir sua própria peça'
                            : 'Curtir'
                        }
                      >
                        <img
                          src={
                            theme === 'dark'
                              ? isLiked
                                ? '/like_sem_fundo.png'
                                : '/deslike_sem_fundo.png'
                              : isLiked
                                ? '/like_sem_fundo_dark.png'
                                : '/deslike_sem_fundo_dark.png'
                          }
                          alt={isLiked ? 'Curtido' : 'Curtir'}
                          className="media-action-icon"
                        />

                        <span className="like-count-badge">
                          {Math.min(likeCounts[item._id] || 0, 99)}
                        </span>
                      </button>

                      <button
                        type="button"
                        className="media-action-btn share"
                        onClick={() =>
                          handleShareWhatsApp(activeMedia?.url, item)
                        }
                        title="Compartilhar no WhatsApp"
                      >
                        <img
                          src={
                            theme === 'dark'
                              ? '/share_sem_fundo.png'
                              : '/share_sem_fundo_dark.png'
                          }
                          alt="Compartilhar"
                          className="media-action-icon"
                        />
                      </button>
                    </div>

                    {isLiked && <div className="tiktok-like-pop">❤️</div>}
                  </div>
                </section>
              );
            })
          )}
        </main>

        {matchAlert && (
          <div className="match-toast">
            <strong>{matchAlert.title}</strong>
            <p>{matchAlert.message}</p>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}

export default FeedTikTok;
