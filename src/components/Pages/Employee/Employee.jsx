import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import CaseCard from "../../Blocks/CaseCard/CaseCard";
import { extractPlainText, extractTagRelations, isCaseForShop, mapCaseRecordToCard, mapTeamItems, transliterate } from "../../Blocks/Cases/casesHelpers";
import { publicCasesAPI, publicDynamicPageRecordsAPI, publicTeamAPI } from "@/lib/api";
import Modal from "@/components/Standart/Modal/Modal";
import CaseDetailsModal from "@/components/Blocks/Cases/CaseDetailsModal";
import caseDetailsModalClasses from "@/components/Blocks/Cases/CaseDetailsModal.module.css";
import classes from "./Employee.module.css";
import { useSeo } from "@/hooks/useSeo";
import { SITE_BASE_URL, SITE_NAME, truncateText, withSiteName } from "@/lib/seo";

const BACKEND_BASE = import.meta.env.VITE_BACKEND_IMAGE_BASE || "https://backend.alazarstudio.ru";

function normalizeMember(apiMember) {
    const rawAvatar = apiMember.avatar ?? "";
    const image = rawAvatar
        ? rawAvatar.startsWith("http")
            ? rawAvatar
            : `${BACKEND_BASE}${rawAvatar.startsWith("/") ? "" : "/"}${rawAvatar}`
        : "";
    return {
        slug: buildMemberSlug(apiMember),
        name: apiMember.fio ?? "",
        role: apiMember.dolzhnost ?? "",
        image,
        faceY: "24%",
        socials: [],
    };
}

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

const PROJECT_CARD_WIDTH = "calc((100% - 50px) / 3)";

function buildMemberSlug(member) {
    const fromName = transliterate(member?.fio || member?.name || "");
    if (fromName) return fromName;
    return String(member?.id || "");
}

function resolvePreviousBreadcrumb(pathname) {
    const path = String(pathname || "").split("?")[0];
    if (!path || path === "/") return null;
    if (path.startsWith("/about")) return { to: "/about", label: "О нас" };
    if (path.startsWith("/cases")) return { to: "/cases", label: "Кейсы" };
    if (path.startsWith("/case/")) return { to: path, label: "Кейс" };
    if (path.startsWith("/news") || path.startsWith("/new/")) return { to: "/news", label: "Новости" };
    if (path.startsWith("/shop") || path.startsWith("/shopitem/")) return { to: "/shop", label: "Магазин" };
    return null;
}

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, "");
}

function isMemberInProject(member, projectMembers) {
    if (!member || !Array.isArray(projectMembers) || projectMembers.length === 0) {
        return false;
    }

    const memberRawName = String(member.name || "");
    const memberNormalized = normalizeText(memberRawName);
    const memberSlug = normalizeText(member.slug);
    const memberNameParts = memberRawName
        .split(/\s+/)
        .map((part) => normalizeText(part))
        .filter((part) => part.length >= 3);

    return projectMembers.some((projectMember) => {
        const projectMemberName = normalizeText(projectMember?.name);
        if (!projectMemberName) {
            return false;
        }

        if (memberNormalized && (projectMemberName.includes(memberNormalized) || memberNormalized.includes(projectMemberName))) {
            return true;
        }

        if (memberSlug && projectMemberName.includes(memberSlug)) {
            return true;
        }

        return memberNameParts.some((part) => projectMemberName.includes(part));
    });
}

