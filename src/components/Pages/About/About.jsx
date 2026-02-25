import React from "react";
import classes from './About.module.css';
import Present_block from "../../Blocks/Present_block/Present_block";

function About({ children, ...props }) {
    return (
        <>
            <Present_block />
        </>
    );
}

export default About;