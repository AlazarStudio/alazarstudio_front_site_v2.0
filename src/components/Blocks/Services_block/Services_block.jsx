import React from "react";
import classes from './Services_block.module.css';
import CenterBlock from "../../Standart/CenterBlock/CenterBlock";

function parseSpisok(spisok) {
  if (typeof spisok !== 'string') return [];
  try {
    const parsed = JSON.parse(spisok);
    return Array.isArray(parsed?.values) ? parsed.values : [];
  } catch {
    return [];
  }
}

function Services_block({ services = [] }) {
  const published = Array.isArray(services) ? services.filter((s) => s?.isPublished !== false) : [];

  return (
    <div className={classes.block}>
      <CenterBlock>
        <div className={classes.title}>
          УСЛУГИ
        </div>
      </CenterBlock>
      {published.map((service) => {
        const listItems = parseSpisok(service.spisok);
        return (
          <div key={service.id} className={classes.block_service}>
            <div className={classes.block_column_element}>
              <div className={classes.block_service_title}>
                {service.nazvanie ?? ''}
              </div>
              {listItems.length > 0 && (
                <div className={classes.block_service_list}>
                  <ul>
                    {listItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className={classes.block_column_element}>
              <div className={classes.block_service_title}>
                {service.tsena ?? ''}
              </div>
              {service.opisanie && (
                <div
                  className={classes.block_service_subtitle}
                  dangerouslySetInnerHTML={{ __html: service.opisanie }}
                />
              )}
            </div>
            <div className={classes.block_column_element}>
              <div className={classes.block_service_button}>
                Оставить заявку
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Services_block;
