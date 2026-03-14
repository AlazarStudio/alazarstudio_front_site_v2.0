import React from "react";
import classes from './Work_block.module.css';
import CenterBlock from "../../Standart/CenterBlock/CenterBlock";

function Work_block({}) {
    const cards = [
        { imageSrc: "/list1.png", title: "Знакомство и разбор задачи" },
        { imageSrc: "/list2.png", title: "Анализ и предложение решения" },
        { imageSrc: "/list3.png", title: "Дизайн / архитектура" },
        { imageSrc: "/list4.png", title: "Реализацияи тестирование" },
        { imageSrc: "/list5.png", title: "Передача, поддержка, развитие" },
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
        <>
    
        <CenterBlock>
            <div className={classes.title}>
                КАК МЫ РАБОТАЕМ
            </div>
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
        </>
     );
}

export default Work_block;
