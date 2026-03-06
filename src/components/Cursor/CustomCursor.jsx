import { useEffect, useRef } from 'react';
import './CustomCursor.css';

/**
 * Кастомный "желейный" курсор с деформацией от скорости
 * 
 * Использование:
 * 1. Импортируйте компонент: import CustomCursor from './CustomCursor'
 * 2. Добавьте в корень приложения: <CustomCursor />
 * 3. Используйте data-атрибуты на элементах:
 *    - data-cursor="link" - увеличение на ссылках/кнопках
 *    - data-cursor="media" data-cursor-label="Play" - медиа режим с иконкой
 *    - data-cursor="slider" - стрелки влево/вправо
 *    - data-cursor="drag" - режим перетаскивания
 *    - data-cursor="hidden" - скрыть курсор
 */

// ==================== НАСТРОЙКИ ====================
const CONFIG = {
  // Размеры
  size: {
    default: 15,
    link: 50,
    media: 80,
    case: 70,
    filter: 60,
  },

  // Плавность движения (0 = плавнее, 1 = мгновенно)
  speed: 0.04,

  // Максимальное расстояние отставания для нормализации деформации (px)
  maxLag: 100,

  // Сила деформации (чем больше, тем сильнее растяжение)
  squeezeStrength: 0.3,

  // Плавность деформации (чем меньше, тем плавнее возврат к кругу)
  squeezeLerp: 0.10,
};

