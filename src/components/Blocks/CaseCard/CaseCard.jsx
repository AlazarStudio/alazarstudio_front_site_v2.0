import React, { useRef, useState } from "react";
import classes from './CaseCard.module.css';
import { mapTeamItems } from '@/components/Blocks/Cases/casesHelpers';

const MAX_VISIBLE_AVATARS = 4;

function CaseCard({ imgSrc, title, description, tags = [], type, price = 0, date, onClick, url_text, isStock, sourceRecord, teamItems = [] }) {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);
    const caseRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!caseRef.current) return;

        const rect = caseRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setMousePosition({ x, y });

        // Вычисляем смещение относительно центра контейнера
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const offsetX = (x - centerX) * 0.05; // Коэффициент для плавного движения
        const offsetY = (y - centerY) * 0.05;

        setImageOffset({ x: offsetX, y: offsetY });
    };

    const handleMouseEnter = () => {
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setImageOffset({ x: 0, y: 0 });
    };

    function formatDate(date) {
        const d = new Date(date);

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return `${day}.${month}.${year}`;
    }

    function formatAmount(value) {
        return Number(value).toLocaleString('ru-RU');
    }

    const handleClick = () => {
        if (onClick) {
            onClick();
        }
    };

    const stopPropagation = (e) => {
        e.stopPropagation();
    };

    const members = (type === 'case' || type === 'shop') ? mapTeamItems(teamItems || [], sourceRecord || {}) : [];

    return (
        <>
            {type == "case" &&
                <div
                    className={`${classes.case} ${classes.type_case}`}
                    ref={caseRef}
                    onMouseMove={handleMouseMove}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                    data-cursor={type}
                    style={{ cursor: 'pointer' }}
                    data-url-text={url_text}
                >
                    {isHovered && (
                        <div
                            className={classes.case_glow}
                            style={{
                                left: `${mousePosition.x}px`,
                                top: `${mousePosition.y}px`,
                            }}
                        />
                    )}
                    <div className={classes.case_img}>
                        <img
                            src={imgSrc}
                            alt=""
                            style={{
                                transform: isHovered
                                    ? `scale(1.1) translate(${imageOffset.x}px, ${imageOffset.y}px)`
                                    : 'scale(1) translate(0, 0)',
                                transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                            }}
                        />
                        {members.length > 0 && (
                            <>
                                <div className={classes.case_img_darken} aria-hidden="true" />
                                <div className={classes.case_img_team}>
                                    {members.slice(0, MAX_VISIBLE_AVATARS).map((member, i) => (
                                        <span
                                            key={member.id}
                                            className={classes.case_img_team_avatar}
                                            style={{ zIndex: MAX_VISIBLE_AVATARS - i }}
                                        >
                                            <img src={member.image} alt={member.name} />
                                        </span>
                                    ))}
                                    {members.length > MAX_VISIBLE_AVATARS && (
                                        <span className={classes.case_img_team_more}>
                                            +{members.length - MAX_VISIBLE_AVATARS}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    <div className={classes.case_bottom}>
                        <div className={classes.case_bottom_title}>{title}</div>
                        {tags.length > 0 && (
                            <div className={classes.case_bottom_tags}>
                                {tags.map((tag, index) => (
                                    <span key={index} className={classes.case_bottom_tag}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            }

            {type == "banner" &&
                <div
                    className={`${classes.case} ${classes.type_new}`}
                    ref={caseRef}
                    onMouseMove={handleMouseMove}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                    data-cursor={type}
                    style={{ cursor: 'pointer' }}
                    data-url-text={url_text}
                >
                    {isHovered && (
                        <div
                            className={classes.case_glow}
                            style={{
                                left: `${mousePosition.x}px`,
                                top: `${mousePosition.y}px`,
                            }}
                        />
                    )}
                    <div className={classes.new_container}>
                        <div className={classes.new_container_date_tag}>
                            <div className={classes.new_container_label}>Акция</div>
                            <div className={classes.new_container_dot}></div>
                            <div className={classes.new_container_date}>{formatDate(date)}</div>
                        </div>
                        <div className={classes.new_container_title}>{title}</div>
                        <div className={classes.new_container_desc}>{description}</div>
                        <button type="button" className={classes.new_container_readMore}>Читать далее</button>
                    </div>
                </div>
            }

            {type == "new" &&
                <div
                    className={`${classes.case} ${classes.type_new}`}
                    ref={caseRef}
                    onMouseMove={handleMouseMove}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                    data-cursor={type}
                    style={{ cursor: 'pointer' }}
                    data-url-text={url_text}
                >
                    {isHovered && (
                        <div
                            className={classes.case_glow}
                            style={{
                                left: `${mousePosition.x}px`,
                                top: `${mousePosition.y}px`,
                            }}
                        />
                    )}
                    <div className={classes.new_container}>
                        <div className={classes.new_container_date_tag}>
                            <div className={classes.new_container_date}>{formatDate(date)}</div>
                            <div className={classes.new_container_dot}></div>
                            <div className={classes.banner_tag}>
                                {isStock ? 'Акция' : 'Новости'}
                            </div>
                        </div>
                        <div className={classes.new_container_title}>{title}</div>
                        <div className={classes.new_container_desc}>{description}</div>
                        <button type="button" className={classes.new_container_readMore}>Читать далее</button>
                    </div>
                </div>
            }

            {type == "shop" &&
                <div
                    className={`${classes.case} ${classes.type_shop}`}
                    ref={caseRef}
                    onMouseMove={handleMouseMove}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                    data-cursor={type}
                    style={{ cursor: 'pointer' }}
                    data-url-text={url_text}
                >
                    {isHovered && (
                        <div
                            className={classes.case_glow_blue}
                            style={{
                                left: `${mousePosition.x}px`,
                                top: `${mousePosition.y}px`,
                            }}
                        />
                    )}
                    <div className={classes.case_img}>
                        <img
                            src={imgSrc}
                            alt=""
                            style={{
                                transform: isHovered
                                    ? `scale(1.1) translate(${imageOffset.x}px, ${imageOffset.y}px)`
                                    : 'scale(1) translate(0, 0)',
                                transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                            }}
                        />
                        {members.length > 0 && (
                            <>
                                <div className={classes.case_img_darken} aria-hidden="true" />
                                <div className={classes.case_img_team}>
                                    {members.slice(0, MAX_VISIBLE_AVATARS).map((member, i) => (
                                        <span
                                            key={member.id}
                                            className={classes.case_img_team_avatar}
                                            style={{ zIndex: MAX_VISIBLE_AVATARS - i }}
                                        >
                                            <img src={member.image} alt={member.name} />
                                        </span>
                                    ))}
                                    {members.length > MAX_VISIBLE_AVATARS && (
                                        <span className={classes.case_img_team_more}>
                                            +{members.length - MAX_VISIBLE_AVATARS}
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    <div className={classes.case_bottom}>
                        <div className={`${classes.case_bottom_title} ${classes.single_line}`}>{title}</div>
                        <div className={classes.case_bottom_tail}>
                            {tags.length > 0 && (
                                <div className={classes.case_bottom_tags}>
                                    {tags.map((tag, index) => (
                                        <span key={index} className={classes.case_bottom_tag}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className={classes.shop_price}>
                                {formatAmount(price)} ₽
                            </div>
                        </div>
                    </div>
                </div>
            }
        </>
    );
}

export default CaseCard;