function Employee() {
    const { memberSlug, type: routeType, url_text: routeUrlText } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const baseEmployeePath = memberSlug ? `/team/${memberSlug}` : "/team";

    const [team, setTeam] = useState([]);
    const [projectRecords, setProjectRecords] = useState([]);
    const [projectTeamItems, setProjectTeamItems] = useState([]);
    const [relatedTagLabelsByKey, setRelatedTagLabelsByKey] = useState({});
    const [isProjectsLoading, setIsProjectsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [stickyMode, setStickyMode] = useState("static");
    const [stickyTop, setStickyTop] = useState(0);
    const [stickyLeft, setStickyLeft] = useState(0);
    const [stickyWidth, setStickyWidth] = useState(300);
    const [stickyColumnHeight, setStickyColumnHeight] = useState(0);
    const contentLayoutRef = useRef(null);
    const stickyColumnRef = useRef(null);
    const stickyCardRef = useRef(null);

    const member = useMemo(() => {
        const slugFromUrl = String(memberSlug || "").trim().toLowerCase();
        if (!slugFromUrl || !Array.isArray(team) || team.length === 0) return null;
        const found = team.find((item) => {
            const translitSlug = String(buildMemberSlug(item)).trim().toLowerCase();
            const legacyIdSlug = String(item?.id || "").trim().toLowerCase();
            return translitSlug === slugFromUrl || legacyIdSlug === slugFromUrl;
        });
        return found ? normalizeMember(found) : null;
    }, [team, memberSlug]);

    const resolveRelatedTagLabel = useMemo(
        () => (id, resourceSlug = "") => relatedTagLabelsByKey[`${String(resourceSlug || "").toLowerCase()}:${String(id)}`] || "",
        [relatedTagLabelsByKey]
    );

    const projectCards = useMemo(
        () => (Array.isArray(projectRecords) ? projectRecords.map((record) => mapCaseRecordToCard(record, resolveRelatedTagLabel)) : []),
        [projectRecords, resolveRelatedTagLabel]
    );
    const previousBreadcrumb = useMemo(() => {
        const fromPath = location.state?.fromPath || location.state?.modalBackground || "";
        return resolvePreviousBreadcrumb(fromPath);
    }, [location.state]);

    useEffect(() => {
        if (!member || !memberSlug) return;
        const currentSlug = String(memberSlug).trim().toLowerCase();
        const canonicalSlug = String(member.slug || "").trim().toLowerCase();
        if (!canonicalSlug || currentSlug === canonicalSlug) return;

        const detailPart = routeType && routeUrlText ? `/${routeType}/${routeUrlText}` : "";
        navigate(`/team/${canonicalSlug}${detailPart}`, {
            replace: true,
            state: location.state,
        });
    }, [member, memberSlug, routeType, routeUrlText, navigate, location.state]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const teamRes = await publicTeamAPI.getAll({ page: 1, limit: 500 });
                if (cancelled) return;
                const teamList = Array.isArray(teamRes.data?.team) ? teamRes.data.team : [];
                setTeam(teamList);
            } catch {
                if (!cancelled) setTeam([]);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const handleImageMove = (event) => {
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

    const resetImageMove = (event) => {
        const container = event.currentTarget;
        container.style.setProperty("--move-x", "0px");
        container.style.setProperty("--move-y", "0px");
    };

    const handleProjectClick = (project) => {
        if (!project?.url_text || !memberSlug) {
            return;
        }

        const projectRoute = `/team/${memberSlug}/case/${project.url_text}`;

        setSelectedItem(project);
        setIsModalOpen(true);

        navigate(projectRoute, {
            state: { modalBackground: baseEmployeePath },
        });
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
        const background = location.state?.modalBackground || baseEmployeePath;
        navigate(background, { replace: true });
    };

    useEffect(() => {
        let cancelled = false;

        const loadProjects = async () => {
            if (!member) {
                if (!cancelled) {
                    setProjectRecords([]);
                    setProjectTeamItems([]);
                    setIsProjectsLoading(false);
                }
                return;
            }

            setIsProjectsLoading(true);

            try {
                const [casesResponse, teamResponse] = await Promise.all([
                    publicCasesAPI.getAll({ page: 1, limit: 500 }),
                    publicTeamAPI.getAll({ page: 1, limit: 500 }),
                ]);

                if (cancelled) {
                    return;
                }

                const rawCases = Array.isArray(casesResponse.data?.cases) ? casesResponse.data.cases : [];
                const rawTeam = Array.isArray(teamResponse.data?.team) ? teamResponse.data.team : [];

                const memberProjects = rawCases
                    .filter((record) => !isCaseForShop(record))
                    .filter((record) => {
                        const projectMembers = mapTeamItems(rawTeam, record);
                        return isMemberInProject(member, projectMembers);
                    });

                setProjectRecords(memberProjects);
                setProjectTeamItems(rawTeam);
            } catch {
                if (!cancelled) {
                    setProjectRecords([]);
                    setProjectTeamItems([]);
                }
            } finally {
                if (!cancelled) {
                    setIsProjectsLoading(false);
                }
            }
        };

        loadProjects();

        return () => {
            cancelled = true;
        };
    }, [member]);

    useEffect(() => {
        let cancelled = false;

        const loadRelatedTagLabels = async () => {
            const relationMap = new Map();
            (Array.isArray(projectRecords) ? projectRecords : []).forEach((record) => {
                extractTagRelations(record).forEach(({ resourceSlug, id }) => {
                    const slug = String(resourceSlug || "").trim().toLowerCase();
                    if (!slug || !id) return;
                    if (!relationMap.has(slug)) relationMap.set(slug, new Set());
                    relationMap.get(slug).add(String(id));
                });
            });

            if (relationMap.size === 0) {
                if (!cancelled) setRelatedTagLabelsByKey({});
                return;
            }

            const requests = Array.from(relationMap.entries()).map(async ([slug, ids]) => {
                try {
                    const response = await publicDynamicPageRecordsAPI.getAll(slug, { page: 1, limit: 2000 });
                    const records = Array.isArray(response.data?.records) ? response.data.records : [];
                    const result = {};
                    records.forEach((item) => {
                        const itemId = String(item?.id || item?._id?.$oid || item?._id || "").trim();
                        if (!itemId || !ids.has(itemId)) return;
                        const label = extractPlainText(item?.nazvanie || item?.name || item?.title || item?.label || item?.value);
                        if (label) result[`${slug}:${itemId}`] = label;
                    });
                    return result;
                } catch {
                    return {};
                }
            });

            const resolved = await Promise.all(requests);
            if (cancelled) return;
            const nextMap = {};
            resolved.forEach((part) => Object.assign(nextMap, part));
            setRelatedTagLabelsByKey(nextMap);
        };

        loadRelatedTagLabels();
        return () => {
            cancelled = true;
        };
    }, [projectRecords]);

    const seoTitle = member
        ? withSiteName(`${member.name} — ${member.role || "команда"}`)
        : `Команда | ${SITE_NAME}`;
    const seoDescription = member
        ? truncateText(`${member.name} — ${member.role || "сотрудник"} в ${SITE_NAME}.`, 170)
        : "Команда Alazar Studio: специалисты по веб-разработке, дизайну и цифровым проектам.";

    useSeo({
        title: seoTitle,
        description: seoDescription,
        pathname: memberSlug
            ? (routeType && routeUrlText
                ? `/team/${memberSlug}/${routeType}/${routeUrlText}`
                : `/team/${memberSlug}`)
            : "/team",
        ogType: "profile",
        ogImage: member?.image || "/alazar-logo.png",
        schema: member
            ? {
                "@context": "https://schema.org",
                "@graph": [
                    {
                        "@type": "Person",
                        "@id": `${SITE_BASE_URL}/team/${memberSlug}#person`,
                        name: member.name,
                        image: member.image || `${SITE_BASE_URL}/alazar-logo.png`,
                        jobTitle: member.role || "Сотрудник",
                        worksFor: {
                            "@type": "Organization",
                            name: SITE_NAME,
                            url: `${SITE_BASE_URL}/`,
                        },
                    },
                    {
                        "@type": "ProfilePage",
                        "@id": `${SITE_BASE_URL}/team/${memberSlug}#webpage`,
                        url: `${SITE_BASE_URL}/team/${memberSlug}`,
                        name: member.name,
                        description: seoDescription,
                        mainEntity: {
                            "@id": `${SITE_BASE_URL}/team/${memberSlug}#person`,
                        },
                    },
                {
                    "@type": "BreadcrumbList",
                    itemListElement: [
                        { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_BASE_URL}/` },
                        { "@type": "ListItem", position: 2, name: "О нас", item: `${SITE_BASE_URL}/about` },
                        { "@type": "ListItem", position: 3, name: member.name, item: `${SITE_BASE_URL}/team/${memberSlug}` },
                    ],
                },
                ],
            }
            : {
                "@context": "https://schema.org",
                "@type": "ProfilePage",
                name: "Сотрудник",
                url: `${SITE_BASE_URL}/team/${memberSlug || ""}`,
                description: seoDescription,
            },
        schemaId: "schema-employee-page",
    });

    useEffect(() => {
        if (!routeType || !routeUrlText) {
            if (isModalOpen || selectedItem) {
                setIsModalOpen(false);
                setSelectedItem(null);
            }
            return;
        }

        if (routeType !== "case") {
            return;
        }

        if (isProjectsLoading) {
            return;
        }

        const itemFromUrl = projectCards.find((item) => String(item.url_text) === String(routeUrlText));
        if (!itemFromUrl) {
            return;
        }

        setSelectedItem(itemFromUrl);
        setIsModalOpen(true);
    }, [routeType, routeUrlText, isProjectsLoading, projectCards, isModalOpen, selectedItem]);

    useEffect(() => {
        let rafId = null;
        const topOffset = 110;

        const updateStickyMode = () => {
            const layoutEl = contentLayoutRef.current;
            const stickyColEl = stickyColumnRef.current;
            const stickyCardEl = stickyCardRef.current;
            if (!layoutEl || !stickyColEl || !stickyCardEl) return;

            if (window.innerWidth <= 767) {
                setStickyMode("static");
                setStickyColumnHeight(0);
                return;
            }

            const layoutRect = layoutEl.getBoundingClientRect();
            const stickyHeight = stickyCardEl.offsetHeight;
            const layoutHeight = layoutEl.offsetHeight;
            const maxTopInside = Math.max(0, layoutHeight - stickyHeight);
            const desiredTopInside = topOffset - layoutRect.top;
            const stickyColRect = stickyColEl.getBoundingClientRect();
            setStickyColumnHeight(stickyHeight);

            if (layoutRect.top > topOffset) {
                setStickyMode("static");
                return;
            }

            if (desiredTopInside >= maxTopInside) {
                setStickyMode("bottom");
                setStickyTop(maxTopInside);
                return;
            }

            setStickyMode("fixed");
            setStickyLeft(stickyColRect.left);
            setStickyWidth(stickyColRect.width || 300);
            setStickyTop(topOffset);
        };

        const onScrollOrResize = () => {
            if (rafId != null) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = null;
                updateStickyMode();
            });
        };

        updateStickyMode();
        window.addEventListener("scroll", onScrollOrResize, { passive: true });
        window.addEventListener("resize", onScrollOrResize);

        return () => {
            window.removeEventListener("scroll", onScrollOrResize);
            window.removeEventListener("resize", onScrollOrResize);
            if (rafId != null) window.cancelAnimationFrame(rafId);
        };
    }, [member, isProjectsLoading, projectCards.length]);

    const stickyCardStyle = stickyMode === "fixed"
        ? { position: "fixed", top: `${stickyTop}px`, left: `${stickyLeft}px`, width: `${stickyWidth}px` }
        : stickyMode === "bottom"
            ? { position: "absolute", top: `${stickyTop}px`, left: 0, width: "100%" }
            : undefined;

    return (
        <>
            <h1 className={classes.visuallyHidden}>
                {member ? `${member.name} — ${member.role || "сотрудник"} ${SITE_NAME}` : "Сотрудник команды"}
            </h1>
            <section className={classes.pageSection}>
                <div className={classes.projectsInner}>
                    {!member ? (
                        <div className={classes.notFound}>Сотрудник не найден</div>
                    ) : (
                        <div className={classes.pageContent}>
                            <nav className={classes.breadcrumbs} aria-label="Хлебные крошки">
                                <Link to="/" className={classes.breadcrumbLink}>Главная</Link>
                                {previousBreadcrumb && (
                                    <>
                                        <span className={classes.breadcrumbSep}>/</span>
                                        <Link to={previousBreadcrumb.to} className={classes.breadcrumbLink}>{previousBreadcrumb.label}</Link>
                                    </>
                                )}
                                <span className={classes.breadcrumbSep}>/</span>
                                <span className={classes.breadcrumbCurrent}>{member.name}</span>
                            </nav>

                            <div className={classes.contentLayout} ref={contentLayoutRef}>
                            <div
                                className={classes.stickyColumn}
                                ref={stickyColumnRef}
                                style={stickyColumnHeight > 0 ? { minHeight: `${stickyColumnHeight}px` } : undefined}
                            >
                            <article
                                className={classes.card}
                                ref={stickyCardRef}
                                style={stickyCardStyle}
                            >
                                <div
                                    className={classes.person_image}
                                    data-cursor="link"
                                    onMouseMove={handleImageMove}
                                    onMouseLeave={resetImageMove}
                                >
                                    <img src={member.image} alt={member.name} style={{ objectPosition: `center ${member.faceY || "24%"}` }} />
                                </div>

                                <div className={classes.info}>
                                    <div className={classes.name}>{member.name}</div>
                                    <div className={classes.role}>{member.role}</div>

                                    {Array.isArray(member.socials) && member.socials.length > 0 && (
                                        <div className={classes.person_link}>
                                            {member.socials.map((social, index) => {
                                                const icon = socialIconByType[social.type];
                                                if (!icon) {
                                                    return null;
                                                }

                                                return (
                                                    <div className={classes.link} key={`${member.slug}-${social.type}-${index}`}>
                                                        <div className={classes.link_logo}>
                                                            <img src={icon} alt={socialTitleByType[social.type] || social.type} />
                                                        </div>
                                                        {social.label ? <div className={classes.title_link}>{social.label}</div> : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </article>
                            </div>

                            <div className={classes.projectsContent}>
                                <div className={classes.projectsHeading}>
                                    <h2 className={classes.projectsTitle}>ПРОЕКТЫ</h2>
                                    {!isProjectsLoading && <span className={classes.projectsCount}>{projectCards.length} работ</span>}
                                </div>

                                {isProjectsLoading ? (
                                    <div className={classes.projectsState}>Загрузка проектов...</div>
                                ) : projectCards.length > 0 ? (
                                    <div className={classes.projectsGrid}>
                                        {projectCards.map((project) => (
                                            <CaseCard
                                                key={project.id}
                                                {...project}
                                                teamItems={projectTeamItems}
                                                cardWidth={PROJECT_CARD_WIDTH}
                                                onClick={() => handleProjectClick(project)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className={classes.projectsState}>У этого сотрудника пока нет опубликованных проектов.</div>
                                )}
                            </div>
                        </div>
                        </div>
                    )}
                </div>
            </section>

            {typeof document !== "undefined"
                ? createPortal(
                    <Modal
                        isOpen={isModalOpen}
                        onClose={handleCloseModal}
                        closeButtonWrapClassName={selectedItem ? caseDetailsModalClasses.closeButtonWrapCase : undefined}
                    >
                        {selectedItem && (
                            <CaseDetailsModal
                                item={selectedItem}
                                teamItems={projectTeamItems}
                                cases={projectCards}
                                onSelectCase={(nextCase) => {
                                    if (!memberSlug || !nextCase?.url_text) return;
                                    setSelectedItem({ ...nextCase, type: "case" });
                                    navigate(`/team/${memberSlug}/case/${nextCase.url_text}`, {
                                        state: { modalBackground: baseEmployeePath },
                                    });
                                }}
                            />
                        )}
                    </Modal>,
                    document.body
                )
                : null}
        </>
    );
}

export default Employee;
