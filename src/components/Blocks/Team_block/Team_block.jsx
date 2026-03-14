import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { teamMembers } from "./teamMembers";
import classes from './Team_block.module.css';

function Team_block({}) {
    const sliderRef = useRef(null);
    const animationFrameRef = useRef(null);
    const navigate = useNavigate();

    const socialIconByType = {
        instagram: "/instagram.png",
        vk: "/vk.png",
        be: "/be.png",
        group: "/Group.png",
    };

    const socialTitleByType = {
        instagram: "Instagram",
        vk: "VK",
        be: "Behance",
        group: "Group",
    };

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    const easeOutCubic = (t) => {
        return 1 - Math.pow(1 - t, 3);
    };

    const animateScrollTo = (slider, targetLeft, duration = 420) => {
        const startLeft = slider.scrollLeft;
        const delta = targetLeft - startLeft;

        if (Math.abs(delta) < 1) {
            return;
        }

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        const startTime = performance.now();

        const tick = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = easeOutCubic(progress);
            slider.scrollLeft = startLeft + delta * eased;

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(tick);
            } else {
                animationFrameRef.current = null;
            }
        };

        animationFrameRef.current = requestAnimationFrame(tick);
    };

    const scrollByCard = (direction) => {
        const slider = sliderRef.current;
        if (!slider) {
            return;
        }

        const firstCard = slider.querySelector("[data-card]");
        if (!firstCard) {
            return;
        }

        const cardWidth = firstCard.getBoundingClientRect().width;
        const sliderStyles = window.getComputedStyle(slider);
        const gap = parseFloat(sliderStyles.columnGap || sliderStyles.gap || "0");
        const step = cardWidth + gap;
        const maxLeft = Math.max(0, slider.scrollWidth - slider.clientWidth);
        const nextLeft = Math.max(0, Math.min(slider.scrollLeft + direction * step, maxLeft));

        animateScrollTo(slider, nextLeft);
    };

    const handleMemberImageMove = (event) => {
        const container = event.currentTarget;
        const rect = container.getBoundingClientRect();
        if (!rect.width || !rect.height) {
            return;
        }

        const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
        const relativeY = (event.clientY - rect.top) / rect.height - 0.5;
        const maxShift = 12;

        container.style.setProperty("--move-x", `${(relativeX * maxShift).toFixed(2)}px`);
        container.style.setProperty("--move-y", `${(relativeY * maxShift).toFixed(2)}px`);
    };

    const resetMemberImageMove = (event) => {
        const container = event.currentTarget;
        container.style.setProperty("--move-x", "0px");
        container.style.setProperty("--move-y", "0px");
    };

    const openMemberPage = (member) => {
        navigate(`/team/${member.slug}`);
    };

    const handleMemberCardKeyDown = (event, member) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMemberPage(member);
        }
    };

    return (
        <section className={classes.block}>
            <div className={classes.leftPanel}>
                <div className={classes.team1}>
                    <div className={classes.block_team}>
                        <div className={classes.title}>НАША</div>
                        <div className={classes.title2}>КОМАНДА</div>
                    </div>

                    <div className={classes.block_service}>
                        Глубокое погружение в каждый проект, энергия и свежий взгляд обеспечивают высокий результат.
                    </div>
                </div>

                <div className={classes.arrows}>
                    <button className={classes.arrow} type="button" onClick={() => scrollByCard(-1)}>
                        <img src="/Arrowleft.png" alt="Предыдущий сотрудник" />
                    </button>
                    <button className={classes.arrow} type="button" onClick={() => scrollByCard(1)}>
                        <img src="/Arrowright.png" alt="Следующий сотрудник" />
                    </button>
                </div>
            </div>

            <div className={classes.rightPanel}>
                <div ref={sliderRef} className={classes.teamSlider}>
                    {teamMembers.map((member) => (
                        <article
                            className={classes.teamCard}
                            data-card
                            key={member.slug}
                            role="button"
                            tabIndex={0}
                            onClick={() => openMemberPage(member)}
                            onKeyDown={(event) => handleMemberCardKeyDown(event, member)}
                        >
                            <div
                                className={classes.person_image}
                                data-cursor="case"
                                onMouseMove={handleMemberImageMove}
                                onMouseLeave={resetMemberImageMove}
                            >
                                <img src={member.image} alt={member.name} style={{ objectPosition: `center ${member.faceY || "24%"}` }} />
                            </div>

                            <div className={classes.name}>{member.name}</div>
                            <div className={classes.speciality_name}>{member.role}</div>

                            {Array.isArray(member.socials) && member.socials.length > 0 && (
                                <div className={classes.person_link}>
                                    {member.socials.map((social, socialIndex) => {
                                        const icon = socialIconByType[social.type];
                                        if (!icon) {
                                            return null;
                                        }

                                        return (
                                            <div className={classes.link} key={`${member.slug}-${social.type}-${socialIndex}`}>
                                                <div className={classes.link_logo}>
                                                    <img src={icon} alt={socialTitleByType[social.type] || social.type} />
                                                </div>
                                                {social.label ? (
                                                    <div className={classes.title_link}>{social.label}</div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Team_block;

