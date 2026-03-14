import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Present_block2 from "../../Blocks/Present_block2/Present_block2";
import CaseCard from "../../Blocks/CaseCard/CaseCard";
import { isCaseForShop, mapCaseRecordToCard, mapTeamItems } from "../../Blocks/Cases/casesHelpers";
import { publicCasesAPI, publicTeamAPI } from "@/lib/api";
import classes from "./Employee.module.css";

function normalizeMember(apiMember) {
    return {
        slug: apiMember.id,
        name: apiMember.fio ?? "",
        role: apiMember.dolzhnost ?? "",
        image: apiMember.avatar ?? "",
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

const PROJECT_CARD_WIDTH = "clamp(280px, calc((100% - 50px) / 3), 420px)";

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
    const { memberSlug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [team, setTeam] = useState([]);
    const [projectCards, setProjectCards] = useState([]);
    const [projectTeamItems, setProjectTeamItems] = useState([]);
    const [isProjectsLoading, setIsProjectsLoading] = useState(true);

    const member = useMemo(() => {
        const idFromUrl = memberSlug;
        if (!idFromUrl || !Array.isArray(team) || team.length === 0) return null;
        const found = team.find((item) => String(item.id) === String(idFromUrl));
        return found ? normalizeMember(found) : null;
    }, [team, memberSlug]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const teamRes = await publicTeamAPI.getAll({ page: 1, limit: 500 });
                if (cancelled) return;
                const teamList = Array.isArray(teamRes.data?.team) ? teamRes.data.team : [];
                setTeam(teamList);
                console.log("Team data (from backend, as on About page):", teamList);
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
        if (!project?.url_text) {
            return;
        }

        const projectRoute = project.type === "case"
            ? `/case/${project.url_text}`
            : `/${project.type}/${project.url_text}`;

        navigate(projectRoute, {
            state: { modalBackground: location.pathname },
        });
    };

    useEffect(() => {
        let cancelled = false;

        const loadProjects = async () => {
            if (!member) {
                if (!cancelled) {
                    setProjectCards([]);
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
                    })
                    .map((record) => mapCaseRecordToCard(record, () => ""));

                setProjectCards(memberProjects);
                setProjectTeamItems(rawTeam);
            } catch {
                if (!cancelled) {
                    setProjectCards([]);
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

    return (
        <>
            <Present_block2>
                {!member ? (
                    <div className={classes.notFound}>Сотрудник не найден</div>
                ) : (
                    <article className={classes.card}>
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
                )}
            </Present_block2>

            <section className={classes.projectsSection}>
                <div className={classes.projectsInner}>
                    <h2 className={classes.projectsTitle}>ПРОЕКТЫ</h2>

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
            </section>
        </>
    );
}

export default Employee;
