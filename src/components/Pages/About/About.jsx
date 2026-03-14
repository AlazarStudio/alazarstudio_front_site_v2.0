import React, { useState, useEffect } from "react";
import classes from "./About.module.css";
import Present_block from "../../Blocks/Present_block/Present_block";
import Scalable_block from "../../Blocks/Scalable_block/Scalable_block";
import Services_block from "../../Blocks/Services_block/Services_block";
import Work_block from "../../Blocks/Work_block/Work_block";
import Time_work_block from "../../Blocks/Time_work_block/Time_work_block";
import Team_block from "../../Blocks/Team_block/Team_block";
import { publicServicesAPI, publicTeamAPI } from "@/lib/api";

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

  return (
    <>
      <Present_block />
      <Scalable_block/>
      <Services_block services={services} />
      <Work_block/>
      <Time_work_block/>
      <Team_block team={team} />
    </>
  );
}

export default About;
