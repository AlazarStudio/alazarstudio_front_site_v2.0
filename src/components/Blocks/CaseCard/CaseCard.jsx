import React, { useRef, useState } from "react";
import classes from './CaseCard.module.css';
import { Link } from "react-router-dom";

function CaseCard({ imgSrc, title, description, tags, type, price = 0, date, onClick, url_text }) {
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
                        <div className={classes.case_img_tags}>
                            {tags.map((tag, index) => (
                                <Link
                                    key={index}
                                    to={'/'}
                                    className={classes.case_img_tag}
                                    onClick={stopPropagation}
                                // data-cursor="filter"
                                >
                                    {tag}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className={classes.case_bottom}>
                        <div className={classes.case_bottom_title}>{title}</div>
                        <div className={classes.case_bottom_desc}>
                            {description}
                        </div>
                    </div>
                </div>
            }

            {type == "banner" &&
                <div
                    className={`${classes.case} ${classes.type_banner}`}
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
                    <div className={classes.banner_tags}>
                        {tags.map((tag, index) => (
                            <Link
                                key={index}
                                to={'/'}
                                className={classes.banner_tag}
                                onClick={stopPropagation}
                            // data-cursor="filter_blue"
                            >
                                {tag}
                            </Link>
                        ))}
                    </div>
                    <div className={classes.banner_text}>
                        <div className={classes.banner_title}>{title}</div>
                        <div className={classes.banner_desc}>{description}</div>
                    </div>

                    <div className={classes.banner_img}>
                        <div className={classes.banner_img_container}>
                            <img src={imgSrc} alt="" />
                        </div>
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
                            <div className={classes.new_container_tag}>
                                {tags.map((tag, index) => (
                                    <Link
                                        key={index}
                                        to={'/'}
                                        className={classes.banner_tag}
                                        onClick={stopPropagation}
                                    // data-cursor="filter"
                                    >
                                        {tag}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div className={classes.new_container_title}>{title}</div>
                        <div className={classes.new_container_desc}>{description}</div>
                        <div className={classes.new_container_img}>
                            <img src={imgSrc} alt="" />
                        </div>
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
                    <div className={classes.shop_img}>
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
                    </div>
                    <div className={classes.shop_bottom}>
                        <div className={classes.shop_bottom_title}>{title}</div>
                        <div className={classes.shop_bottom_desc}>
                            {description}
                        </div>
                        <div className={classes.shop_img_tags}>
                            {tags.map((tag, index) => (
                                <Link
                                    key={index}
                                    to={'/'}
                                    className={classes.shop_img_tag}
                                    onClick={stopPropagation}
                                // data-cursor="filter_blue"
                                >
                                    {tag}
                                </Link>
                            ))}
                        </div>
                        <div className={classes.shop_price_card}>
                            <div className={classes.shop_price}>
                                {formatAmount(price)} ₽
                            </div>
                            <div className={classes.shop_card} data-cursor="card" onClick={stopPropagation}>
                                Добавить в корзину
                            </div>
                        </div>
                    </div>
                </div>
            }
        </>
    );
}

export default CaseCard;