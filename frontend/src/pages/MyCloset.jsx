import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../services/api';
import './MyCloset.css';
import MediaCarousel from '../components/MediaCarousel';
import ClothingAttributes from '../components/ClothingAttributes';

function MyCloset() {
  const navigate = useNavigate();

  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'dark';

  const [clothes, setClothes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingEditImages, setUploadingEditImages] = useState(false);
  const [uploadingEditVideo, setUploadingEditVideo] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    size: '',
    category: '',
    style: '',
    media: [],
    condition: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');

    fetch(`${API_BASE_URL}/my-clothes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setClothes(data || []);
        setLoading(false);
      })
      .catch((error) => {
        console.log(error);
        setLoading(false);
      });
  }, []);

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

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Deseja excluir esta peça?');
    if (!confirmDelete) return;

    try {
      setDeletingId(id);

      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/clothes/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir peça');
      }

      setClothes((prevClothes) =>
        prevClothes.filter((item) => item._id !== id)
      );
    } catch (error) {
      console.log(error);
      alert('Não foi possível excluir a peça.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);

    setFormData({
      title: item.title || '',
      description: item.description || '',
      size: item.size || '',
      category: item.category || '',
      style: item.style || '',
      media: getPreviewMedia(item),
      condition: item.condition || '',
    });
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setUploadingEditImages(false);
    setUploadingEditVideo(false);

    setFormData({
      title: '',
      description: '',
      size: '',
      category: '',
      style: '',
      media: [],
      condition: '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditImagesUpload = async (files) => {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);
    const currentImages = formData.media.filter(
      (item) => item.type === 'image'
    );

    if (currentImages.length + selectedFiles.length > 5) {
      alert('Você pode manter no máximo 5 imagens por peça.');
      return;
    }

    try {
      setUploadingEditImages(true);

      const uploadedMedia = [];

      for (const file of selectedFiles) {
        const formDataCloud = new FormData();
        formDataCloud.append('file', file);
        formDataCloud.append('upload_preset', 'reveste_kids_upload');

        const response = await fetch(
          'https://api.cloudinary.com/v1_1/djgu3sdab/image/upload',
          {
            method: 'POST',
            body: formDataCloud,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error('Erro ao fazer upload das imagens');
        }

        uploadedMedia.push({
          type: 'image',
          url: data.secure_url,
        });
      }

      setFormData((prev) => ({
        ...prev,
        media: [...prev.media, ...uploadedMedia],
      }));
    } catch (error) {
      console.log(error);
      alert('Erro ao enviar imagens');
    } finally {
      setUploadingEditImages(false);
    }
  };

  const handleEditVideoUpload = async (file) => {
    if (!file) return;

    try {
      setUploadingEditVideo(true);

      const formDataCloud = new FormData();
      formDataCloud.append('file', file);
      formDataCloud.append('upload_preset', 'reveste_kids_upload');

      const response = await fetch(
        'https://api.cloudinary.com/v1_1/djgu3sdab/video/upload',
        {
          method: 'POST',
          body: formDataCloud,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error('Erro ao fazer upload do vídeo');
      }

      setFormData((prev) => {
        const withoutOldVideo = prev.media.filter(
          (item) => item.type !== 'video'
        );

        return {
          ...prev,
          media: [
            {
              type: 'video',
              url: data.secure_url,
            },
            ...withoutOldVideo,
          ],
        };
      });
    } catch (error) {
      console.log(error);
      alert('Erro ao enviar vídeo');
    } finally {
      setUploadingEditVideo(false);
    }
  };

  const removeEditMedia = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      media: prev.media.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editingItem) return;

    try {
      setSavingEdit(true);

      const token = localStorage.getItem('token');

      const response = await fetch(
        `${API_BASE_URL}/clothes/${editingItem._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao editar peça');
      }

      const updatedItem = data.clothing;

      setClothes((prevClothes) =>
        prevClothes.map((item) =>
          item._id === updatedItem._id ? updatedItem : item
        )
      );

      closeEditModal();
    } catch (error) {
      console.log(error);
      alert('Não foi possível atualizar a peça.');
    } finally {
      setSavingEdit(false);
    }
  };

  const imageCount = formData.media.filter(
    (item) => item.type === 'image'
  ).length;

  const hasVideo = formData.media.some((item) => item.type === 'video');

  return (
    <main className="closet-container">
      <div className="closet-header">
        <div>
          <h1>Closet</h1>
        </div>

        <button
          type="button"
          className="closet-add-btn"
          onClick={() => navigate('/add-clothing')}
        >
          + Nova peça
        </button>
      </div>

      {loading ? (
        <div className="closet-loading">Carregando seu closet...</div>
      ) : clothes.length === 0 ? (
        <div className="closet-empty">
          <h2>Seu closet ainda está vazio</h2>
          <p>Cadastre sua primeira peça para começar as trocas.</p>
          <button onClick={() => navigate('/add-clothing')}>
            Cadastrar peça
          </button>
        </div>
      ) : (
        <section className="closet-grid">
          {clothes.map((item) => {
            const previewMedia = getPreviewMedia(item);

            return (
              <article key={item._id} className="closet-card">
                <div className="closet-image-wrapper">
                  <MediaCarousel media={previewMedia} alt={item.title} />
                </div>

                <div className="closet-info">
                  <h2>{item.title}</h2>
                  <p>{item.description || 'Sem descrição'}</p>

                  <div className="closet-actions">
                    <button
                      type="button"
                      className="closet-edit-btn"
                      onClick={() => openEditModal(item)}
                    >
                      <img
                        src={
                          currentTheme === 'dark'
                            ? '/file-edit_sem_fundo.png'
                            : '/file-edit_sem_fundo_dark.png'
                        }
                        alt="Editar"
                      />
                    </button>

                    <button
                      type="button"
                      className="closet-delete-btn"
                      onClick={() => handleDelete(item._id)}
                      disabled={deletingId === item._id}
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
              </article>
            );
          })}
        </section>
      )}

      {editingItem && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div
            className="modal-content modal-content-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Editar peça</h2>

              <button
                type="button"
                className="modal-close-btn"
                onClick={closeEditModal}
              >
                ×
              </button>
            </div>

            <form className="modal-form" onSubmit={handleEditSubmit}>
              <input
                type="text"
                name="title"
                placeholder="Título"
                value={formData.title}
                onChange={handleChange}
                required
              />

              <ClothingAttributes values={formData} onChange={handleChange} />

              <textarea
                name="description"
                placeholder="Descrição"
                value={formData.description}
                onChange={handleChange}
                rows="4"
              />

              <div className="modal-media-section">
                <div className="modal-media-header">
                  <div>
                    <h3>Mídias da peça</h3>
                  </div>
                </div>

                <div className="modal-upload-actions">
                  <label className="modal-upload-btn">
                    <img
                      src={
                        currentTheme === 'dark'
                          ? '/add-image_sem_fundo.png'
                          : '/add-image_sem_fundo_dark.png'
                      }
                      alt="Adicionar fotos"
                      className="modal-upload-icon"
                    />

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleEditImagesUpload(e.target.files)}
                    />
                  </label>

                  <label className="modal-upload-btn secondary">
                    <img
                      src={
                        currentTheme === 'dark'
                          ? '/add-video_sem_fundo.png'
                          : '/add-video_sem_fundo_dark.png'
                      }
                      alt="Trocar vídeo"
                      className="modal-upload-icon"
                    />

                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleEditVideoUpload(e.target.files[0])}
                    />
                  </label>
                </div>

                <div className="modal-upload-helper">
                  <span>{imageCount}/5 fotos</span>
                  <span>{hasVideo ? 'Vídeo selecionado' : 'Sem vídeo'}</span>
                </div>

                {uploadingEditImages && (
                  <p className="modal-upload-status">Enviando imagens...</p>
                )}

                {uploadingEditVideo && (
                  <p className="modal-upload-status">Enviando vídeo...</p>
                )}

                {formData.media.length > 0 ? (
                  <div className="modal-preview-grid">
                    {formData.media.map((item, index) => (
                      <div
                        key={`${item.url}-${index}`}
                        className="modal-preview-item"
                      >
                        <button
                          type="button"
                          className="modal-remove-media-btn"
                          onClick={() => removeEditMedia(index)}
                        >
                          ×
                        </button>

                        {item.type === 'video' ? (
                          <video
                            src={item.url}
                            controls
                            className="modal-preview-video"
                          />
                        ) : (
                          <img src={item.url} alt={`Mídia ${index + 1}`} />
                        )}

                        <span className="modal-media-type-label">
                          {item.type === 'video' ? 'Vídeo' : 'Foto'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="modal-empty-media">
                    Nenhuma mídia cadastrada.
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={closeEditModal}
                >
                  <img
                    src={
                      currentTheme === 'dark'
                        ? '/cancel_sem_fundo.png'
                        : '/cancel_sem_fundo_dark.png'
                    }
                    alt="Cancelar"
                    className="modal-action-icon"
                  />
                </button>

                <button
                  type="submit"
                  className="modal-save-btn"
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <span className="modal-saving-text">...</span>
                  ) : (
                    <img
                      src={
                        currentTheme === 'dark'
                          ? '/send_sem_fundo.png'
                          : '/send_sem_fundo_dark.png'
                      }
                      alt="Salvar"
                      className="modal-action-icon"
                    />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default MyCloset;
