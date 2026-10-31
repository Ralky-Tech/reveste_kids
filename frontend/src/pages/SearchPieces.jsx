import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../services/api';
import MediaCarousel from '../components/MediaCarousel';
import {
  filterClothingPieces,
  getClothingAttribute,
  getClothingFilterOptions,
} from '../utils/searchPieces';
import './SearchPieces.css';

const getOwner = (item) => {
  if (!item?.userId) return null;
  return typeof item.userId === 'object'
    ? item.userId
    : { _id: item.userId, name: 'Usuário' };
};

const getPreviewMedia = (item) => {
  if (item?.media?.length) return item.media;
  if (item?.images?.length) {
    return item.images.map((url) => ({ type: 'image', url }));
  }
  if (item?.image) return [{ type: 'image', url: item.image }];
  return [];
};

function SearchPieces() {
  const navigate = useNavigate();
  const [clothes, setClothes] = useState([]);
  const [likedIds, setLikedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    size: '',
    condition: '',
    style: '',
    sort: 'newest',
  });
  const [message, setMessage] = useState('');
  const [pendingIds, setPendingIds] = useState([]);

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(''), 3000);
    return () => clearTimeout(timeout);
  }, [message]);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/clothes`)
      .then((response) => {
        if (!response.ok)
          throw new Error('Não foi possível carregar as peças.');
        return response.json();
      })
      .then((data) => setClothes(Array.isArray(data) ? data : []))
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API_BASE_URL}/api/my-likes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok)
          throw new Error('Não foi possível carregar suas curtidas.');
        return response.json();
      })
      .then((data) => {
        const ids = data.map((item) => item.clothingId?._id || item.clothingId);
        setLikedIds(ids);
      })
      .catch((fetchError) =>
        console.error('Erro ao buscar likes:', fetchError)
      );
  }, []);

  const availablePieces = useMemo(
    () =>
      clothes.filter((item) => {
        if (!item) return false;
        const owner = getOwner(item);
        return !user?._id || String(owner?._id) !== String(user._id);
      }),
    [clothes, user?._id]
  );

  const filterOptions = useMemo(() => {
    return getClothingFilterOptions(availablePieces, searchTerm);
  }, [availablePieces, searchTerm]);

  const filteredPieces = useMemo(() => {
    return filterClothingPieces(availablePieces, searchTerm, filters);
  }, [availablePieces, filters, searchTerm]);

  const hasActiveFilters =
    Boolean(searchTerm) ||
    Boolean(filters.category) ||
    Boolean(filters.size) ||
    Boolean(filters.condition) ||
    Boolean(filters.style) ||
    filters.sort !== 'newest';

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      category: '',
      size: '',
      condition: '',
      style: '',
      sort: 'newest',
    });
  };

  const handleLike = async (clothingId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('Entre na sua conta para curtir uma peça.');
      return;
    }

    const alreadyLiked = likedIds.includes(clothingId);

    try {
      setPendingIds((previous) => [...previous, clothingId]);
      const response = await fetch(`${API_BASE_URL}/api/like/${clothingId}`, {
        method: alreadyLiked ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível atualizar a curtida.');
      }

      setLikedIds((previous) =>
        alreadyLiked
          ? previous.filter((id) => id !== clothingId)
          : [...previous, clothingId]
      );
      setMessage(
        data.matchCreated
          ? 'Deu match! A conversa já está disponível em Matches.'
          : alreadyLiked
            ? 'Curtida removida.'
            : 'Curtida enviada!'
      );
    } catch (likeError) {
      setMessage(likeError.message);
    } finally {
      setPendingIds((previous) => previous.filter((id) => id !== clothingId));
    }
  };

  return (
    <>
      <main className="search-pieces-page">
        <header className="search-pieces-header">
          <div>
            <h1>Buscar peças</h1>
            <p>Encontre roupas por nome, categoria, tamanho ou estilo.</p>
          </div>
          <button
            type="button"
            className="search-pieces-back"
            onClick={() => navigate('/feed')}
          >
            Voltar ao feed
          </button>
        </header>

        <section
          className="search-pieces-filters"
          aria-label="Filtros de busca"
        >
          <input
            type="search"
            aria-label="Buscar peças por texto"
            placeholder="Buscar por nome, descrição ou usuário..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setFilters((previous) => ({
                ...previous,
                category: '',
                size: '',
                condition: '',
                style: '',
              }));
            }}
          />
          {[
            ['category', 'Categoria', filterOptions.category],
            ['size', 'Tamanho', filterOptions.size],
            ['condition', 'Condição', filterOptions.condition],
            ['style', 'Estilo', filterOptions.style],
          ].map(([key, label, options]) => (
            <select
              key={key}
              aria-label={`Filtrar por ${label.toLowerCase()}`}
              value={filters[key]}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  [key]: event.target.value,
                }))
              }
            >
              <option value="">{label} (todas)</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ))}
          <select
            aria-label="Ordenar resultados"
            value={filters.sort}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                sort: event.target.value,
              }))
            }
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigas</option>
            <option value="title">Nome A-Z</option>
          </select>
        </section>

        <div className="search-pieces-results-header">
          <p aria-live="polite">{filteredPieces.length} resultado(s)</p>
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters}>
              Limpar filtros
            </button>
          )}
        </div>

        {loading ? (
          <p className="search-pieces-status">Carregando peças...</p>
        ) : error ? (
          <p className="search-pieces-status" role="alert">
            {error}
          </p>
        ) : filteredPieces.length === 0 ? (
          <p className="search-pieces-status">Nenhuma peça encontrada.</p>
        ) : (
          <section
            className="search-pieces-grid"
            aria-label="Peças encontradas"
          >
            {filteredPieces.map((item) => {
              const owner = getOwner(item);
              const isLiked = likedIds.includes(item._id);

              return (
                <article className="search-pieces-card" key={item._id}>
                  <div className="search-pieces-media">
                    <MediaCarousel
                      media={getPreviewMedia(item)}
                      alt={item.title || 'Peça'}
                    />
                  </div>
                  <div className="search-pieces-info">
                    <h2>{item.title || 'Peça sem título'}</h2>
                    <p className="search-pieces-owner">
                      Closet de{' '}
                      {owner?.name || owner?.email?.split('@')[0] || 'Usuário'}
                    </p>
                    <p>{item.description || 'Sem descrição'}</p>
                    <div className="search-pieces-tags">
                      {getClothingAttribute(item, 'category') && (
                        <span>{getClothingAttribute(item, 'category')}</span>
                      )}
                      {getClothingAttribute(item, 'size') && (
                        <span>Tam. {getClothingAttribute(item, 'size')}</span>
                      )}
                      {getClothingAttribute(item, 'condition') && (
                        <span>{getClothingAttribute(item, 'condition')}</span>
                      )}
                      {getClothingAttribute(item, 'style') && (
                        <span>{getClothingAttribute(item, 'style')}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`search-pieces-like ${isLiked ? 'liked' : ''}`}
                      disabled={pendingIds.includes(item._id)}
                      onClick={() => handleLike(item._id)}
                    >
                      <img
                        src={
                          isLiked
                            ? '/like_coracao_sem_fundo.png'
                            : '/like_sem_fundo.png'
                        }
                        alt=""
                      />
                      {isLiked ? 'Curtido' : 'Curtir peça'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
      {message && (
        <div className="search-pieces-toast" role="status">
          {message}
        </div>
      )}
    </>
  );
}

export default SearchPieces;
