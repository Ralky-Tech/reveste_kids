import { useState } from 'react';
import './MediaCarousel.css';

function MediaCarousel({ media = [], alt = 'Mídia' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  if (!media || media.length === 0) {
    return (
      <div className="carousel-placeholder">
        <span>Sem mídia</span>
      </div>
    );
  }

  const currentItem = media[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;

    const distance = touchStartX - touchEndX;

    if (distance > 50) goToNext();
    if (distance < -50) goToPrevious();

    setTouchStartX(0);
    setTouchEndX(0);
  };

  return (
    <div
      className="carousel"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {currentItem.type === 'video' ? (
        <video
          src={currentItem.url}
          className="carousel-image"
          controls
          muted
          playsInline
        />
      ) : (
        <img
          src={currentItem.url}
          alt={`${alt} ${currentIndex + 1}`}
          className="carousel-image"
        />
      )}

      {media.length > 1 && (
        <>
          <button
            type="button"
            className="carousel-btn prev"
            onClick={goToPrevious}
          >
            ‹
          </button>

          <button
            type="button"
            className="carousel-btn next"
            onClick={goToNext}
          >
            ›
          </button>

          <div className="carousel-dots">
            {media.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default MediaCarousel;
