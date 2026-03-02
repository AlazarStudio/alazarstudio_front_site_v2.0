import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { getImageUrl } from '@/lib/api';
import styles from './NewsGalleryBlock.module.css';

export default function NewsGalleryBlock({ images = [], className = '' }) {
  const photos = (Array.isArray(images) ? images : []).filter(Boolean).map((url) => ({ src: getImageUrl(url) }));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [portalTarget, setPortalTarget] = useState(null);
  const swiperRef = useRef(null);

  const visiblePhotos = photos.slice(0, 5);
  const remainingCount = photos.length - 5;
  const showMoreButton = photos.length > 5;

  const openModal = (index) => {
    setActiveIndex(Math.min(index, photos.length - 1));
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleGalleryImageMove = (event) => {
    const container = event.currentTarget;
    const img = container.querySelector('img');
    if (!img) return;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const offsetX = (x - centerX) * 0.05;
    const offsetY = (y - centerY) * 0.05;
    img.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    img.style.transform = `scale(1.1) translate(${offsetX}px, ${offsetY}px)`;
  };

  const handleGalleryImageLeave = (event) => {
    const container = event.currentTarget;
    const img = container.querySelector('img');
    if (!img) return;
    img.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    img.style.transform = 'scale(1) translate(0, 0)';
  };

  useEffect(() => {
    if (isModalOpen && swiperRef.current) {
      swiperRef.current.swiper.slideToLoop(activeIndex);
    }
  }, [isModalOpen, activeIndex]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalTarget(document.body);
    }
  }, []);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeModal();
      } else if (swiperRef.current && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        if (event.key === 'ArrowLeft') swiperRef.current.swiper.slidePrev();
        else swiperRef.current.swiper.slideNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isModalOpen]);

  if (photos.length === 0) return null;

  const count = photos.length;
  const countClass = count === 1 ? styles.galleryCount1 : count === 2 ? styles.galleryCount2 : count === 3 ? styles.galleryCount3 : '';

  const renderGallery = () => {
    if (count === 1) {
      return (
        <div
          className={styles.galleryFull}
          onClick={() => openModal(0)}
          onMouseMove={handleGalleryImageMove}
          onMouseLeave={handleGalleryImageLeave}
        >
          <img src={photos[0]?.src} alt="" />
        </div>
      );
    }
    if (count === 2) {
      return (
        <>
          <div className={styles.galleryHalf} onClick={() => openModal(0)} onMouseMove={handleGalleryImageMove} onMouseLeave={handleGalleryImageLeave}>
            <img src={photos[0]?.src} alt="" />
          </div>
          <div className={styles.galleryHalf} onClick={() => openModal(1)} onMouseMove={handleGalleryImageMove} onMouseLeave={handleGalleryImageLeave}>
            <img src={photos[1]?.src} alt="" />
          </div>
        </>
      );
    }
    if (count === 3) {
      return (
        <>
          <div className={styles.galleryThirdLeft} onClick={() => openModal(0)} onMouseMove={handleGalleryImageMove} onMouseLeave={handleGalleryImageLeave}>
            <img src={photos[0]?.src} alt="" />
          </div>
          <div className={styles.galleryThirdRight}>
            <div className={styles.galleryThirdRightItem} onClick={() => openModal(1)} onMouseMove={handleGalleryImageMove} onMouseLeave={handleGalleryImageLeave}>
              <img src={photos[1]?.src} alt="" />
            </div>
            <div className={styles.galleryThirdRightItem} onClick={() => openModal(2)} onMouseMove={handleGalleryImageMove} onMouseLeave={handleGalleryImageLeave}>
              <img src={photos[2]?.src} alt="" />
            </div>
          </div>
        </>
      );
    }
    return (
      <>
        <div className={styles.galleryMain} onClick={() => openModal(0)} onMouseMove={handleGalleryImageMove} onMouseLeave={handleGalleryImageLeave}>
          <img src={photos[0]?.src} alt="" />
        </div>
        <div className={styles.galleryGrid}>
          <div className={styles.galleryGridRow}>
            {visiblePhotos.slice(1, 3).map((photo, index) => {
              const photoIndex = index + 1;
              return (
                <div
                  key={photoIndex}
                  className={styles.galleryItem}
                  onClick={() => openModal(photoIndex)}
                  onMouseMove={handleGalleryImageMove}
                  onMouseLeave={handleGalleryImageLeave}
                >
                  <img src={photo.src} alt="" />
                </div>
              );
            })}
          </div>
          <div className={styles.galleryGridRow}>
            {visiblePhotos.slice(3, 5).map((photo, index) => {
              const photoIndex = index + 3;
              const isLast = photoIndex === 4 && showMoreButton;
              return (
                <div
                  key={photoIndex}
                  className={`${styles.galleryItem} ${isLast ? styles.galleryItemLast : ''}`}
                  onClick={() => openModal(photoIndex)}
                  onMouseMove={handleGalleryImageMove}
                  onMouseLeave={handleGalleryImageLeave}
                >
                  <img src={photo.src} alt="" />
                  {isLast ? (
                    <div
                      className={styles.moreButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        openModal(5);
                      }}
                    >
                      <img src="/morePhoto.png" alt="" />
                      <span>Еще {remainingCount} фото</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <div className={`${styles.gallery} ${countClass} ${className}`}>
        {renderGallery()}
      </div>

      {portalTarget
        ? createPortal(
            <AnimatePresence>
              {isModalOpen ? (
                <motion.div
                  className={styles.galleryModal}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeModal}
                >
                  <motion.div
                    className={styles.galleryModalContent}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button type="button" className={styles.galleryModalClose} onClick={closeModal}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div className={styles.galleryModalMain}>
                      <Swiper
                        ref={swiperRef}
                        modules={[Navigation]}
                        navigation
                        loop
                        spaceBetween={20}
                        slidesPerView={1}
                        initialSlide={activeIndex}
                        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
                        className={styles.galleryModalSwiper}
                      >
                        {photos.map((photo, index) => (
                          <SwiperSlide key={index}>
                            <div className={styles.galleryModalSlide}>
                              <img src={photo.src} alt="" />
                            </div>
                          </SwiperSlide>
                        ))}
                      </Swiper>
                    </div>
                    <div className={styles.galleryModalThumbnails}>
                      {photos.map((photo, index) => (
                        <div
                          key={index}
                          className={`${styles.thumbnail} ${activeIndex === index ? styles.thumbnailActive : ''}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveIndex(index);
                            swiperRef.current?.swiper?.slideToLoop(index);
                          }}
                        >
                          <img src={photo.src} alt="" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            portalTarget
          )
        : null}
    </>
  );
}
