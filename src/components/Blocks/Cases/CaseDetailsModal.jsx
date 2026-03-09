import React, { useRef, useState, useEffect, useLayoutEffect, useContext, useMemo } from 'react';
import { Eye, ChevronUp, ChevronDown } from 'lucide-react';
import {
  formatCaseDateRu,
  getCaseAdditionalImageUrls,
  getCaseSolutionHtml,
  getCaseTaskHtml,
  getCaseViews,
  mapTeamItems,
} from '@/components/Blocks/Cases/casesHelpers';
import { ModalScrollContext } from '@/components/Standart/Modal/Modal.jsx';
import ContactModal from './ContactModal';
import classes from './CaseDetailsModal.module.css';

function SocialButton({ icon: Icon, imageSrc, label }) {
  return (
    <div className={classes.socialBtnWrap}>
      <span className={classes.socialBtnTooltip}>{label}</span>
      <button type="button" className={classes.socialBtn} aria-label={label}>
        {imageSrc ? (
          <img src={imageSrc} alt="" className={classes.socialBtnImg} aria-hidden />
        ) : (
          Icon && <Icon size={18} />
        )}
      </button>
    </div>
  );
}

export default function CaseDetailsModal({ item, teamItems, cases = [], onSelectCase }) {
  if (!item) return null;
  const source = item.sourceRecord || {};
  const task = getCaseTaskHtml(source);
  const solution = getCaseSolutionHtml(source);
  const views = getCaseViews(source);
  const dateLabel = formatCaseDateRu(source?.created_at?.$date || source?.created_at || source?.createdAt || item.date);
  const members = mapTeamItems(teamItems, source);
  const additionalImages = getCaseAdditionalImageUrls(source);
  const caseTitle = item.title || 'Без названия';

  const blockRefs = useRef([]);
  const visibleRatiosRef = useRef({});
  const containerRef = useRef(null);
  const scrollContainerRef = useContext(ModalScrollContext);
  const ignoreObserverRef = useRef(false);
  const observerDebounceRef = useRef(null);
  const lastDisplayedIndexRef = useRef(0);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [developersDropdownOpen, setDevelopersDropdownOpen] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  const developersDropdownRef = useRef(null);
  const scrollThresholdRef = useRef(150);
  const scrollThresholdExitRef = useRef(80);
  const lastToggleTimeRef = useRef(0);
  const TRANSITION_COOLDOWN_MS = 350;
  const blockCount = additionalImages.length;
  const MAX_VISIBLE_AVATARS = 4;

  useLayoutEffect(() => {
    const scrollRoot =
      scrollContainerRef?.current ?? containerRef.current?.parentElement;
    if (!scrollRoot) return;
    let rafId = null;
    const check = () => {
      const now = Date.now();
      const top = scrollRoot.scrollTop;
      const enter = scrollThresholdRef.current;
      const exit = scrollThresholdExitRef.current;
      if (now - lastToggleTimeRef.current < TRANSITION_COOLDOWN_MS) return;
      setIsHeaderSticky((prev) => {
        const next = prev ? top > exit : top > enter;
        if (next !== prev) lastToggleTimeRef.current = now;
        return next;
      });
    };
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        check();
        rafId = null;
      });
    };
    scrollRoot.addEventListener('scroll', onScroll, { passive: true });
    check();
    return () => {
      scrollRoot.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [scrollContainerRef]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (developersDropdownRef.current && !developersDropdownRef.current.contains(e.target)) {
        setDevelopersDropdownOpen(false);
      }
    };
    if (developersDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [developersDropdownOpen]);

  const scrollToBlock = (index) => {
    const el = blockRefs.current[index];
    if (!el) return;
    const scrollRoot = scrollContainerRef?.current ?? containerRef.current?.parentElement ?? document.querySelector('[data-modal-scroll]');
    if (!scrollRoot) return;

    const rect = el.getBoundingClientRect();
    const rootRect = scrollRoot.getBoundingClientRect();
    const maxScroll = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
    const isLastBlock = index === blockCount - 1;

    const delta = isLastBlock
      ? rect.bottom - rootRect.bottom
      : rect.top - rootRect.top;
    let targetScrollTop = scrollRoot.scrollTop + delta;
    targetScrollTop = Math.max(0, Math.min(maxScroll, targetScrollTop));

    ignoreObserverRef.current = true;
    setCurrentBlockIndex(index);
    lastDisplayedIndexRef.current = index;
    setTimeout(() => {
      scrollRoot.scrollTop = targetScrollTop;
      requestAnimationFrame(() => { ignoreObserverRef.current = false; });
    }, 0);
  };

  const handlePrevBlock = () => {
    if (currentBlockIndex > 0) scrollToBlock(currentBlockIndex - 1);
  };

  const handleNextBlock = () => {
    if (currentBlockIndex < blockCount - 1) scrollToBlock(currentBlockIndex + 1);
  };

  // Синхронизация текущего блока при ручной прокрутке (Intersection Observer)
  useEffect(() => {
    if (blockCount === 0) return;
    const scrollRoot = scrollContainerRef?.current ?? containerRef.current?.parentElement;
    if (!scrollRoot) return;
    const ratios = visibleRatiosRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (ignoreObserverRef.current) return;
        entries.forEach((entry) => {
          const index = blockRefs.current.indexOf(entry.target);
          if (index !== -1) ratios[index] = entry.intersectionRatio;
        });
        let bestIndex = 0;
        let bestRatio = 0;
        for (let i = 0; i < blockCount; i++) {
          const r = ratios[i] ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            bestIndex = i;
          }
        }
        if (observerDebounceRef.current) clearTimeout(observerDebounceRef.current);
        observerDebounceRef.current = setTimeout(() => {
          observerDebounceRef.current = null;
          if (ignoreObserverRef.current) return;
          if (bestIndex !== lastDisplayedIndexRef.current) {
            lastDisplayedIndexRef.current = bestIndex;
            setCurrentBlockIndex(bestIndex);
          }
        }, 120);
      },
      { root: scrollRoot, threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] }
    );
    blockRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => {
      if (observerDebounceRef.current) clearTimeout(observerDebounceRef.current);
      observer.disconnect();
      Object.keys(ratios).forEach((k) => delete ratios[k]);
    };
  }, [blockCount]);

  // Открыли с главной vs переключили внутри модалки (по клику на превью)
  const hasClickedInsideRef = useRef(false);
  const isOpenFromMain = !hasClickedInsideRef.current;
  // Замораживаем порядок при открытии с главной: первый открытый сверху, остальные под ним — так и остаётся при переключении
  const frozenOrderRef = useRef(null);

  const CASES_ITEM_H = 80;
  const CASES_GAP = 12;
  const CASES_SLOT = CASES_ITEM_H + CASES_GAP;

  // При открытии с главной: выбранный первый, остальные — по убыванию совпадения тегов с открытым. После клика внутри — порядок не меняем.
  const orderedCases = useMemo(() => {
    if (!item || !cases.length) return cases;
    const selected = cases.find((c) => c.id === item.id || c.url_text === item.url_text);
    if (!selected) return cases;
    if (isOpenFromMain) {
      const rest = cases.filter((c) => c.id !== item.id && c.url_text !== item.url_text);
      const openTags = selected.tags || [];
      const openTagSet = new Set(openTags.map((t) => String(t).trim()).filter(Boolean));

      const countMatchingTags = (c) => {
        const tags = c.tags || [];
        return tags.filter((t) => openTagSet.has(String(t).trim())).length;
      };

      const sortedRest = [...rest].sort((a, b) => {
        const aMatches = countMatchingTags(a);
        const bMatches = countMatchingTags(b);
        if (bMatches !== aMatches) return bMatches - aMatches;
        return 0;
      });

      const order = [selected, ...sortedRest];
      frozenOrderRef.current = order;
      return order;
    }
    return frozenOrderRef.current || cases;
  }, [cases, item?.id, item?.url_text, isOpenFromMain]);

  const handleSelectCase = (c) => {
    if (c.id !== item.id && c.url_text !== item.url_text) {
      hasClickedInsideRef.current = true;
    }
    onSelectCase({ ...c, type: 'case' });
  };

  // В консоль — теги у каждого кейса в списке слева
  useEffect(() => {
    if (orderedCases.length === 0) return;
    orderedCases.forEach((c, i) => {
      console.log(`Кейс ${i + 1} (${c.title}):`, c.tags || []);
    });
  }, [orderedCases]);

  // Сдвиг списка, чтобы выбранный был по центру (только при переключении внутри модалки)
  const [listTranslateY, setListTranslateY] = useState(0);
  useEffect(() => {
    if (isOpenFromMain || orderedCases.length === 0) return;
    const selectedIdx = orderedCases.findIndex((c) => c.id === item.id || c.url_text === item.url_text);
    if (selectedIdx < 0) return;
    const update = () => {
      const centerY = window.innerHeight / 2;
      const offset = selectedIdx * CASES_SLOT + CASES_ITEM_H / 2;
      setListTranslateY(centerY - offset);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [item?.id, item?.url_text, orderedCases, isOpenFromMain]);

  return (
    <>
      {cases.length > 0 && onSelectCase && (
        <div className={classes.casesFixed} aria-label="Другие кейсы">
          <div
            className={`${classes.casesFixedList} ${isOpenFromMain ? classes.casesFixedList_fromMain : ''}`}
            style={!isOpenFromMain ? { transform: `translateY(${listTranslateY}px)` } : undefined}
          >
            {orderedCases.map((c) => {
              const isSelected = c.id === item.id || c.url_text === item.url_text;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`${classes.casesFixedItem} ${isSelected ? classes.casesFixedItem_selected : ''}`}
                  onClick={() => handleSelectCase(c)}
                  aria-current={isSelected ? 'true' : undefined}
                >
                  <span className={classes.casesFixedThumb}>
                    {c.imgSrc ? (
                      <img src={c.imgSrc} alt="" />
                    ) : (
                      <span className={classes.casesFixedPlaceholder} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    <div ref={containerRef} className={classes.modalInner}>
      {/* Компактный хедер: всегда в DOM для анимации выезда сверху; ref только у видимого блока сотрудников */}
      <div className={`${classes.headerStickyWrap} ${isHeaderSticky ? classes.headerStickyWrap_visible : ''}`}>
        <div className={`${classes.headerSticky} ${isHeaderSticky ? classes.headerSticky_visible : ''}`}>
          <div className={classes.headerStickyLeft}>
            <h2 className={classes.headerStickyTitle}>{caseTitle}</h2>
          </div>
          <div className={classes.headerStickyRight}>
            {members.length > 0 && (
              <div className={classes.heroTeamWrap} ref={isHeaderSticky ? developersDropdownRef : undefined}>
                {members.length === 1 ? (
                  <div className={classes.headerStickyTeamSingle}>
                    <img src={members[0].image} alt={members[0].name} className={classes.headerStickyAvatar} />
                    <span className={classes.headerStickyTeamName}>{members[0].name}</span>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className={classes.heroTeamStack}
                      onClick={() => setDevelopersDropdownOpen((v) => !v)}
                      aria-expanded={developersDropdownOpen}
                      aria-haspopup="true"
                    >
                      {members.slice(0, MAX_VISIBLE_AVATARS).map((member, i) => (
                        <span
                          key={member.id}
                          className={classes.heroTeamStackAvatar}
                          style={{ zIndex: MAX_VISIBLE_AVATARS - i }}
                        >
                          <img src={member.image} alt={member.name} />
                        </span>
                      ))}
                      {members.length > MAX_VISIBLE_AVATARS && (
                        <span className={classes.heroTeamStackMore}>
                          +{members.length - MAX_VISIBLE_AVATARS}
                        </span>
                      )}
                    </button>
                    {developersDropdownOpen && isHeaderSticky && (
                      <div className={classes.heroTeamDropdown}>
                        {members.map((member) => (
                          <div key={member.id} className={classes.heroTeamDropdownItem}>
                            <img src={member.image} alt={member.name} className={classes.heroTeamDropdownAvatar} />
                            <div>
                              <div className={classes.heroTeamDropdownName}>{member.name}</div>
                              {member.role && <div className={classes.heroTeamDropdownRole}>{member.role}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <button type="button" className={classes.headerStickyContactBtn} onClick={() => setContactModalOpen(true)}>
              Оставить заявку
            </button>
          </div>
        </div>
      </div>

      <div className={classes.hero}>
        <div className={classes.heroLeft}>
          <h2 className={classes.caseTitle}>{caseTitle}</h2>
          <div className={classes.metaLeft}>
            {/* <span>{views}</span> */}
            {/* <Eye size={16} /> */}
            {dateLabel && <span className={classes.date}> {dateLabel}</span>}
          </div>
        </div>
        <div className={classes.heroRight}>
          {members.length > 0 && (
            <div className={classes.heroTeamWrap} ref={isHeaderSticky ? undefined : developersDropdownRef}>
              {members.length === 1 ? (
                <div className={classes.heroTeamSingle}>
                  <img src={members[0].image} alt={members[0].name} className={classes.heroTeamAvatar} />
                  <div>
                    <div className={classes.heroTeamName}>{members[0].name}</div>
                    {members[0].role && <div className={classes.heroTeamRole}>{members[0].role}</div>}
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className={classes.heroTeamStack}
                    onClick={() => setDevelopersDropdownOpen((v) => !v)}
                    aria-expanded={developersDropdownOpen}
                    aria-haspopup="true"
                  >
                    {members.slice(0, MAX_VISIBLE_AVATARS).map((member, i) => (
                      <span
                        key={member.id}
                        className={classes.heroTeamStackAvatar}
                        style={{ zIndex: MAX_VISIBLE_AVATARS - i }}
                      >
                        <img src={member.image} alt={member.name} />
                      </span>
                    ))}
                    {members.length > MAX_VISIBLE_AVATARS && (
                      <span className={classes.heroTeamStackMore}>
                        +{members.length - MAX_VISIBLE_AVATARS}
                      </span>
                    )}
                  </button>
                  {developersDropdownOpen && !isHeaderSticky && (
                    <div className={classes.heroTeamDropdown}>
                      {members.map((member) => (
                        <div key={member.id} className={classes.heroTeamDropdownItem}>
                          <img src={member.image} alt={member.name} className={classes.heroTeamDropdownAvatar} />
                          <div>
                            <div className={classes.heroTeamDropdownName}>{member.name}</div>
                            {member.role && <div className={classes.heroTeamDropdownRole}>{member.role}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <button type="button" className={classes.contactBtn} onClick={() => setContactModalOpen(true)}>
            Оставить заявку
          </button>
        </div>

        <div className={classes.shareFixed}>
          <SocialButton imageSrc="/tg.png" label="Поделиться в Telegram" />
          <SocialButton imageSrc="/vk.png" label="Поделиться в ВК" />
          <SocialButton imageSrc="/max.png" label="Поделиться в МАХ" />
          <SocialButton imageSrc="/wa.png" label="Поделиться в WhatsApp" />
        </div>
      </div>

      <div className={classes.darkSection}>
        <div className={classes.twoCols}>
          <section>
            <h3 className={classes.sectionTitle}>ЗАДАЧА</h3>
            <div className={classes.sectionText} dangerouslySetInnerHTML={{ __html: task || '<p>—</p>' }} />
          </section>
          <section>
            <h3 className={`${classes.sectionTitle} ${classes.pink}`}>РЕШЕНИЕ</h3>
            <div className={classes.sectionText} dangerouslySetInnerHTML={{ __html: solution || '<p>—</p>' }} />
          </section>
        </div>
      </div>

      {additionalImages.length > 0 && (
        <>
          <div className={classes.imagesSection}>
            {additionalImages.map((imageUrl, index) => (
              <div
                key={`${imageUrl}-${index}`}
                ref={(el) => { blockRefs.current[index] = el; }}
                className={classes.imageItem}
              >
                <img src={imageUrl} alt={`Дополнительное изображение ${index + 1}`} className={classes.additionalImage} />
              </div>
            ))}
          </div>

          <div className={classes.scrollNavFixed}>
            <div className={classes.socialBtnWrap}>
              <span className={classes.socialBtnTooltip}>Предыдущий блок</span>
              <button
                type="button"
                className={classes.socialBtn}
                aria-label="Предыдущий блок"
                onClick={handlePrevBlock}
                disabled={currentBlockIndex <= 0}
              >
                <ChevronUp size={20} />
              </button>
            </div>
            <div className={classes.socialBtnWrap}>
              <span className={classes.socialBtnTooltip}>Следующий блок</span>
              <button
                type="button"
                className={classes.socialBtn}
                aria-label="Следующий блок"
                onClick={handleNextBlock}
                disabled={currentBlockIndex >= blockCount - 1}
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>
        </>
      )}
      <ContactModal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} />
    </div>
    </>
  );
}
