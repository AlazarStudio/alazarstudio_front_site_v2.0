'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

/**
 * Загружает изображение по URL (в т.ч. object URL).
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Возвращает blob обрезанной области изображения.
 * @param {string} imageSrc - URL изображения
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop - область в пикселях
 * @returns {Promise<Blob>}
 */
function toPixelCrop(crop, imageWidth, imageHeight) {
  if (!crop) return null;
  if (crop.unit === '%') {
    return {
      x: Math.round((crop.x / 100) * imageWidth),
      y: Math.round((crop.y / 100) * imageHeight),
      width: Math.round((crop.width / 100) * imageWidth),
      height: Math.round((crop.height / 100) * imageHeight),
    };
  }
  return {
    x: Math.round(crop.x),
    y: Math.round(crop.y),
    width: Math.round(crop.width),
    height: Math.round(crop.height),
  };
}

export async function getCroppedImageBlob(imageSrc, pixelCrop) {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2d not available');
  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png',
      1.0
    );
  });
}

const CROP_CONTAINER_MAX_HEIGHT = '70vh';
const DEFAULT_ASPECT = 1;
const ASPECT_PRESETS = [
  { key: '1:1', label: '1:1', aspect: 1 },
  { key: '4:3', label: '4:3', aspect: 4 / 3 },
  { key: '3:4', label: '3:4', aspect: 3 / 4 },
  { key: '16:9', label: '16:9', aspect: 16 / 9 },
  { key: '9:16', label: '9:16', aspect: 9 / 16 },
  { key: '21:9', label: '21:9', aspect: 21 / 9 },
  { key: '2:3', label: '2:3', aspect: 2 / 3 },
];

