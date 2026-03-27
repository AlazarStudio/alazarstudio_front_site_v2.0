import React from "react";
import classes from './Present_block.module.css';

function Present_block({ heroTitle, heroIntroLines, children, ...props }) {
    const aboutHero = Boolean(heroTitle);
    return (
        <>
            <div className={`${classes.present_block} ${aboutHero ? classes.present_block_aboutRoot : ""}`}>
                <div className={classes.present_block_center}>
                    <div className={classes.present_block_left}>
                        {aboutHero ? (
                            <div className={classes.present_block_about}>
                                <h1 className={classes.present_block_about_h1}>{heroTitle}</h1>
                                {Array.isArray(heroIntroLines) && heroIntroLines.length > 0 && (
                                    <div className={classes.present_block_about_body}>
                                        {heroIntroLines.map((line, i) => (
                                            <p
                                                key={i}
                                                className={
                                                    i === heroIntroLines.length - 1 && heroIntroLines.length > 1
                                                        ? `${classes.present_block_about_line} ${classes.present_block_about_tagline}`
                                                        : classes.present_block_about_line
                                                }
                                            >
                                                {line}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className={classes.present_block_left_text}>Веб-разработка</div>
                                <div className={classes.present_block_left_text_large}>&</div>
                                <div className={classes.present_block_left_text_second}>графический дизайн</div>

                                <div className={classes.present_block_left_text_min}>
                                    Комплексные цифровые решения: от идеи до запуска
                                </div>
                            </>
                        )}
                    </div>
                    <div className={classes.present_block_right}>
                        <img src="/star_glass.png" alt="" />
                        <img src="/arrow_glass.png" alt="" />
                    </div>
                </div>

                <div className={classes.present_block_ellipce}>
                    <div className={`${classes.present_block_line} ${classes.line1}`}></div>
                    <div className={`${classes.present_block_line} ${classes.line2}`}></div>
                    <div className={`${classes.present_block_line} ${classes.line3}`}></div>
                    <div className={`${classes.present_block_line} ${classes.line4}`}></div>
                    <img src="/ellipce-only.png" alt="" />
                </div>
            </div>
        </>
    );
}

export default Present_block;