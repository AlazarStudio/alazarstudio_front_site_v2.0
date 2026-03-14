import React from "react";
import classes from './Time_work_block.module.css';

function Time_work_block({}) {
    const leftMetrics = [
        {
            title: "3 МЕСЯЦА",
            subtitle: "необходимо для выпуска первой стабильной версии проекта",
        },
        {
            title: "3 ДНЯ",
            subtitle: "достаточно, чтобы точно оценить стоимость проекта",
        },
        {
            title: "7 ДНЕЙ",
            subtitle: "среднее время создания основного эскиза проекта",
        },
    ];

    const rightMetrics = [
        {
            title: "2 ЧАСА",
            subtitle: "среднее время реагирования",
        },
        {
            title: "4-6",
            subtitle: "специалистов участвует в разработке вашего проекта. Руководитель проекта, дизайнеры, разработчики, тестировщик",
        },
    ];

    return (
        <section className={classes.block}>
            <div className={classes.content}>
                <div className={classes.brandColumn}>
                    <img className={classes.brandImage} src="/ALAZAR.png" alt="ALAZAR STUDIO" />
                </div>

                <div className={classes.metricsColumn}>
                    {leftMetrics.map((metric, index) => (
                        <article key={`${metric.title}-${index}`} className={classes.metric}>
                            <h3 className={classes.metricTitle}>{metric.title}</h3>
                            <p className={classes.metricSubtitle}>{metric.subtitle}</p>
                        </article>
                    ))}
                </div>

                <div className={classes.metricsColumn}>
                    {rightMetrics.map((metric, index) => (
                        <article key={`${metric.title}-${index}`} className={classes.metric}>
                            <h3 className={classes.metricTitle}>{metric.title}</h3>
                            <p className={classes.metricSubtitle}>{metric.subtitle}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Time_work_block;
