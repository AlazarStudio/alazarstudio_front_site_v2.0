import React from "react";
import classes from './Scalable_block.module.css';
import CenterBlock from "../../Standart/CenterBlock/CenterBlock";

function Scalable_block({}) {
    const cards = [
        { imageSrc: "/message_glass.png", title: "Понятная коммуникация и процессы" },
        { imageSrc: "/lightning_glass.png", title: "Дизайн, который масштабируется" },
        { imageSrc: "/settings_glass.png", title: "Разработка, готовая к росту и доработкам" },
        { imageSrc: "/heart_glass.png", title: "Работаем без лишней бюрократии и «воды»" },
    ];

    const handleImageLoad = (event) => {
        const imageElement = event.currentTarget;
        const imageWrapper = imageElement.parentElement;
        const source = imageElement.currentSrc || imageElement.getAttribute("src");

        if (imageWrapper && source) {
            imageWrapper.style.setProperty("--glass-mask-image", `url("${source}")`);
        }
    };

    return ( 
        <CenterBlock>
            <div className={classes.block_row}>
                {cards.map((card, index) => (
                    <div className={classes.block} key={`${card.imageSrc}-${index}`}>
                        <div
                            className={classes.block_image}
                            style={{ "--glass-mask-image": `url("${card.imageSrc}")` }}
                        >
                            <img
                                className={classes.image}
                                src={card.imageSrc}
                                alt=""
                                onLoad={handleImageLoad}
                            />
                        </div>
                        <div className={classes.subtitle}>{card.title}</div>
                    </div>
                ))}
            </div>
        </CenterBlock>
     );
}

export default Scalable_block;
