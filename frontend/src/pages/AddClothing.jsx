import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../services/api';
import './AddClothing.css';

function AddClothing() {
  const navigate = useNavigate();

  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'dark';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    size: '',
    category: '',
    media: [],
    condition: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/clothes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao cadastrar peça');
      }

      setMessage('Peça cadastrada com sucesso.');

      setFormData({
        title: '',
        description: '',
        size: '',
        category: '',
        media: [],
        condition: '',
      });

      setTimeout(() => {
        navigate('/closet');
      }, 900);
    } catch (err) {
      console.log(err);
      setError(err.message || 'Não foi possível cadastrar a peça.');
    } finally {
      setLoading(false);
    }
  };

  const handleImagesUpload = async (files) => {
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files);

    if (selectedFiles.length > 5) {
      alert('Você pode enviar no máximo 5 imagens.');
      return;
    }

    try {
      setUploadingImages(true);

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

      setFormData((prev) => {
        const existingVideos = prev.media.filter(
          (item) => item.type === 'video'
        );

        return {
          ...prev,
          media: [...existingVideos, ...uploadedMedia],
        };
      });
    } catch (error) {
      console.log(error);
      alert('Erro ao enviar imagens');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleVideoUpload = async (file) => {
    if (!file) return;

    try {
      setUploadingVideo(true);

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
        const existingImages = prev.media.filter(
          (item) => item.type === 'image'
        );

        return {
          ...prev,
          media: [
            {
              type: 'video',
              url: data.secure_url,
            },
            ...existingImages,
          ],
        };
      });
    } catch (error) {
      console.log(error);
      alert('Erro ao enviar vídeo');
    } finally {
      setUploadingVideo(false);
    }
  };

  const removeMedia = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      media: prev.media.filter((_, index) => index !== indexToRemove),
    }));
  };

  const firstMedia = formData.media[0];
  const imageCount = formData.media.filter(
    (item) => item.type === 'image'
  ).length;
  const hasVideo = formData.media.some((item) => item.type === 'video');

  return (
    <main className="add-page">
      <header className="add-page-header">
        <button
          type="button"
          className="add-back-btn"
          onClick={() => navigate('/closet')}
        >
          ← Voltar para o Closet
        </button>
      </header>

      <section className="add-content">
        <form className="add-form-card" onSubmit={handleSubmit}>
          <div className="form-section-title">
            <h2>Dados da peça</h2>
            <p>Preencha as informações principais do item.</p>
          </div>

          <input
            type="text"
            name="title"
            placeholder="Título da peça"
            value={formData.title}
            onChange={handleChange}
            required
          />

          <textarea
            name="description"
            placeholder="Descrição detalhada da peça. Inclua aqui informações como cor, tamanho, condição da peça, categoria, detalhes de uso, observações e tudo que ajude na troca."
            value={formData.description}
            onChange={handleChange}
            rows="6"
            required
          />

          <div className="upload-panel">
            <div className="form-section-title">
              <h2>Mídias da peça</h2>
              <p>Envie até 5 fotos e 1 vídeo para valorizar o anúncio.</p>
            </div>

            <div className="upload-actions">
              <label className="upload-icon-btn">
                <img
                  src={
                    currentTheme === 'dark'
                      ? '/add-image_sem_fundo.png'
                      : '/add-image_sem_fundo_dark.png'
                  }
                  alt="Adicionar fotos"
                  className="upload-icon"
                />

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImagesUpload(e.target.files)}
                />
              </label>

              <label className="upload-icon-btn">
                <img
                  src={
                    currentTheme === 'dark'
                      ? '/add-video_sem_fundo.png'
                      : '/add-video_sem_fundo_dark.png'
                  }
                  alt="Adicionar vídeo"
                  className="upload-icon"
                />

                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleVideoUpload(e.target.files[0])}
                />
              </label>
            </div>

            <div className="upload-helper">
              <span>{imageCount}/5 fotos selecionadas</span>
              <span>{hasVideo ? 'Vídeo selecionado' : 'Nenhum vídeo'}</span>
            </div>

            {uploadingImages && (
              <p className="upload-status">Enviando imagens...</p>
            )}

            {uploadingVideo && (
              <p className="upload-status">Enviando vídeo...</p>
            )}

            {formData.media.length > 0 && (
              <div className="add-preview-grid">
                {formData.media.map((item, index) => (
                  <div
                    key={`${item.url}-${index}`}
                    className="add-preview-item"
                  >
                    <button
                      type="button"
                      className="remove-media-btn"
                      onClick={() => removeMedia(index)}
                    >
                      ×
                    </button>

                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        controls
                        className="add-preview-video"
                      />
                    ) : (
                      <img src={item.url} alt={`Prévia ${index + 1}`} />
                    )}

                    <span className="media-type-label">
                      {item.type === 'video' ? 'Vídeo' : 'Foto'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="add-form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate('/closet')}
            >
              <img
                src={
                  currentTheme === 'dark'
                    ? '/cancel_sem_fundo.png'
                    : '/cancel_sem_fundo_dark.png'
                }
                alt="Cancelar"
                className="form-action-icon"
              />
            </button>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <span className="form-loading-text">...</span>
              ) : (
                <img
                  src={
                    currentTheme === 'dark'
                      ? '/add-document_sem_fundo.png'
                      : '/add-document_sem_fundo_dark.png'
                  }
                  alt="Cadastrar peça"
                  className="form-action-icon"
                />
              )}
            </button>
          </div>

          {message && <p className="add-message success">{message}</p>}
          {error && <p className="add-message error">{error}</p>}
        </form>

        <aside className="add-preview-card">
          <div className="preview-phone">
            <div className="preview-media">
              {firstMedia?.type === 'video' ? (
                <video src={firstMedia.url} autoPlay muted loop playsInline />
              ) : firstMedia?.url ? (
                <img src={firstMedia.url} alt="Prévia da peça" />
              ) : (
                <div className="preview-placeholder">
                  <img
                    src="/closet_sem_fundo.png"
                    alt="Preview"
                    className="preview-icon"
                  />
                  <p>Prévia da peça</p>
                </div>
              )}
            </div>

            <div className="preview-info">
              <h2>{formData.title || 'Título da peça'}</h2>
              <p>
                {formData.description ||
                  'A descrição aparecerá aqui conforme você preencher.'}
              </p>
            </div>
          </div>

          <div className="preview-note">
            <strong>Dica:</strong>
            <p>
              Fotos claras e descrição detalhada aumentam as chances de match.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default AddClothing;
