import React from "react";
import classes from './Services_block.module.css';
import CenterBlock from "../../Standart/CenterBlock/CenterBlock";

function Services_block({}) {
    
    return ( 
        
            <div className={classes.block}>
                <CenterBlock>
                <div className={classes.title}>
                    УСЛУГИ
                </div>
                </CenterBlock>
                <div className={classes.block_service}>
                    <div className={classes.block_column_element}>
                        <div className={classes.block_service_title}>
                            ГРАФИЧЕСКИЙ ДИЗАЙН
                        </div>
                        <div className={classes.block_service_list}>
                            <ul>
                                <li>Андентика и логотипы</li>
                                <li>Рекламный и маркетинговый дизайн</li>
                                <li>Полиграфия и печатные материалы</li>
                                <li>Упаковка, презентации, носители, стикерпаки</li>
                            </ul>
                        </div>
                    </div>
                    <div className={classes.block_column_element}>
                        <div className={classes.block_service_title}>
                            от 100 000 ₽
                        </div>
                        <div className={classes.block_service_subtitle}>
                            Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.
                        </div>
                    </div>
                    <div className={classes.block_column_element}>
                        <div className={classes.block_service_button}>
                            Оставить заявку
                        </div>
                        
                    </div>
                    
                    
                </div>
                <div className={classes.block_service}>
                    <div className={classes.block_column_element}>
                        <div className={classes.block_service_title}>
                            ВЕБ-ДИЗАЙН
                        </div>
                        <div className={classes.block_service_list}>
                            <ul>
                                <li>UX/UI дизайн сайтов и сервисов</li>
                                <li>Прототипирование</li>
                                <li>Дизайн сложных интерфейсов</li>
                                <li>Дизайн-системы</li>
                            </ul>
                        </div>
                    </div>
                    <div className={classes.block_column_element}>
                        <div className={classes.block_service_title}>
                            от 100 000 ₽
                        </div>
                        <div className={classes.block_service_subtitle}>
                            Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.
                        </div>
                    </div>
                    <div className={classes.block_column_element}>
                        <div className={classes.block_service_button}>
                            Оставить заявку
                        </div>
                        
                    </div>
                    
                    
                </div>
                <div className={classes.block_service}>
                    <div className={classes.block_column_element}>
                        <div className={classes.block_service_title}>
                            ВЕБ-РАЗРАБОТКА
                        </div>
                        <div className={classes.block_service_list}>
                            <ul>
                                <li>Корпоративные сайты</li>
                                <li>Веб-приложения</li>
                                <li>Мобильные приложения</li>
                                <li>Личные кабинеты, админки</li>
                                <li>Поддержка и развитие</li>
                            </ul>
                        </div>
                    </div>
                    <div className={classes.block_column_element}>
                        <div className={classes.block_service_title}>
                            от 100 000 ₽
                        </div>
                        <div className={classes.block_service_subtitle}>
                            Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.
                        </div>
                    </div>
                    <div className={classes.block_column_element}>
                        <div className={classes.block_service_button}>
                            Оставить заявку
                        </div>
                        
                    </div>
                    
                    
                </div>

            </div>
        
     );
}

export default Services_block;
