import React, { useEffect, useState, useCallback } from "react";
import classes from './Modal.module.css';

function Modal({ isOpen, onClose, children, showCloseButton = true, closeButtonAriaLabel = "Закрыть" }) {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = useCallback(() => {
        setIsClosing((prev) => {
            if (prev) return prev; // Предотвращаем множественные вызовы
            // Ждем завершения анимации перед вызовом onClose
            setTimeout(() => {
                setIsClosing(false);
                onClose();
            }, 300); // Длительность анимации slideDown
            return true;
        });
    }, [onClose]);

    // Блокируем скролл при открытом модальном окне
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setIsClosing(false);
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Закрытие по Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && !isClosing) {
                handleClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, isClosing, handleClose]);

    // Не рендерим, если модалка закрыта и не в процессе закрытия
    if (!isOpen && !isClosing) return null;

    return (
        <div 
            className={`${classes.modalOverlay} ${isClosing ? classes.modalOverlay_closing : ''}`} 
            onClick={handleClose}
        >
            <div 
                className={`${classes.modalContent} ${isClosing ? classes.modalContent_closing : ''}`} 
                onClick={(e) => e.stopPropagation()}
            >
                {showCloseButton && (
                    <button
                        type="button"
                        className={classes.closeButton}
                        onClick={handleClose}
                        aria-label={closeButtonAriaLabel}
                    >
                        ×
                    </button>
                )}
                {children}
            </div>
        </div>
    );
}

export default Modal;
