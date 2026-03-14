import React from "react";
import classes from "./Present_block2.module.css";

const stageItems = [
    { key: "heart", image: "/glass_heart2.png", alt: "Glass heart", className: "itemHeart" },
    { key: "lightning", image: "/lightning_glass2.png", alt: "Glass lightning", className: "itemLightning" },
    { key: "plus", image: "/glass_plus.png", alt: "Glass plus", className: "itemPlus" },
    { key: "square", image: "/glass-square.png", alt: "Glass square", className: "itemSquare" },
    { key: "star", image: "/glass_star.png", alt: "Glass star", className: "itemStar" },
];

function Present_block2({ children }) {
    return (
        <section className={classes.present_block}>
            <div className={classes.present_block_center}>
                <div className={classes.leftSlot}>{children}</div>

                <div className={classes.imagesStage}>
                    {stageItems.map((item) => (
                        <div
                            key={item.key}
                            className={`${classes.stageItem} ${classes[item.className]}`}
                            style={{ "--glass-mask-image": `url("${item.image}")` }}
                        >
                            <img className={classes.stageItemImage} src={item.image} alt={item.alt} />
                        </div>
                    ))}
                </div>
            </div>

            <div className={classes.present_block_ellipce}>
                <div className={`${classes.present_block_line} ${classes.line1}`}></div>
                <div className={`${classes.present_block_line} ${classes.line2}`}></div>
                <div className={`${classes.present_block_line} ${classes.line3}`}></div>
                <div className={`${classes.present_block_line} ${classes.line4}`}></div>
                <img src="/ellipce-only.png" alt="" />
            </div>
        </section>
    );
}

export default Present_block2;
