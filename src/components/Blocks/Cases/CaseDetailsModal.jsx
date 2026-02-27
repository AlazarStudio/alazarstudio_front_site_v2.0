import React from 'react';
import { Eye, Mail, MessageCircle, Share2, Send } from 'lucide-react';
import {
  formatCaseDateRu,
  getCaseAdditionalImageUrls,
  getCaseLogoUrl,
  getCaseSolutionHtml,
  getCaseTaskHtml,
  getCaseViews,
  mapTeamItems,
} from './casesHelpers';
import classes from './CaseDetailsModal.module.css';

function SocialButton({ icon: Icon, label }) {
  return (
    <button type="button" className={classes.socialBtn} aria-label={label} title={label}>
      <Icon size={18} />
    </button>
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
  const logoSrc = item.logoSrc || getCaseLogoUrl(source);

  return (
    <div className={classes.modalInner}>
      <div className={classes.hero}>
        <div className={classes.heroTags}>
          {(item.tags || []).map((tag) => (
            <span key={tag} className={classes.tag}>#{tag}</span>
          ))}
        </div>

        <div className={classes.logoWrap}>
          <img src={logoSrc} alt={item.title} className={classes.logo} />
        </div>

        <div className={classes.metaRow}>
          <div className={classes.metaLeft}>
            <span>{views}</span>
            <Eye size={16} />
            {dateLabel && <span className={classes.date}> {dateLabel}</span>}
          </div>
          <div className={classes.metaRight}>
            <span className={classes.shareLabel}>Поделиться:</span>
            <SocialButton icon={Share2} label="Поделиться" />
            <SocialButton icon={Send} label="Telegram" />
            <SocialButton icon={MessageCircle} label="WhatsApp" />
            <SocialButton icon={Mail} label="Почта" />
          </div>
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
        <div className={classes.imagesSection}>
          {additionalImages.map((imageUrl, index) => (
            <div key={`${imageUrl}-${index}`} className={classes.imageItem}>
              <img src={imageUrl} alt={`Дополнительное изображение ${index + 1}`} className={classes.additionalImage} />
            </div>
          ))}
        </div>
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
