import React from "react";
import Present_block from "../Blocks/Present_block/Present_block"
import Cases from "../Blocks/Cases/Cases";
import Discuss from "../Blocks/Discuss/Discuss";
import VideoStart from "../Blocks/VideoStart/VideoStart";
import SiteDevGate from '@/components/SiteDevGate'

function Main_Page({ children, ...props }) {
    return (
        <>
            {/* <VideoStart /> */}
            <Cases />
            <Discuss />
        </>
    );
}

export default Main_Page;

