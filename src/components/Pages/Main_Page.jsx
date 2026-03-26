import React from "react";
import Present_main_block from "../Blocks/Present_main_block/Present_main_block"
import Cases from "../Blocks/Cases/Cases";
import Discuss from "../Blocks/Discuss/Discuss";
import VideoStart from "../Blocks/VideoStart/VideoStart";
import SiteDevGate from '@/components/SiteDevGate'

function Main_Page({ children, ...props }) {
    return (
        <>
            <Present_main_block />
            {/* <VideoStart /> */}
            <Cases />
            <Discuss />
        </>
    );
}

export default Main_Page;

