import React from "react";
import classes from './Present_block.module.css';

function Present_block({ children, ...props }) {
    return (
        <>
            <div className={classes.present_block}>
                <div className={classes.present_block_center}>
                    <div className={classes.present_block_left}>
                        <div className={classes.present_block_left_text}>web-devolopment</div>
                        <div className={classes.present_block_left_text_large}>&</div>
                        <div className={classes.present_block_left_text_second}>graphic design</div>

                        <div className={classes.present_block_left_text_min}>
                            Комплексные цифровые решения
                            под ключ: от идеи до готового продукта с последующей поддержкой
                        </div>
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