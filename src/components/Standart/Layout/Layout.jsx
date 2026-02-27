import React from "react";
import { Outlet } from "react-router-dom";

import Header from "../../Blocks/Header/Header"
import Footer from "../../Blocks/Footer/Footer";
import CustomCursor from "../../Cursor/CustomCursor";


function Empty({ children, ...props }) {
    return (
        <>
            <CustomCursor />
            <Header/>
            <Outlet />
            <Footer/>
        </>
    );
}

export default Empty;