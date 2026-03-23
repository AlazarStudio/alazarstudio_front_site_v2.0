import React, { useEffect, useRef, useState } from "react";
import classes from "./Discuss.module.css";
import ParticleImageCanvas from "./ParticleImageCanvas";

const LOGO_ASPECT_RATIO = 3599.16 / 3120.19;
const LOGO_WIDTH_FACTOR = 0.9;
const MOBILE_BREAKPOINT = "(max-width: 767px)";

const FORM_COPY = {
    title: "\u041e\u0431\u0441\u0443\u0434\u0438\u0442\u044c",
    titleAccent: "\u043f\u0440\u043e\u0435\u043a\u0442",
    name: "\u0412\u0430\u0448\u0435 \u0438\u043c\u044f",
    phone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
    company: "\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f",
    budget: "\u0411\u044e\u0434\u0436\u0435\u0442",
    comment: "\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439",
    consent: "\u042f \u0441\u043e\u0433\u043b\u0430\u0441\u0435\u043d \u0441 \u043f\u0440\u0430\u0432\u0438\u043b\u0430\u043c\u0438",
    consentAccent: "\u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0438 \u043f\u0435\u0440\u0441\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 \u0434\u0430\u043d\u043d\u044b\u0445",
    submit: "\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c",
};

function Discuss({ formOnly = false }) {
    const formRef = useRef(null);
    const [particleHeight, setParticleHeight] = useState(0);
    const [hideParticleOnMobile, setHideParticleOnMobile] = useState(() => {
        if (typeof window === "undefined" || !window.matchMedia) {
            return false;
        }

        return window.matchMedia(MOBILE_BREAKPOINT).matches;
    });

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) {
            return undefined;
        }

        const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);
        const syncVisibility = () => {
            setHideParticleOnMobile(mediaQuery.matches);
        };

        syncVisibility();

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", syncVisibility);

            return () => {
                mediaQuery.removeEventListener("change", syncVisibility);
            };
        }

        mediaQuery.addListener(syncVisibility);

        return () => {
            mediaQuery.removeListener(syncVisibility);
        };
    }, []);

    useEffect(() => {
        if (formOnly || hideParticleOnMobile) {
            return undefined;
        }

        const formElement = formRef.current;
        if (!formElement) {
            return undefined;
        }

        const updateParticleHeight = () => {
            setParticleHeight(Math.max(0, Math.round(formElement.getBoundingClientRect().height)));
        };

        updateParticleHeight();

        const resizeObserver = new ResizeObserver(() => {
            updateParticleHeight();
        });

        resizeObserver.observe(formElement);
        window.addEventListener("resize", updateParticleHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", updateParticleHeight);
        };
    }, [formOnly, hideParticleOnMobile]);

    const particleStyle = particleHeight > 0
        ? {
            "--particle-height": `${particleHeight}px`,
            "--particle-width": `${Math.round(particleHeight * LOGO_ASPECT_RATIO * LOGO_WIDTH_FACTOR)}px`,
        }
        : undefined;

    const formBlock = (
        <div
            ref={formOnly ? null : formRef}
            className={`${classes.discuss_form} ${formOnly ? classes.discuss_formOnly : ""}`}
        >
            <form action="/">
                <label className={classes.formTitle}>
                    {FORM_COPY.title}
                    <span> {FORM_COPY.titleAccent}</span>
                </label>

                <input type="text" placeholder={FORM_COPY.name} />
                <input type="text" placeholder={FORM_COPY.phone} />
                <input type="email" placeholder="E-MAIL" />
                <input type="text" placeholder={FORM_COPY.company} />
                <input type="text" placeholder={FORM_COPY.budget} />
                <input type="text" placeholder={FORM_COPY.comment} />

                <label className={classes.formInclude}>
                    <input type="radio" />
                    <p>
                        {FORM_COPY.consent} <span>{FORM_COPY.consentAccent}</span>
                    </p>
                </label>

                <button type="submit">{FORM_COPY.submit}</button>
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

                    {!hideParticleOnMobile && (
                        <div className={classes.discuss_img}>
                            <ParticleImageCanvas
                                alt="Alazar Studio A"
                                className={classes.discuss_particle}
                                style={particleStyle}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Discuss;
