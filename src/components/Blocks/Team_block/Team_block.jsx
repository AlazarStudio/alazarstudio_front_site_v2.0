import React from "react";
import { useNavigate } from "react-router-dom";
import { teamMembers } from "./teamMembers";
import classes from './Team_block.module.css';

const BACKEND_BASE = import.meta.env.VITE_BACKEND_IMAGE_BASE || "https://backend.alazarstudio.ru";

function normalizeSocials(apiMember) {
    const arraySource = Array.isArray(apiMember?.socials)
        ? apiMember.socials
        : Array.isArray(apiMember?.social)
            ? apiMember.social
            : [];

    if (arraySource.length > 0) {
        return arraySource
            .map((item) => {
                const type = String(item?.type || item?.name || "").trim().toLowerCase();
                const label = String(item?.label || item?.title || item?.url || item?.href || item?.value || "").trim();
                if (!type || !label) {
                    return null;
                }

                return { type, label };
            })
            .filter(Boolean);
    }

    const socialFieldMap = [
        { type: "instagram", keys: ["instagram", "instagramUrl", "instagram_url"] },
        { type: "vk", keys: ["vk", "vkUrl", "vk_url", "vkontakte"] },
        { type: "be", keys: ["be", "behance", "behanceUrl", "behance_url"] },
        { type: "group", keys: ["group", "artstation", "groupUrl", "group_url", "artstationUrl", "artstation_url"] },
    ];

    return socialFieldMap
        .map(({ type, keys }) => {
            for (const key of keys) {
                const value = apiMember?.[key];
                if (typeof value === "string" && value.trim()) {
                    return { type, label: value.trim() };
                }

                if (value && typeof value === "object") {
                    const label = String(value.label || value.title || value.url || value.href || value.value || "").trim();
                    if (label) {
                        return { type, label };
                    }
                }
            }

            return null;
        })
        .filter(Boolean);
}

function normalizeMember(apiMember) {
    const rawAvatar = apiMember.avatar ?? "";
    const image = rawAvatar
        ? rawAvatar.startsWith("http")
            ? rawAvatar
            : `${BACKEND_BASE}${rawAvatar.startsWith("/") ? "" : "/"}${rawAvatar}`
        : "";

    return {
        slug: apiMember.id,
        name: apiMember.fio ?? '',
        role: apiMember.dolzhnost ?? '',
        image,
        faceY: '24%',
        socials: normalizeSocials(apiMember),
    };
}

const TEAM_LEAD_ORDER = {
    'Уртенов Азамат': 0,
    'Джатдоев Алим': 1,
    'Каппушев Мухаммад': 2,
    'Гочияев Руслан': 3,
    'Кубанов Муса': 4,
    'Чагарова Амина': 5,
    'Виловатая Виктория': 6,
    'Каппушева Халю': 7,
};

function Team_block({ team = [] }) {
    const published = Array.isArray(team) ? team.filter((member) => member?.isPublished !== false) : [];
    let members = published.length > 0 ? published.map(normalizeMember) : teamMembers;

    if (published.length > 0) {
        members = [...members].sort((a, b) => {
            const ia = TEAM_LEAD_ORDER[a.name] !== undefined ? TEAM_LEAD_ORDER[a.name] : 999;
            const ib = TEAM_LEAD_ORDER[b.name] !== undefined ? TEAM_LEAD_ORDER[b.name] : 999;
            return ia - ib;
        });
    }

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

    const handleCardMetaClick = (event) => {
        event.stopPropagation();
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
            </div>

            <div className={classes.rightPanel}>
                <div className={classes.teamGrid}>
                    {members.map((member) => (
                        <article
                            className={classes.teamCard}
                            key={member.slug}
                            role="button"
                            tabIndex={0}
                            onClick={() => openMemberPage(member)}
                            onKeyDown={(event) => handleMemberCardKeyDown(event, member)}
                        >
                            <div
                                className={classes.person_image}
                                data-cursor="case"
                                data-cursor-label="Перейти"
                                onMouseMove={handleMemberImageMove}
                                onMouseLeave={resetMemberImageMove}
                            >
                                <img src={member.image} alt={member.name} style={{ objectPosition: `center ${member.faceY || "24%"}` }} />
                            </div>

                            <div
                                className={classes.name}
                                onClick={handleCardMetaClick}
                            >
                                {member.name}
                            </div>
                            <div
                                className={classes.speciality_name}
                                onClick={handleCardMetaClick}
                            >
                                {member.role}
                            </div>

                            {Array.isArray(member.socials) && member.socials.length > 0 && (
                                <div className={classes.person_link} onClick={handleCardMetaClick}>
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
