import React, { useEffect, useState, useCallback, useRef, createContext, useContext } from "react";
import classes from './Modal.module.css';

export const ModalScrollContext = createContext(null);

function Modal({ isOpen, onClose, children, showCloseButton = true, closeButtonAriaLabel = "Закрыть" }) {
    const [isClosing, setIsClosing] = useState(false);
    const scrollContainerRef = useRef(null);

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
                    <div className={classes.closeButtonWrap}>
                        <button
                            type="button"
                            className={classes.closeButton}
                            onClick={handleClose}
                            aria-label={closeButtonAriaLabel}
                        >
                            <span className={classes.closeButtonIcon}>×</span>
                        </button>
                    </div>
                )}
                <ModalScrollContext.Provider value={scrollContainerRef}>
                <div className={classes.modalBody} data-modal-scroll ref={scrollContainerRef}>
                    {children}
                </div>
                </ModalScrollContext.Provider>
            </div>
        </div>
    );
}

export default Modal;
