import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../services/api';
import MediaCarousel from '../components/MediaCarousel';
import Footer from '../components/Footer';
import './SearchClosets.css';

function SearchClosets() {
  const navigate = useNavigate();

  const [clothes, setClothes] = useState([]);
  const [likedIds, setLikedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState(null);

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
        setClothes(data || []);
        setLoading(false);
      })
      .catch((error) => {
        console.log('Erro ao carregar closets:', error);
        setLoading(false);
      });
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

  const getOwner = (item) => {
    if (!item?.userId) return null;

    if (typeof item.userId === 'object') {
      return item.userId;
    }

    return {
      _id: item.userId,
      name: 'Usuário',
      email: '',
    };
  };

  const getOwnerId = (item) => {
    const owner = getOwner(item);
    return owner?._id || null;
  };

  const getPreviewMedia = (item) => {
    if (item?.media && item.media.length > 0) {
      return item.media;
    }

    if (item?.images && item.images.length > 0) {
      return item.images.map((url) => ({ type: 'image', url }));
    }

    if (item?.image) {
      return [{ type: 'image', url: item.image }];
    }

    return [];
  };

  const closets = useMemo(() => {
    const grouped = new Map();

    clothes.forEach((item) => {
      const owner = getOwner(item);
      const ownerId = owner?._id;

      if (!ownerId) return;

      if (String(ownerId) === String(user?._id)) return;

      if (!grouped.has(ownerId)) {
        grouped.set(ownerId, {
          owner,
          items: [],
        });
      }

      grouped.get(ownerId).items.push(item);
    });

    return Array.from(grouped.values());
  }, [clothes, user?._id]);

  const filteredClosets = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return closets;

    return closets.filter((closet) => {
      const ownerName = closet.owner?.name?.toLowerCase() || '';
      const ownerEmail = closet.owner?.email?.toLowerCase() || '';

      const hasOwnerMatch =
        ownerName.includes(search) || ownerEmail.includes(search);

      const hasClothingMatch = closet.items.some((item) => {
        const title = item.title?.toLowerCase() || '';
        const description = item.description?.toLowerCase() || '';
        const category = item.category?.toLowerCase() || '';
        const size = item.size?.toLowerCase() || '';

        return (
          title.includes(search) ||
          description.includes(search) ||
          category.includes(search) ||
          size.includes(search)
        );
      });

      return hasOwnerMatch || hasClothingMatch;
    });
  }, [closets, searchTerm]);

  useEffect(() => {
    if (!selectedOwnerId && filteredClosets.length > 0) {
      setSelectedOwnerId(filteredClosets[0].owner._id);
    }
  }, [filteredClosets, selectedOwnerId]);

  const selectedCloset = useMemo(() => {
    return (
      filteredClosets.find(
        (closet) => String(closet.owner._id) === String(selectedOwnerId)
      ) ||
      filteredClosets[0] ||
      null
    );
  }, [filteredClosets, selectedOwnerId]);

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
        setMessage('Like removido da peça.');
        return;
      }

      setLikedIds((prev) => [...prev, clothingId]);

      if (data.matchCreated) {
        setMessage('Deu match! A conversa já está disponível em Matches.');
      } else {
        setMessage(
          'Like enviado! Se houver interesse mútuo, o match será criado.'
        );
      }
    } catch (error) {
      console.log(error);
      alert('Não foi possível atualizar o like.');
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <>
      <main className="search-closets-page">
        {/* BOTÃO HOME MOBILE */}
        <header className="search-closets-header">
          <div>
            <h1>Buscar Closets</h1>
          </div>
        </header>

        <section className="search-closets-content">
          <aside className="search-closets-list-panel">
            <div className="search-closets-input-box">
              <input
                type="text"
                placeholder="Buscar usuário ou peça..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')}>
                  Limpar
                </button>
              )}
            </div>

            {loading ? (
              <p className="search-closets-status">Carregando closets...</p>
            ) : filteredClosets.length === 0 ? (
              <p className="search-closets-status">Nenhum closet encontrado.</p>
            ) : (
              <div className="search-closets-users">
                {filteredClosets.map((closet) => {
                  const isActive =
                    String(selectedCloset?.owner?._id) ===
                    String(closet.owner._id);

                  return (
                    <button
                      key={closet.owner._id}
                      type="button"
                      className={`search-closets-user-card ${
                        isActive ? 'active' : ''
                      }`}
                      onClick={() => setSelectedOwnerId(closet.owner._id)}
                    >
                      <strong>
                        {closet.owner?.name ||
                          closet.owner?.email?.split('@')[0] ||
                          'Usuário'}
                      </strong>

                      <span>
                        {closet.owner?.email || 'Email não disponível'}
                      </span>

                      <small>
                        {closet.items.length}{' '}
                        {closet.items.length === 1 ? 'peça' : 'peças'}
                      </small>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="search-closets-items-panel">
            {!selectedCloset ? (
              <div className="search-closets-empty">
                Selecione um closet para visualizar as peças.
              </div>
            ) : (
              <>
                <div className="search-closets-selected-header">
                  <div>
                    <span>Closet de</span>

                    <h2>
                      {selectedCloset.owner?.name ||
                        selectedCloset.owner?.email?.split('@')[0] ||
                        'Usuário'}
                    </h2>
                  </div>

                  <p>
                    {selectedCloset.items.length}{' '}
                    {selectedCloset.items.length === 1
                      ? 'peça disponível'
                      : 'peças disponíveis'}
                  </p>
                </div>

                <div className="search-closets-grid">
                  {selectedCloset.items.map((item) => {
                    const previewMedia = getPreviewMedia(item);

                    const isLiked = likedIds.includes(item._id);

                    const isOwnClothing =
                      String(getOwnerId(item)) === String(user?._id);

                    return (
                      <article key={item._id} className="search-closets-card">
                        <div className="search-closets-media">
                          <MediaCarousel
                            media={previewMedia}
                            alt={item.title}
                          />
                        </div>

                        <div className="search-closets-info">
                          <h3>{item.title || 'Peça sem título'}</h3>

                          <p>{item.description || 'Sem descrição'}</p>

                          <div className="search-closets-tags">
                            {item.category && <span>{item.category}</span>}

                            {item.size && <span>Tam. {item.size}</span>}

                            {item.condition && <span>{item.condition}</span>}
                          </div>

                          <button
                            type="button"
                            className={`search-closets-like-btn ${
                              isLiked ? 'liked' : ''
                            }`}
                            disabled={isOwnClothing}
                            onClick={() => handleLike(item._id)}
                          >
                            <img
                              src={
                                isOwnClothing
                                  ? '/notLike_sem_fundo.png'
                                  : isLiked
                                    ? '/like_coracao_sem_fundo.png'
                                    : '/like_sem_fundo.png'
                              }
                              alt={
                                isOwnClothing
                                  ? 'Sua peça'
                                  : isLiked
                                    ? 'Curtido'
                                    : 'Curtir'
                              }
                            />

                            {isOwnClothing
                              ? 'Sua peça'
                              : isLiked
                                ? 'Curtido'
                                : 'Curtir peça'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </section>
      </main>

      {message && <div className="search-closets-toast">{message}</div>}
    </>
  );
}

export default SearchClosets;
