import React, { useRef, useState, useEffect, useContext } from 'react';
import { Eye, Mail, MessageCircle, Share2, Send, ChevronUp, ChevronDown } from 'lucide-react';
import {
  formatCaseDateRu,
  getCaseAdditionalImageUrls,
  getCaseSolutionHtml,
  getCaseTaskHtml,
  getCaseViews,
  mapTeamItems,
} from '@/components/Blocks/Cases/casesHelpers';
import { ModalScrollContext } from '@/components/Standart/Modal/Modal.jsx';
import classes from './CaseDetailsModal.module.css';

function SocialButton({ icon: Icon, label }) {
  return (
    <div className={classes.socialBtnWrap}>
      <span className={classes.socialBtnTooltip}>{label}</span>
      <button type="button" className={classes.socialBtn} aria-label={label}>
        <Icon size={18} />
      </button>
    </div>
  );
}

function TeamCard({ member }) {
  return (
    <div className={classes.teamCard}>
      <img src={member.image} alt={member.name} className={classes.teamAvatar} />
      <div>
        <div className={classes.teamName}>{member.name}</div>
        {member.role && <div className={classes.teamRole}>{member.role}</div>}
      </div>
    </div>
  );
}

export default function CaseDetailsModal({ item, teamItems }) {
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
  const blockCount = additionalImages.length;

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

  return (
    <div ref={containerRef} className={classes.modalInner}>
      <div className={classes.hero}>
        <h2 className={classes.caseTitle}>{caseTitle}</h2>

        <div className={classes.metaRow}>
          <div className={classes.metaLeft}>
            <span>{views}</span>
            <Eye size={16} />
            {dateLabel && <span className={classes.date}> {dateLabel}</span>}
          </div>
        </div>

        <div className={classes.shareFixed}>
          {/* <span className={classes.shareLabel}>Поделиться:</span> */}
          <SocialButton icon={Share2} label="Поделиться" />
          <SocialButton icon={Send} label="Telegram" />
          <SocialButton icon={MessageCircle} label="WhatsApp" />
          <SocialButton icon={Mail} label="Почта" />
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

      {members.length > 0 && (
        <div className={classes.darkSection}>
          <h3 className={classes.sectionTitle}>КОМАНДА</h3>
          <div className={classes.teamList}>
            {members.map((member) => (
              <TeamCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
