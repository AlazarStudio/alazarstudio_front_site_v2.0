import React from "react";
import classes from "./About.module.css";
import Present_block from "../../Blocks/Present_block/Present_block";
import Scalable_block from "../../Blocks/Scalable_block/Scalable_block";
import Services_block from "../../Blocks/Services_block/Services_block";
import Work_block from "../../Blocks/Work_block/Work_block";
import Time_work_block from "../../Blocks/Time_work_block/Time_work_block";
import Team_block from "../../Blocks/Team_block/Team_block";

function About({ children, ...props }) {
  return (
    <>
      <Present_block />
      <Scalable_block/>
      <Services_block/>
      <Work_block/>
      <Time_work_block/>
      <Team_block/>
    </>
  );
}

export default About;
