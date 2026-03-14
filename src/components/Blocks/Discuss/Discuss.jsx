import React from "react";
import classes from "./Discuss.module.css";
import Spline from "@splinetool/react-spline";

function Discuss({ formOnly = false }) {
    const formBlock = (
        <div className={`${classes.discuss_form} ${formOnly ? classes.discuss_formOnly : ""}`}>
            <form action="/">
                <label className={classes.formTitle}>Обсудить <span> проект</span></label>

                <input type="text" placeholder="Ваше имя" />
                <input type="text" placeholder="Телефон" />
                <input type="email" placeholder="E-MAIL" />
                <input type="text" placeholder="Компания" />
                <input type="text" placeholder="Бюджет" />
                <input type="text" placeholder="Комментарий" />

                <label className={classes.formInclude}>
                    <input type="radio" />
                    <p>
                        Я согласен с правилами <span>обработки персональных данных</span>
                    </p>
                </label>

                <button type="submit">Отправить</button>
            </form>
            <img src="/formBG.png" alt="" className={classes.formBG} />
        </div>
    );

    if (formOnly) {
        return formBlock;
    }

    return (
        <div className={classes.discussContainer}>
            <div className={"centerBlock"}>
                <div className={classes.discuss}>
                    {formBlock}

                    <div className={classes.discuss_img}>
                        <Spline scene="https://prod.spline.design/mdUufwDujdtDbig0/scene.splinecode" />
                        <div className={classes.hiddenBlock}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Discuss;
