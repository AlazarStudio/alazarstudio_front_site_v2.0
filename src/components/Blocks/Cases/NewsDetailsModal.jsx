import React from 'react';
import { getImageUrl } from '@/lib/api';
import { getNewsAdditionalBlocks } from '@/components/Blocks/Cases/newsHelpers';
import NewsGalleryBlock from './NewsGalleryBlock';
import classes from './NewsDetailsModal.module.css';

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

function formatDateRu(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function html(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof value.content === 'string') return value.content;
  if (value && typeof value === 'object' && typeof value.text === 'string') return value.text;
  return '';
}

function text(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value && typeof value === 'object' && 'value' in value) return text(value.value);
  if (value && typeof value === 'object' && 'text' in value) return text(value.text);
  return '';
}

function renderBlock(block, index) {
  const type = String(block?.type || '').toLowerCase();
  const data = parseMaybeJson(block?.data) || {};
  const label = typeof block?.label === 'string' ? block.label.trim() : '';
  const key = `${block?.id || type || 'block'}-${index}`;

  if (type === 'separator') return <hr key={key} className={classes.separator} />;

  if (type === 'heading') {
    return (
      <section key={key} className={classes.section}>
        <h2 className={classes.heading}>{text(data?.text || label)}</h2>
      </section>
    );
  }

  if (type === 'text' || type === 'quote') {
    return (
      <section key={key} className={classes.section}>
        {label ? <h3 className={classes.blockTitle}>{label}</h3> : null}
        <div className={type === 'quote' ? classes.quote : classes.richText} dangerouslySetInnerHTML={{ __html: html(data) || '<p>—</p>' }} />
      </section>
    );
  }

  if (type === 'image') {
    const url = typeof data?.url === 'string' ? data.url : '';
    if (!url) return null;
    return (
      <section key={key} className={classes.imageSection}>
        <img src={getImageUrl(url)} alt={label || 'Изображение'} className={classes.image} />
      </section>
    );
  }

  if (type === 'gallery' || type === 'carousel') {
    const images = Array.isArray(data?.images) ? data.images.filter(Boolean) : [];
    if (images.length === 0) return null;
    return (
      <section key={key} className={classes.section}>
        {label ? <h3 className={classes.blockTitle}>{label}</h3> : null}
        <NewsGalleryBlock images={images} />
      </section>
    );
  }

  if (type === 'video') {
    const url = text(data?.url);
    if (!url) return null;
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
    const embedUrl = youtubeMatch ? `https://www.youtube.com/embed/${youtubeMatch[1]}` : '';
    return (
      <section key={key} className={classes.section}>
        {label ? <h3 className={classes.blockTitle}>{label}</h3> : null}
        {embedUrl ? (
          <div className={classes.videoWrap}>
            <iframe src={embedUrl} title="Видео" allowFullScreen />
          </div>
        ) : (
          <video className={classes.media} src={url} controls />
        )}
      </section>
    );
  }

  if (type === 'audio') {
    const url = text(data?.url);
    if (!url) return null;
    return (
      <section key={key} className={classes.section}>
        {label ? <h3 className={classes.blockTitle}>{label}</h3> : null}
        <audio className={classes.media} src={url} controls />
      </section>
    );
  }

  if (type === 'list') {
    const items = Array.isArray(data?.items) ? data.items : [];
    if (items.length === 0) return null;
    const ListTag = data?.ordered ? 'ol' : 'ul';
    return (
      <section key={key} className={classes.section}>
        {label ? <h3 className={classes.blockTitle}>{label}</h3> : null}
        <ListTag className={classes.list}>
          {items.map((item, itemIndex) => (
            <li key={`${key}-item-${itemIndex}`}>{text(item?.text || item)}</li>
          ))}
        </ListTag>
      </section>
    );
  }

  if (type === 'table') {
    const headers = Array.isArray(data?.headers) ? data.headers : [];
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    if (headers.length === 0 && rows.length === 0) return null;
    return (
      <section key={key} className={classes.section}>
        {label ? <h3 className={classes.blockTitle}>{label}</h3> : null}
        <div className={classes.tableWrap}>
          <table className={classes.table}>
            {headers.length > 0 ? (
              <thead>
                <tr>{headers.map((header, i) => <th key={`${key}-head-${i}`}>{text(header)}</th>)}</tr>
              </thead>
            ) : null}
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${key}-row-${rowIndex}`}>
                  {(Array.isArray(row) ? row : []).map((cell, cellIndex) => (
                    <td key={`${key}-cell-${rowIndex}-${cellIndex}`}>{text(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (type === 'accordion') {
    const items = Array.isArray(data?.items) ? data.items : [];
    if (items.length === 0) return null;
    return (
      <section key={key} className={classes.section}>
        {label ? <h3 className={classes.blockTitle}>{label}</h3> : null}
        <div className={classes.accordion}>
          {items.map((item, itemIndex) => (
            <details key={`${key}-acc-${itemIndex}`} className={classes.accordionItem}>
              <summary>{text(item?.title || item?.label || `Пункт ${itemIndex + 1}`)}</summary>
              <div className={classes.richText} dangerouslySetInnerHTML={{ __html: html(item?.content || item?.text) || '<p>—</p>' }} />
            </details>
          ))}
        </div>
      </section>
    );
  }

  if (type === 'tabs') {
    const tabs = Array.isArray(data?.tabs) ? data.tabs : [];
    if (tabs.length === 0) return null;
    return (
      <section key={key} className={classes.section}>
        {label ? <h3 className={classes.blockTitle}>{label}</h3> : null}
        <div className={classes.tabs}>
          {tabs.map((tab, tabIndex) => (
            <article key={`${key}-tab-${tabIndex}`} className={classes.tabItem}>
              <h4>{text(tab?.label || tab?.title || `Раздел ${tabIndex + 1}`)}</h4>
              <div className={classes.richText} dangerouslySetInnerHTML={{ __html: html(tab?.content || tab?.text) || '<p>—</p>' }} />
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (type === 'file') {
    const url = text(data?.url);
    if (!url) return null;
    return (
      <section key={key} className={classes.section}>
        <a className={classes.fileLink} href={getImageUrl(url)} target="_blank" rel="noreferrer">
          {text(data?.title) || label || 'Открыть файл'}
        </a>
      </section>
    );
  }

  if (type === 'button' || type === 'url' || type === 'contact') {
    const url = text(data?.url || data?.value);
    if (!url) return null;
    return (
      <section key={key} className={classes.section}>
        <a className={classes.link} href={url} target="_blank" rel="noreferrer">
          {text(data?.text) || label || url}
        </a>
      </section>
    );
  }

  if (type === 'multiselect') {
    const values = Array.isArray(data?.values) ? data.values : [];
    if (values.length === 0) return null;
    return (
      <section key={key} className={classes.section}>
        {label ? <h3 className={classes.blockTitle}>{label}</h3> : null}
        <div className={classes.tags}>
          {values.map((value, valueIndex) => (
            <span key={`${key}-tag-${valueIndex}`} className={classes.tag}>{text(value)}</span>
          ))}
        </div>
      </section>
    );
  }

  const primitiveValue = text(data?.value ?? data);
  if (primitiveValue) {
    return (
      <section key={key} className={classes.section}>
        {label ? <h3 className={classes.blockTitle}>{label}</h3> : null}
        <p className={classes.paragraph}>{primitiveValue}</p>
      </section>
    );
  }

  return null;
}

export default function NewsDetailsModal({ item }) {
  if (!item) return null;
  const source = item.sourceRecord || {};
  const title = item.title || 'Новость';
  const description = item.description || '';
  const dateLabel = formatDateRu(source?.data || source?.created_at || source?.createdAt || item.date);
  const blocks = getNewsAdditionalBlocks(source);

  return (
    <div className={classes.modalInner}>
      <header className={classes.hero}>
        <div className={classes.date}>{dateLabel || 'Без даты'}</div>
        <h1 className={classes.title}>{title}</h1>
        {description ? <p className={classes.description}>{description}</p> : null}
      </header>

      <div className={classes.content}>
        {blocks.length > 0
          ? blocks.map((block, index) => renderBlock(block, index))
          : (description ? <p className={classes.paragraph}>{description}</p> : <p className={classes.paragraph}>Контент новости пуст.</p>)}
      </div>
    </div>
  );
}
