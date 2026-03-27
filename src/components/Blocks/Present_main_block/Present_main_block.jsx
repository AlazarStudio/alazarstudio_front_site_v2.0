import React from "react";
import classes from './Present_main_block.module.css';
import ParticleImageCanvas from "../Discuss/ParticleImageCanvas";

const SCATTER_VARIANT = "random";
// Доступные варианты: random, sphere, ring, spiral, grid, line, from-left, from-right

function Present_main_block({ children, ...props }) {
    return (
        <>
            <section className={classes.present_block} aria-labelledby="main-hero-title">
                <div className={classes.present_block_center}>
                    <div className={classes.prespresent_block_left}>
                        <div className={classes.presentLetterContainer}>
                            <img src="/mainLetter.svg" alt="Alazar Studio A" className={classes.presentLetter} />
                        </div>
                        <div className={classes.presentParticleContainer}>
                            <ParticleImageCanvas
                                alt="Alazar Studio A"
                                className={classes.presentParticle}
                                bleedMultiplier={4}
                                bleedViewportRatio={1}
                                constrainBleedByView={false}
                                assembleOnFirstVisible={true}
                                initialScatterStrength={1.5}
                                initialScatterShape={SCATTER_VARIANT}
                            />
                        </div>
                    </div>
                    <div className={classes.prespresent_block_right}>
                        <h1
                            id="main-hero-title"
                            className={classes.prespresent_block_right_name}
                            aria-describedby="main-hero-description"
                        >
                            <span className={classes.prespresent_block_right_name_subtitle}>
                                студия WEB-разработки и графического дизайна
                            </span>
                            ALAZAR STUDIO
                        </h1>
                        <p id="main-hero-description" className={classes.prespresent_block_right_description_secondary}>
                            Комплексные цифровые решения: <br />от идеи до запуска
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
}

export default Present_main_block;