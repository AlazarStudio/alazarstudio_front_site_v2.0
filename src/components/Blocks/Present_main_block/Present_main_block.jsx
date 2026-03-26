import React from "react";
import classes from './Present_main_block.module.css';
import ParticleImageCanvas from "../Discuss/ParticleImageCanvas";

const SCATTER_VARIANT = "random";
// Доступные варианты: random, sphere, ring, spiral, grid, line, from-left, from-right

function Present_main_block({ children, ...props }) {
    return (
        <>
            <div className={classes.present_block}>
                <div className={classes.present_block_center}>
                    <div className={classes.prespresent_block_left}>
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
                    <div className={classes.prespresent_block_right}>
                        <div className={classes.prespresent_block_right_name}>ALAZAR STUDIO</div>
                        <div className={classes.prespresent_block_right_description}>
                            студия WEB-разработки и графического дизайна
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Present_main_block;