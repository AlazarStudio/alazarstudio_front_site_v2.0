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
    default: 25,
    link: 50,
    media: 80,
    case: 70,
    filter: 60,
  },

  // Плавность движения (0 = плавнее, 1 = мгновенно)
  speed: 0.25,

  // Множитель скорости для расчёта растяжения
  velocityMultiplier: 4,

  // Максимальная скорость для нормализации
  maxVelocity: 150,

  // Сила сжатия (0.5 = максимум)
  squeezeStrength: 0.5,

  // Порог скорости для поворота (чтобы избежать дрожания)
  rotationThreshold: 10,
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
    const previousMouse = { x: 0, y: 0 };
    const circlePos = { x: 0, y: 0 };

    // Отслеживание scale и rotation
    let currentScale = 0;
    let currentAngle = 0;

    // Флаг первой инициализации
    let isFirstMove = true;

    let rafId;

    // Обновление позиции мыши
    const updateMousePosition = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      // При первом движении мыши - телепортируем курсор в позицию мыши
      if (isFirstMove) {
        circlePos.x = e.clientX;
        circlePos.y = e.clientY;
        previousMouse.x = e.clientX;
        previousMouse.y = e.clientY;
        isFirstMove = false;
      }
    };

    // Главный цикл анимации
    const tick = () => {
      // === ДВИЖЕНИЕ ===
      // Плавное следование за мышью
      circlePos.x += (mouse.x - circlePos.x) * CONFIG.speed;
      circlePos.y += (mouse.y - circlePos.y) * CONFIG.speed;

      const translateTransform = `translate(${circlePos.x}px, ${circlePos.y}px)`;

      // === СЖАТИЕ (SQUEEZE) И УМЕНЬШЕНИЕ ===
      let scaleTransform = 'scale(1, 1)';
      let rotateTransform = 'rotate(0deg)';
      let overallScale = 1; // Общий масштаб шарика

      if (!prefersReducedMotion) {
        // 1. Вычисляем изменение позиции мыши
        const deltaMouseX = mouse.x - previousMouse.x;
        const deltaMouseY = mouse.y - previousMouse.y;

        // Обновляем предыдущую позицию
        previousMouse.x = mouse.x;
        previousMouse.y = mouse.y;

        // 2. Вычисляем скорость мыши (формула Пифагора)
        const mouseVelocity = Math.min(
          Math.sqrt(deltaMouseX ** 2 + deltaMouseY ** 2) * CONFIG.velocityMultiplier,
          CONFIG.maxVelocity
        );

        // 3. Конвертируем скорость в значение scale [0, 0.5] для растяжения
        const scaleValue = (mouseVelocity / CONFIG.maxVelocity) * CONFIG.squeezeStrength;

        // 4. Плавно обновляем текущий scale
        currentScale += (scaleValue - currentScale) * CONFIG.speed;

        // 5. Уменьшаем общий размер шарика при увеличении скорости
        // При максимальной скорости шарик уменьшается до 70% от исходного размера
        const shrinkAmount = (mouseVelocity / CONFIG.maxVelocity) * 0.3; // 0.3 = 30% уменьшения
        overallScale = 1 - shrinkAmount;

        // 6. Создаём трансформацию scale (растяжение + общее уменьшение)
        scaleTransform = `scale(${(1 + currentScale) * overallScale}, ${(1 - currentScale) * overallScale})`;

        // === ПОВОРОТ (ROTATE) ===
        // 1. Вычисляем угол с помощью atan2
        const angle = (Math.atan2(deltaMouseY, deltaMouseX) * 180) / Math.PI;

        // 2. Применяем порог для уменьшения дрожания при низкой скорости
        if (mouseVelocity > CONFIG.rotationThreshold) {
          currentAngle = angle;
        }

        // 3. Создаём трансформацию rotate
        rotateTransform = `rotate(${currentAngle}deg)`;
      }

      // Применяем трансформации
      // К родителю - только позиция
      circle.style.transform = translateTransform;

      // К внутреннему элементу - центрирование, поворот и растяжение
      // translate(-50%, -50%) центрирует элемент относительно позиции курсора
      cursorInner.style.transform = `translate(-50%, -50%) ${rotateTransform} ${scaleTransform}`;
      cursorInner.style.transformOrigin = 'center center';

      // Запрашиваем следующий кадр
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

    const handlePointerOver = (e) => {
      const target = e.target;
      const cursorElement = target.closest('[data-cursor]');

      if (cursorElement && cursorRef.current) {
        const cursorMode = cursorElement.getAttribute('data-cursor');
        const cursorLabel = cursorElement.getAttribute('data-cursor-label');

        cursorRef.current.setAttribute('data-mode', cursorMode);

        if (cursorLabel && (cursorMode === 'media' || cursorMode === 'case')) {
          cursorRef.current.setAttribute('data-label', cursorLabel);
        }

        // Для slider определяем направление
        if (cursorMode === 'slider') {
          const rect = cursorElement.getBoundingClientRect();
          const updateDirection = (clientX) => {
            const relativeX = clientX - rect.left;
            const direction = relativeX < rect.width / 2 ? 'left' : 'right';
            if (cursorRef.current) {
              cursorRef.current.setAttribute('data-slider-direction', direction);
            }
          };

          updateDirection(e.clientX);

          const handleMove = (moveE) => updateDirection(moveE.clientX);
          cursorElement.addEventListener('mousemove', handleMove);
          cursorElement.addEventListener('mouseleave', () => {
            cursorElement.removeEventListener('mousemove', handleMove);
          }, { once: true });
        }
      }
    };

    const handlePointerOut = (e) => {
      const target = e.target;
      const cursorElement = target.closest('[data-cursor]');

      if (cursorElement && cursorRef.current) {
        cursorRef.current.setAttribute('data-mode', 'default');
        cursorRef.current.removeAttribute('data-label');
      }
    };

    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointerout', handlePointerOut);

    return () => {
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointerout', handlePointerOut);
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
      </div>

      {/* Контент для режима case - вынесен наружу, чтобы не вращался */}
      <div className="cursor-case-content">
        <span className="cursor-label">Открыть <br /> кейс</span>
      </div>

      {/* Контент для режима filter - вынесен наружу, чтобы не вращался */}
      <div className="cursor-filter-content">
        {/* <img src="/filter.png" alt="" /> */}
        <span className="cursor-label">Настроить <br /> фильтр</span>
      </div>
      
      <div className="cursor-filter_blue-content">
        {/* <img src="/filter.png" alt="" /> */}
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
  );
};

export default CustomCursor;

