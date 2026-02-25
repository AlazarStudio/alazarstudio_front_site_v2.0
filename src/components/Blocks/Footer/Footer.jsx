import React from "react";
import classes from './Footer.module.css';

function Footer({ children, ...props }) {
    function getCurrentYear() {
        return new Date().getFullYear();
    }
    return (
        <footer className={classes.footer}>
            ©{getCurrentYear()} Alazar Studio. All right reserved.
        </footer>
    );
}

export default Footer;