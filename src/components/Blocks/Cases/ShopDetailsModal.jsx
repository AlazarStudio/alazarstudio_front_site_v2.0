import React, { useEffect, useMemo, useState } from 'react';
import { getImageUrl } from '@/lib/api';
import {
  getShopPrice,
  getShopSpecs,
} from '@/components/Blocks/Cases/casesHelpers';
import classes from './ShopDetailsModal.module.css';

function normalizePrice(value) {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  const num = Number(digits);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const looksLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));
  if (!looksLikeJson) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function text(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    if ('text' in value) return text(value.text);
    if ('content' in value) return text(value.content);
    if ('value' in value) return text(value.value);
    if ('label' in value) return text(value.label);
  }
  return '';
}

function html(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof value.content === 'string') return value.content;
  if (value && typeof value === 'object' && typeof value.text === 'string') return value.text;
  return '';
}

function formatDateRu(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function extractAdditionalBlocks(raw) {
  const parsed = parseMaybeJson(raw);
  const list = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? Object.values(parsed) : []);
  return list
    .filter((block) => block && typeof block === 'object')
    .sort((a, b) => {
      const aOrder = Number.isFinite(Number(a?.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
      const bOrder = Number.isFinite(Number(b?.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
}

function pickField(record, keys) {
  for (const key of keys) {
    const value = parseMaybeJson(record?.[key]);
    const valueText = text(value);
    const valueHtml = html(value);
    if (valueHtml || valueText) return value;
  }
  return null;
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function prettifyKey(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (char) => char.toUpperCase());
}

function compactValue(value) {
  const parsed = parseMaybeJson(value);
  if (parsed == null || parsed === '') return '';
  if (typeof parsed === 'string') return stripHtml(parsed);
  if (typeof parsed === 'number' || typeof parsed === 'boolean') return String(parsed);
  if (Array.isArray(parsed)) return parsed.map((item) => text(item)).filter(Boolean).join(', ');
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.selectedItems)) {
      return parsed.selectedItems
        .map((item) => text(item?.label || item?.name || item?.id))
        .filter(Boolean)
        .join(', ');
    }
    return stripHtml(html(parsed) || text(parsed));
  }
  return '';
}

function extractSliderImages(additionalBlocks) {
  if (!Array.isArray(additionalBlocks)) return [];
  const rawImages = additionalBlocks.flatMap((block) => {
    const type = String(block?.type || '').toLowerCase();
    const data = parseMaybeJson(block?.data) || {};
    if (type !== 'gallery' && type !== 'carousel') return [];
    if (!Array.isArray(data?.images)) return [];
    return data.images
      .map((image) => (typeof image === 'string' ? image : image?.url || image?.value || ''))
      .filter(Boolean);
  });

  return rawImages.reduce((acc, url) => {
    const normalized = getImageUrl(url);
    if (normalized && !acc.includes(normalized)) acc.push(normalized);
    return acc;
  }, []);
}

function renderBlock(block, index) {
  const type = String(block?.type || '').toLowerCase();
  const data = parseMaybeJson(block?.data) || {};
  const label = typeof block?.label === 'string' ? block.label.trim() : '';
  const key = `${block?.id || block?.key || type || 'block'}-${index}`;

  if (type === 'image' || type === 'gallery' || type === 'carousel') return null;
  if (type === 'separator') return <hr key={key} className={classes.separator} />;

  const heading = text(label || data?.title || data?.label || data?.name);
  const contentHtml = html(data?.content ?? data);
  const contentText = text(data?.content ?? data?.text ?? data?.value ?? data);
  if (!heading && !contentHtml && !contentText) return null;

  if (type === 'multiselect') {
    const values = Array.isArray(data?.values) ? data.values : [];
    if (values.length === 0) return null;
    return (
      <section key={key} className={classes.blockCard}>
        {heading ? <h4 className={classes.blockTitle}>{heading}</h4> : null}
        <div className={classes.contentTags}>
          {values.map((value, valueIndex) => (
            <span key={`${key}-tag-${valueIndex}`} className={classes.contentTag}>{text(value)}</span>
          ))}
        </div>
      </section>
    );
  }

  if (type === 'list') {
    const items = Array.isArray(data?.items) ? data.items : [];
    if (items.length === 0) return null;
    return (
      <section key={key} className={classes.blockCard}>
        {heading ? <h4 className={classes.blockTitle}>{heading}</h4> : null}
        <ul className={classes.list}>
          {items.map((itemValue, itemIndex) => (
            <li key={`${key}-li-${itemIndex}`}>{text(itemValue?.text || itemValue)}</li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section key={key} className={classes.blockCard}>
      {heading ? <h4 className={classes.blockTitle}>{heading}</h4> : null}
      {contentHtml ? (
        <div className={classes.richText} dangerouslySetInnerHTML={{ __html: contentHtml }} />
      ) : (
        <p className={classes.blockParagraph}>{contentText || '—'}</p>
      )}
    </section>
  );
}

export default function ShopDetailsModal({ item, teamItems }) {
  if (!item) return null;

  const source = item.sourceRecord || {};
  const title = item.title || 'Товар';
  const shopDescriptionField = pickField(source, ['opisanie_dlya_magazina']);
  const shopDescriptionHtml = html(shopDescriptionField);
  const shopDescriptionText = text(shopDescriptionField);
  const specs = getShopSpecs(source);
  const price = normalizePrice(getShopPrice(source));
  const dateLabel = formatDateRu(source?.created_at || source?.createdAt || item.date);

  const additionalBlocks = useMemo(() => extractAdditionalBlocks(source?.additionalBlocks), [source]);
  const extraFields = useMemo(() => {
    const shownKeys = new Set([
      'id', '_id', 'created_at', 'createdAt', 'updated_at', 'updatedAt',
      'nazvanie', 'title', 'opisanie', 'description', 'text', 'content',
      'zadacha', 'task', 'reshenie', 'solution', 'additionalBlocks',
      'tsena', 'stoimost', 'price', 'prev_yu', 'prevyu', 'preview', 'logotip',
      'dlya_magazina', 'isPublished', 'tegi', 'komanda', 'prosmotry', 'opisanie_dlya_magazina',
    ]);
    return Object.entries(source || {})
      .filter(([key]) => !shownKeys.has(key))
      .map(([key, value]) => ({
        key,
        label: prettifyKey(key),
        value: compactValue(value),
      }))
      .filter((field) => field.value);
  }, [source]);

  const images = useMemo(() => extractSliderImages(additionalBlocks), [additionalBlocks]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageTransitioning, setIsImageTransitioning] = useState(false);
  const transitionTimerRef = React.useRef(null);
  const thumbButtonRefs = React.useRef([]);

  useEffect(() => {
    if (activeImageIndex > images.length - 1) setActiveImageIndex(0);
  }, [activeImageIndex, images.length]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const activeThumb = thumbButtonRefs.current[activeImageIndex];
    if (!activeThumb) return;
    activeThumb.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeImageIndex]);

  const switchSlide = (nextIndex) => {
    if (nextIndex === activeImageIndex || isImageTransitioning || images.length <= 1) return;

    setIsImageTransitioning(true);
    transitionTimerRef.current = window.setTimeout(() => {
      setActiveImageIndex(nextIndex);
      window.requestAnimationFrame(() => {
        setIsImageTransitioning(false);
      });
    }, 180);
  };

  const goPrev = () => {
    const nextIndex = activeImageIndex === 0 ? images.length - 1 : activeImageIndex - 1;
    switchSlide(nextIndex);
  };

  const goNext = () => {
    const nextIndex = activeImageIndex >= images.length - 1 ? 0 : activeImageIndex + 1;
    switchSlide(nextIndex);
  };
  const activeImage = images[activeImageIndex] || '/placeholder.jpg';

  const inquiryEmail = 'info@alazarstudio.ru';
  const subject = encodeURIComponent(`Заявка на товар: ${title}`);
  const body = encodeURIComponent(`Здравствуйте! Интересует товар "${title}".`);
  const mailtoHref = `mailto:${inquiryEmail}?subject=${subject}&body=${body}`;

  return (
    <div className={classes.modalInner}>
      <h2 className={classes.title}>{title}</h2>
      {dateLabel ? <div className={classes.subtitle}>Добавлено: {dateLabel}</div> : null}

      <div className={classes.top}>
        <div className={classes.galleryCol}>
          <div className={classes.mainImageWrap}>
            <img
              src={activeImage}
              alt={title}
              className={`${classes.mainImage} ${isImageTransitioning ? classes.mainImageHidden : classes.mainImageVisible}`}
            />
          </div>
          {images.length > 1 ? (
            <div className={classes.sliderControls}>
              <button type="button" className={classes.sliderNavButton} onClick={goPrev} aria-label="Предыдущий слайд">
                &#8249;
              </button>
              <div className={classes.thumbs}>
                {images.map((url, index) => (
                  <button
                    type="button"
                    key={`${url}-${index}`}
                    className={`${classes.thumbBtn} ${activeImageIndex === index ? classes.thumbBtnActive : ''}`}
                    onClick={() => switchSlide(index)}
                    aria-label={`Слайд ${index + 1}`}
                    ref={(el) => { thumbButtonRefs.current[index] = el; }}
                  >
                    <img src={url} alt="" className={classes.thumbImage} />
                  </button>
                ))}
              </div>
              <button type="button" className={classes.sliderNavButton} onClick={goNext} aria-label="Следующий слайд">
                &#8250;
              </button>
            </div>
          ) : null}
        </div>

        <aside className={classes.infoCol}>
          <div className={classes.priceBox}>
            <div className={classes.price}>{price > 0 ? `${price.toLocaleString('ru-RU')} ₽` : 'Цена по запросу'}</div>
            <div className={classes.metaRow}>
              <span className={classes.metaItem}>Оформление по заявке</span>
            </div>
            <a href={mailtoHref} className={classes.ctaBtn}>Оставить заявку</a>
          </div>

          
        </aside>
      </div>

      {(shopDescriptionHtml || shopDescriptionText) ? (
        <section className={classes.contentSection}>
          <h3 className={classes.sectionTitle}>Описание</h3>
          {shopDescriptionHtml ? (
            <div className={classes.sectionText} dangerouslySetInnerHTML={{ __html: shopDescriptionHtml }} />
          ) : (
            <p className={classes.blockParagraph}>{shopDescriptionText}</p>
          )}
        </section>
      ) : null}

      {additionalBlocks.length > 0 ? (
        <section className={classes.contentSection}>
          <div className={classes.contentStack}>
            {additionalBlocks.map((block, index) => renderBlock(block, index))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
