import React from 'react';
import Modal from '@/components/Standart/Modal/Modal.jsx';
import classes from './MaxShareModal.module.css';

const MAX_WEB_URL = 'https://web.max.ru/web';

export default function MaxShareModal({ isOpen, onClose, casePageUrl }) {
  const handleOpenMaxAndCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && casePageUrl) {
      navigator.clipboard.writeText(casePageUrl).catch(() => {});
    }
    if (typeof window !== 'undefined') {
      window.open(MAX_WEB_URL, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} nested compact closeButtonAriaLabel="Закрыть">
      <div className={classes.wrap}>
        <h2 className={classes.title}>Поделиться в MAX</h2>
        <p className={classes.text}>
          Поделиться ссылкой напрямую в мессенджере MAX пока нельзя. Вы можете перейти в MAX и отправить ссылку вручную — она будет скопирована в буфер обмена при нажатии на кнопку ниже.
        </p>
        <button type="button" className={classes.ctaBtn} onClick={handleOpenMaxAndCopy}>
          Скопировать ссылку и перейти в MAX
        </button>
        <button type="button" className={classes.closeLink} onClick={onClose}>
          Закрыть
        </button>
      </div>
    </Modal>
  );
}
