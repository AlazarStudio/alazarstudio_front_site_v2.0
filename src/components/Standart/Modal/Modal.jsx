import React, { useEffect, useState, useCallback, useRef, createContext } from "react";
import classes from './Modal.module.css';

export const ModalScrollContext = createContext(null);

const MODAL_LOCK_COUNT_KEY = "__alazarModalLockCount";

function lockPageScroll() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const lockCount = Number(window[MODAL_LOCK_COUNT_KEY] || 0);
    if (lockCount === 0) {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
    }

    window[MODAL_LOCK_COUNT_KEY] = lockCount + 1;
}

function unlockPageScroll() {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const lockCount = Number(window[MODAL_LOCK_COUNT_KEY] || 0);
    if (lockCount <= 1) {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        window[MODAL_LOCK_COUNT_KEY] = 0;
        return;
    }

    window[MODAL_LOCK_COUNT_KEY] = lockCount - 1;
}

function Modal({ isOpen, onClose, children, showCloseButton = true, closeButtonAriaLabel = "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", nested = false, compact = false, closeButtonWrapClassName }) {
    const [isClosing, setIsClosing] = useState(false);
    const scrollContainerRef = useRef(null);
    const isScrollLockedByThisModalRef = useRef(false);

    const handleClose = useCallback(() => {
        setIsClosing((prev) => {
            if (prev) return prev; // РџСЂРµРґРѕС‚РІСЂР°С‰Р°РµРј РјРЅРѕР¶РµСЃС‚РІРµРЅРЅС‹Рµ РІС‹Р·РѕРІС‹
            // Р–РґРµРј Р·Р°РІРµСЂС€РµРЅРёСЏ Р°РЅРёРјР°С†РёРё РїРµСЂРµРґ РІС‹Р·РѕРІРѕРј onClose
            setTimeout(() => {
                setIsClosing(false);
                onClose();
            }, 300); // Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ Р°РЅРёРјР°С†РёРё slideDown
            return true;
        });
    }, [onClose]);

    // Р‘Р»РѕРєРёСЂСѓРµРј СЃРєСЂРѕР»Р» РїСЂРё РѕС‚РєСЂС‹С‚РѕРј РјРѕРґР°Р»СЊРЅРѕРј РѕРєРЅРµ (С‚РѕР»СЊРєРѕ РґР»СЏ РєРѕСЂРЅРµРІРѕР№ РјРѕРґР°Р»РєРё, РІР»РѕР¶РµРЅРЅС‹Рµ РЅРµ С‚СЂРѕРіР°СЋС‚ body)
    useEffect(() => {
        if (nested) return;
        if (isOpen) {
            if (!isScrollLockedByThisModalRef.current) {
                lockPageScroll();
                isScrollLockedByThisModalRef.current = true;
            }
            setIsClosing(false);
        } else if (isScrollLockedByThisModalRef.current) {
            unlockPageScroll();
            isScrollLockedByThisModalRef.current = false;
        }

        return () => {
            if (isScrollLockedByThisModalRef.current) {
                unlockPageScroll();
                isScrollLockedByThisModalRef.current = false;
            }
        };
    }, [isOpen, nested]);

    // Р—Р°РєСЂС‹С‚РёРµ РїРѕ Escape
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

    // РќРµ СЂРµРЅРґРµСЂРёРј, РµСЃР»Рё РјРѕРґР°Р»РєР° Р·Р°РєСЂС‹С‚Р° Рё РЅРµ РІ РїСЂРѕС†РµСЃСЃРµ Р·Р°РєСЂС‹С‚РёСЏ
    if (!isOpen && !isClosing) return null;

    return (
        <div 
            className={`${classes.modalOverlay} ${nested ? classes.modalOverlay_nested : ''} ${compact ? classes.modalOverlay_compact : ''} ${isClosing ? classes.modalOverlay_closing : ''}`} 
            onClick={handleClose}
        >
            <div 
                className={`${classes.modalContent} ${compact ? classes.modalContent_compact : ''} ${isClosing ? classes.modalContent_closing : ''}`} 
                onClick={(e) => e.stopPropagation()}
                data-closing={isClosing || undefined}
            >
                {showCloseButton && (
                    <div className={compact ? classes.closeButtonWrap_compact : `${classes.closeButtonWrap} ${closeButtonWrapClassName || ''}`.trim()}>
                        <button
                            type="button"
                            className={compact ? classes.closeButton_compact : classes.closeButton}
                            onClick={handleClose}
                            aria-label={closeButtonAriaLabel}
                        >
                            <span className={classes.closeButtonIcon}>{"\u00D7"}</span>
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