const CustomCursor = () => {
  const cursorRef = useRef(null);

  useEffect(() => {
    // Проверка на touch-устройство
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (hasCoarsePointer) return;

    // Проверка prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!cursorRef.current) return;

    const circle = cursorRef.current;
    const cursorInner = circle.querySelector('.cursor-inner');
    if (!cursorInner) return;

    // Отслеживание позиций мыши
    const mouse = { x: 0, y: 0 };
    const circlePos = { x: 0, y: 0 };

    // Матричные компоненты деформации (a, b=c, d)
    let curA = 1, curB = 0, curD = 1;

    // Флаг первой инициализации
    let isFirstMove = true;

    let rafId;

    // Обновление позиции мыши
    const updateMousePosition = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      if (isFirstMove) {
        circlePos.x = e.clientX;
        circlePos.y = e.clientY;
        isFirstMove = false;
      }
    };

    // Главный цикл анимации
    const tick = () => {
      // === ДВИЖЕНИЕ ===
      circlePos.x += (mouse.x - circlePos.x) * CONFIG.speed;
      circlePos.y += (mouse.y - circlePos.y) * CONFIG.speed;

      const translateTransform = `translate(${circlePos.x}px, ${circlePos.y}px)`;

      // === ДЕФОРМАЦИЯ В НАПРАВЛЕНИИ ДВИЖЕНИЯ (без вращения) ===
      let deformTransform = 'matrix(1, 0, 0, 1, 0, 0)';

      if (!prefersReducedMotion) {
        const lagX = mouse.x - circlePos.x;
        const lagY = mouse.y - circlePos.y;
        const lag = Math.sqrt(lagX * lagX + lagY * lagY);

        let tA = 1, tB = 0, tD = 1;

        if (lag > 1) {
          const normalizedLag = Math.min(lag / CONFIG.maxLag, 1);
          const stretch = 1 + normalizedLag * CONFIG.squeezeStrength;
          const compress = 1 / stretch;

          // Угол направления отставания
          const angle = Math.atan2(lagY, lagX);
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          // Матрица растяжения вдоль произвольной оси: R(-θ)·S·R(θ)
          tA = cos * cos * stretch + sin * sin * compress;
          tB = cos * sin * (stretch - compress);
          tD = sin * sin * stretch + cos * cos * compress;
        }

        curA += (tA - curA) * CONFIG.squeezeLerp;
        curB += (tB - curB) * CONFIG.squeezeLerp;
        curD += (tD - curD) * CONFIG.squeezeLerp;

        deformTransform = `matrix(${curA}, ${curB}, ${curB}, ${curD}, 0, 0)`;
      }

      // Применяем трансформации
      circle.style.transform = translateTransform;
      cursorInner.style.transform = `translate(-50%, -50%) ${deformTransform}`;
      cursorInner.style.transformOrigin = 'center center';

      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', updateMousePosition);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Обработка data-cursor атрибутов
  useEffect(() => {
    if (!cursorRef.current) return;

    const resetCursorState = () => {
      if (!cursorRef.current) return;
      cursorRef.current.setAttribute('data-mode', 'default');
      cursorRef.current.removeAttribute('data-label');
      cursorRef.current.removeAttribute('data-slider-direction');
    };

    const applyCursorFromElement = (cursorElement, clientX) => {
      if (!cursorRef.current || !cursorElement) return;
      const cursorMode = cursorElement.getAttribute('data-cursor');
      const cursorLabel = cursorElement.getAttribute('data-cursor-label');

      cursorRef.current.setAttribute('data-mode', cursorMode);

      if (cursorLabel && (cursorMode === 'media' || cursorMode === 'case')) {
        cursorRef.current.setAttribute('data-label', cursorLabel);
      } else {
        cursorRef.current.removeAttribute('data-label');
      }

      if (cursorMode === 'slider') {
        const rect = cursorElement.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const direction = relativeX < rect.width / 2 ? 'left' : 'right';
        cursorRef.current.setAttribute('data-slider-direction', direction);
      } else {
        cursorRef.current.removeAttribute('data-slider-direction');
      }
    };

    const lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const handlePointerOver = (e) => {
      const target = e.target;
      const cursorElement = target.closest('[data-cursor]');

      if (cursorElement && cursorRef.current) {
        applyCursorFromElement(cursorElement, e.clientX);
      }
    };

    const handlePointerOut = (e) => {
      const target = e.target;
      const cursorElement = target.closest('[data-cursor]');

      if (cursorElement && cursorRef.current) {
        resetCursorState();
      }
    };

    const handlePointerMove = (e) => {
      lastPointer.x = e.clientX;
      lastPointer.y = e.clientY;
    };

    const syncCursorWithPointer = () => {
      if (!cursorRef.current) return;
      const hoveredElement = document.elementFromPoint(lastPointer.x, lastPointer.y);
      const cursorElement = hoveredElement?.closest?.('[data-cursor]');
      if (cursorElement) {
        applyCursorFromElement(cursorElement, lastPointer.x);
      } else {
        resetCursorState();
      }
    };

    // При клике карточка может исчезнуть до pointerout (открывается модалка/меняется route).
    // Делаем проверку в следующем кадре и приводим режим курсора к фактическому элементу под мышью.
    const handlePointerUp = () => {
      requestAnimationFrame(syncCursorWithPointer);
    };

    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointerout', handlePointerOut);
    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerup', handlePointerUp, true);
    window.addEventListener('blur', resetCursorState);

    return () => {
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('blur', resetCursorState);
    };
  }, []);

  // Проверка на touch-устройство для рендера
  const hasCoarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  if (hasCoarsePointer) return null;

  return (
    <div
      ref={cursorRef}
      className="custom-cursor"
      data-mode="default"
    >
      <div className="cursor-inner">
        {/* Контент для режима media */}
        <div className="cursor-media-content">
          <svg className="cursor-play-icon" viewBox="0 0 24 24" fill="none">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
          <span className="cursor-label"></span>
        </div>

        {/* Контент для режима drag */}
        <div className="cursor-drag-content">
          <span className="cursor-label">Drag</span>
        </div>

        {/* Контент для режима slider */}
        <div className="cursor-slider-content">
          <svg className="cursor-arrow-icon" viewBox="0 0 24 24" fill="none">
            <path className="arrow-left" d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" />
            <path className="arrow-right" d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        {/* Контент для режима case */}
        <div className="cursor-case-content">
          <span className="cursor-label">Открыть <br /> кейс</span>
        </div>

        {/* Контент для режима filter */}
        <div className="cursor-filter-content">
          <span className="cursor-label">Настроить <br /> фильтр</span>
        </div>

        <div className="cursor-filter_blue-content">
          <span className="cursor-label">Настроить <br /> фильтр</span>
        </div>

        <div className="cursor-banner-content">
          <span className="cursor-label">Открыть <br /> баннер</span>
        </div>

        <div className="cursor-shop-content">
          <span className="cursor-label">Открыть в <br /> магазине</span>
        </div>

        <div className="cursor-new-content">
          <span className="cursor-label">Открыть <br /> новость</span>
        </div>

        <div className="cursor-card-content">
          <span className="cursor-label">Добавить в <br /> корзину</span>
        </div>

        <div className="cursor-scrollToCases-content">
          <span className="cursor-label">Перейти к <br /> кейсам</span>
        </div>
      </div>
    </div>
  );
};

export default CustomCursor;