function createInitialCrop(mediaWidth, mediaHeight, aspect, locked) {
  if (!mediaWidth || !mediaHeight) return undefined;

  if (locked) {
    return centerCrop(
      makeAspectCrop(
        { unit: '%', width: 90 },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  }

  return {
    unit: '%',
    x: 5,
    y: 5,
    width: 90,
    height: 90,
  };
}

export default function ImageCropModal({
  open,
  imageSrc,
  src,
  title = 'Обрезка изображения',
  onComplete,
  onCropComplete,
  onCancel,
  onClose,
  aspect = DEFAULT_ASPECT,
}) {
  // Обратная совместимость со старым API модалки: src/onCropComplete/onClose.
  const resolvedImageSrc = imageSrc || src || '';
  const resolvedOnComplete = onComplete || onCropComplete;
  const resolvedOnCancel = onCancel || onClose;
  const resolvedOpen = typeof open === 'boolean' ? open : Boolean(resolvedImageSrc);
  const resolvedAspect = useMemo(
    () => (typeof aspect === 'number' && Number.isFinite(aspect) && aspect > 0 ? aspect : DEFAULT_ASPECT),
    [aspect]
  );

  const imageRef = useRef(null);
  const [crop, setCrop] = useState();
  const [isAspectLocked, setIsAspectLocked] = useState(true);
  const [selectedAspect, setSelectedAspect] = useState(resolvedAspect);
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });

  // Сбрасываем состояние при открытии/закрытии модалки
  useEffect(() => {
    if (resolvedOpen && resolvedImageSrc) {
      setIsAspectLocked(true);
      setSelectedAspect(resolvedAspect);
      setMediaSize({ width: 0, height: 0 });
      setCrop(undefined);
    }
  }, [resolvedOpen, resolvedImageSrc, resolvedAspect]);

  const handleImageLoad = useCallback((e) => {
    const { naturalWidth, naturalHeight, width, height } = e.currentTarget;
    imageRef.current = e.currentTarget;
    const nextWidth = naturalWidth || width || 0;
    const nextHeight = naturalHeight || height || 0;
    setMediaSize({ width: nextWidth, height: nextHeight });
    setCrop(createInitialCrop(nextWidth, nextHeight, selectedAspect, isAspectLocked));
  }, [selectedAspect, isAspectLocked]);

  const handleAspectLockChange = useCallback((nextLocked) => {
    setIsAspectLocked(nextLocked);
    setCrop((prevCrop) => {
      if (!mediaSize.width || !mediaSize.height) return prevCrop;
      if (!nextLocked) return prevCrop || createInitialCrop(mediaSize.width, mediaSize.height, selectedAspect, false);
      const basisCrop = prevCrop?.width && prevCrop?.height
        ? { unit: '%', width: Math.max(20, Math.min(95, prevCrop.width)) }
        : { unit: '%', width: 90 };
      return centerCrop(
        makeAspectCrop(basisCrop, selectedAspect, mediaSize.width, mediaSize.height),
        mediaSize.width,
        mediaSize.height
      );
    });
  }, [mediaSize.height, mediaSize.width, selectedAspect]);

  const handlePresetSelect = useCallback((nextAspect) => {
    setSelectedAspect(nextAspect);
    if (!isAspectLocked || !mediaSize.width || !mediaSize.height) return;
    setCrop((prevCrop) => {
      const basisCrop = prevCrop?.width && prevCrop?.height
        ? { unit: '%', width: Math.max(20, Math.min(95, prevCrop.width)) }
        : { unit: '%', width: 90 };
      return centerCrop(
        makeAspectCrop(basisCrop, nextAspect, mediaSize.width, mediaSize.height),
        mediaSize.width,
        mediaSize.height
      );
    });
  }, [isAspectLocked, mediaSize.height, mediaSize.width]);

  const handleApply = useCallback(async () => {
    if (!resolvedImageSrc || !imageRef.current || !crop?.width || !crop?.height) return;
    try {
      const pixelCrop = toPixelCrop(crop, imageRef.current.naturalWidth, imageRef.current.naturalHeight);
      if (!pixelCrop || !pixelCrop.width || !pixelCrop.height) return;
      const blob = await getCroppedImageBlob(resolvedImageSrc, pixelCrop);
      resolvedOnComplete?.(blob);
    } catch (err) {
      console.error('Ошибка обрезки:', err);
    }
  }, [crop, resolvedImageSrc, resolvedOnComplete]);

  if (!resolvedOpen || !resolvedImageSrc) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && resolvedOnCancel?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      <div
        className={styles.dialog}
        style={{ maxWidth: 980, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 id="crop-modal-title" className={styles.title}>{title}</h2>
          <button
            type="button"
            onClick={resolvedOnCancel}
            className={styles.modalClose}
            aria-label="Закрыть"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>
        <div className={styles.body} style={{ overflowY: 'auto' }}>
          <p className={styles.message} style={{ marginBottom: 12 }}>
            Выберите нужную область изображения. Затем нажмите «Применить».
          </p>
          <div className={styles.cropWorkspace}>
            <div className={styles.cropSidebar}>
              <div className={styles.cropControlRow}>
                <div className={styles.cropModeSwitch} role="group" aria-label="Режим пропорций">
                  <button
                    type="button"
                    className={`${styles.cropModeSwitchBtn} ${isAspectLocked ? styles.cropModeSwitchBtnActive : ''}`}
                    onClick={() => handleAspectLockChange(true)}
                  >
                    Фиксированный
                  </button>
                  <button
                    type="button"
                    className={`${styles.cropModeSwitchBtn} ${!isAspectLocked ? styles.cropModeSwitchBtnActive : ''}`}
                    onClick={() => handleAspectLockChange(false)}
                  >
                    Свободный
                  </button>
                </div>
                <div className={styles.cropHint}>
                  {isAspectLocked ? `Пропорция: ${ASPECT_PRESETS.find((p) => Math.abs(p.aspect - selectedAspect) < 0.001)?.label || `${Math.round(selectedAspect * 100) / 100}:1`}` : 'Пропорции отключены'}
                </div>
              </div>
              <div className={styles.cropPresetRow}>
                {ASPECT_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePresetSelect(preset.aspect)}
                    className={`${styles.cropPresetBtn} ${Math.abs(selectedAspect - preset.aspect) < 0.001 ? styles.cropPresetBtnActive : ''}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div
              style={{
                position: 'relative',
                width: '100%',
                minHeight: 260,
                maxHeight: CROP_CONTAINER_MAX_HEIGHT,
                background: '#f1f5f9',
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
              }}
            >
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                aspect={isAspectLocked ? selectedAspect : undefined}
                keepSelection
                minWidth={40}
                minHeight={40}
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              >
                <img
                  src={resolvedImageSrc}
                  alt="Обрезка"
                  onLoad={handleImageLoad}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: `calc(${CROP_CONTAINER_MAX_HEIGHT} - 16px)`,
                    width: 'auto',
                    height: 'auto',
                    userSelect: 'none',
                  }}
                />
              </ReactCrop>
            </div>
          </div>
          <div className={styles.actions} style={{ marginTop: 20 }}>
            <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={resolvedOnCancel}>
              Отмена
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnConfirm}`} onClick={handleApply}>
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
