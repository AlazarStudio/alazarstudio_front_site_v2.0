import CustomCursor from './CustomCursor';
// import './ExampleUsage.css';

/**
 * Пример использования кастомного курсора
 * Скопируйте этот код в ваш проект и адаптируйте под свои нужды
 */

function ExampleUsage() {
  return (
    <>
      {/* 1. Добавьте компонент курсора один раз в корень */}
      <CustomCursor />
      
      {/* 2. Используйте data-cursor на любых элементах */}
      <div className="example-page">
        
        <header>
          <h1>Пример использования курсора</h1>
        </header>

        {/* Навигация с link режимом */}
        <nav className="navigation">
          <a href="#" data-cursor="link">Главная</a>
          <a href="#" data-cursor="link">О нас</a>
          <a href="#" data-cursor="link">Услуги</a>
          <a href="#" data-cursor="link">Контакты</a>
        </nav>

        {/* Кнопки */}
        <section className="buttons-section">
          <h2>Кнопки</h2>
          <button data-cursor="link" className="btn">
            Нажми меня
          </button>
          <button data-cursor="link" className="btn btn-secondary">
            Ещё кнопка
          </button>
        </section>

        {/* Медиа контент */}
        <section className="media-section">
          <h2>Медиа контент</h2>
          <div className="media-grid">
            <div 
              className="media-card" 
              data-cursor="media" 
              data-cursor-label="Showreel"
            >
              <div className="media-placeholder">
                <span>▶</span>
                <p>Видео 1</p>
              </div>
            </div>
            <div 
              className="media-card" 
              data-cursor="media" 
              data-cursor-label="Play"
            >
              <div className="media-placeholder">
                <span>▶</span>
                <p>Видео 2</p>
              </div>
            </div>
          </div>
        </section>

        {/* Слайдер */}
        <section className="slider-section">
          <h2>Слайдер</h2>
          <div className="slider" data-cursor="slider">
            <div className="slider-content">
              <p>Двигайте мышь влево-вправо</p>
            </div>
          </div>
        </section>

        {/* Drag элемент */}
        <section className="drag-section">
          <h2>Перетаскивание</h2>
          <div className="draggable" data-cursor="drag">
            <p>Перетаскиваемый элемент</p>
          </div>
        </section>

        {/* Форма с hidden режимом */}
        <section className="form-section">
          <h2>Форма</h2>
          <form>
            <input 
              type="text" 
              placeholder="Ваше имя" 
              data-cursor="hidden"
            />
            <input 
              type="email" 
              placeholder="Email" 
              data-cursor="hidden"
            />
            <textarea 
              placeholder="Сообщение" 
              data-cursor="hidden"
              rows="4"
            />
            <button type="submit" data-cursor="link">
              Отправить
            </button>
          </form>
        </section>

      </div>
    </>
  );
}

export default ExampleUsage;

