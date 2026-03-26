import React, { useState, useEffect } from "react";
import classes from "./About.module.css";
import Present_block from "../../Blocks/Present_block/Present_block";
import Scalable_block from "../../Blocks/Scalable_block/Scalable_block";
import Services_block from "../../Blocks/Services_block/Services_block";
import Work_block from "../../Blocks/Work_block/Work_block";
import Team_block from "../../Blocks/Team_block/Team_block";
import Discuss from "../../Blocks/Discuss/Discuss";
import { publicServicesAPI, publicTeamAPI } from "@/lib/api";
import { useSeo } from "@/hooks/useSeo";
import { SITE_BASE_URL, SITE_NAME } from "@/lib/seo";

function About({ children, ...props }) {
  const [services, setServices] = useState([]);
  const [team, setTeam] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [servicesRes, teamRes] = await Promise.all([
          publicServicesAPI.getAll({ page: 1, limit: 500 }),
          publicTeamAPI.getAll({ page: 1, limit: 500 }),
        ]);
        if (cancelled) return;
        const servicesData = servicesRes.data;
        const servicesList = Array.isArray(servicesData) ? servicesData : (servicesData?.services ?? servicesData?.data ?? []);
        setServices(Array.isArray(servicesList) ? servicesList : []);
        const teamList = Array.isArray(teamRes.data?.team) ? teamRes.data.team : [];
        setTeam(teamList);
      } catch {
        if (!cancelled) {
          setServices([]);
          setTeam([]);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useSeo({
    title: `О нас | ${SITE_NAME}`,
    description: "О студии Alazar: экспертиза в веб-разработке, дизайне и комплексной реализации цифровых проектов.",
    pathname: "/about",
    ogType: "website",
    ogImage: "/alazar-logo.png",
    schema: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "О нас",
      url: `${SITE_BASE_URL}/about`,
      description: "Информация о студии Alazar и ключевых направлениях работы.",
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: `${SITE_BASE_URL}/`,
      },
    },
    schemaId: "schema-about-page",
  });

  return (
    <>
      <h1 className={classes.visuallyHidden}>О нас — Alazar Studio</h1>
      <Present_block />
      <Scalable_block/>
      <Services_block services={services} />
      <Work_block/>
      <Team_block team={team} />
      <Discuss source="Страница «О нас»: обсудить проект" />
    </>
  );
}

export default About;
