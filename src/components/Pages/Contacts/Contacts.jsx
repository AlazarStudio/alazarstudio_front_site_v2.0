import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import classes from "./Contacts.module.css";
import Discuss from "../../Blocks/Discuss/Discuss";
import YandexMapRoute from "../../YandexMapRoute";

const CONTACT_ADDRESS = "\u0427\u0435\u0440\u043A\u0435\u0441\u0441\u043A, \u041A\u0430\u0432\u043A\u0430\u0437\u0441\u043A\u0430\u044F \u0443\u043B., 56";
const CONTACT_PHONE = "+7 928 399-53-84";
const CONTACT_PHONE_LINK = "+79283995384";
const CONTACT_EMAIL = "info@alazarstudio.ru";

const UI_TEXT = {
    pageTitle: "\u041A\u041E\u041D\u0422\u0410\u041A\u0422\u042B",
    addressLabel: "\u0410\u0414\u0420\u0415\u0421",
    numberLabel: "\u041D\u041E\u041C\u0415\u0420",
    vkLabel: "\u0412\u041A\u041E\u041D\u0422\u0410\u041A\u0422\u0415",
    mapAriaLabel: "\u041A\u0430\u0440\u0442\u0430 \u043E\u0444\u0438\u0441\u0430 ALAZAR STUDIO",
    routeButton: "\u041F\u0420\u041E\u041B\u041E\u0416\u0418\u0422\u042C \u041C\u0410\u0420\u0428\u0420\u0423\u0422",
    recenterAriaLabel: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u0442\u043E\u0447\u043A\u0443 \u0432 \u0446\u0435\u043D\u0442\u0440 \u043A\u0430\u0440\u0442\u044B",
};

const CONTACT_COORDS = {
    latitude: 44.2302999,
    longitude: 42.0572466,
};

const OFFICE_PLACE = [
    {
        id: "alazar-office",
        title: "ALAZAR STUDIO",
        latitude: CONTACT_COORDS.latitude,
        longitude: CONTACT_COORDS.longitude,
    },
];

const SOCIAL_LINKS = {
    telegram: "https://t.me/+79283995384",
    instagram: "https://www.instagram.com/alazarstudio",
    vk: "https://vk.com/alazarstudio",
};

const MAP_CARD_MARGIN = 18;
const MAP_CARD_POINT_OFFSET = 18;
const MAP_CARD_FALLBACK_WIDTH = 336;
const MAP_CARD_FALLBACK_HEIGHT = 190;
const MAP_CARD_DEFAULT_POSITION = {
    left: 32,
    top: 32,
    isOffscreen: false,
    offscreenSide: null,
};

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function detectOffscreenSide(x, y, width, height) {
    const overflow = {
        left: x < 0 ? -x : -1,
        right: x > width ? x - width : -1,
        top: y < 0 ? -y : -1,
        bottom: y > height ? y - height : -1,
    };

    const side = Object.keys(overflow).reduce((maxSide, sideKey) => (
        overflow[sideKey] > overflow[maxSide] ? sideKey : maxSide
    ), "left");

    return overflow[side] > 0 ? side : null;
}

function projectPointToViewport(mapObject, coords) {
    if (!mapObject || !Array.isArray(coords) || coords.length !== 2) {
        return null;
    }

    const mapSize = mapObject.container?.getSize?.();
    if (!Array.isArray(mapSize) || mapSize.length !== 2) {
        return null;
    }

    const [width, height] = mapSize;
    const projection = mapObject.options?.get("projection");
    if (!projection) {
        return null;
    }

    const zoom = mapObject.getZoom();
    const center = mapObject.getCenter();
    if (!Array.isArray(center) || center.length !== 2) {
        return null;
    }

    const pointGlobal = projection.toGlobalPixels(coords, zoom);
    const centerGlobal = projection.toGlobalPixels(center, zoom);

    if (!Array.isArray(pointGlobal) || !Array.isArray(centerGlobal)) {
        return null;
    }

    return {
        x: pointGlobal[0] - centerGlobal[0] + (width / 2),
        y: pointGlobal[1] - centerGlobal[1] + (height / 2),
        width,
        height,
    };
}

function buildYandexRouteUrl(fromCoords) {
    const destination = `${CONTACT_COORDS.latitude},${CONTACT_COORDS.longitude}`;
    const rtext = fromCoords
        ? `${fromCoords[0]},${fromCoords[1]}~${destination}`
        : destination;

    return `https://yandex.ru/maps/?rtext=${encodeURIComponent(rtext)}&rtt=auto`;
}

function Contacts() {
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT_ADDRESS)}`;

    const [activePlaceId, setActivePlaceId] = useState(OFFICE_PLACE[0]?.id ?? null);
    const [mapObject, setMapObject] = useState(null);
    const [mapCardPosition, setMapCardPosition] = useState(MAP_CARD_DEFAULT_POSITION);

    const cardRef = useRef(null);
    const frameRef = useRef(null);

    const activePlace = useMemo(
        () => OFFICE_PLACE.find((place) => place.id === activePlaceId) ?? OFFICE_PLACE[0] ?? null,
        [activePlaceId]
    );

    const activeCoords = useMemo(() => {
        if (!activePlace) {
            return null;
        }

        const latitude = Number(activePlace.latitude);
        const longitude = Number(activePlace.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }

        return [latitude, longitude];
    }, [activePlace]);

    const updateMapCardPosition = useCallback(() => {
        if (!mapObject || !activeCoords) {
            return;
        }

        const point = projectPointToViewport(mapObject, activeCoords);
        if (!point) {
            return;
        }

        const cardWidth = cardRef.current?.offsetWidth ?? MAP_CARD_FALLBACK_WIDTH;
        const cardHeight = cardRef.current?.offsetHeight ?? MAP_CARD_FALLBACK_HEIGHT;

        const minLeft = MAP_CARD_MARGIN;
        const maxLeft = Math.max(minLeft, point.width - cardWidth - MAP_CARD_MARGIN);
        const minTop = MAP_CARD_MARGIN;
        const maxTop = Math.max(minTop, point.height - cardHeight - MAP_CARD_MARGIN);

        const offscreenSide = detectOffscreenSide(point.x, point.y, point.width, point.height);
        const isOffscreen = offscreenSide !== null;

        let left = point.x - (cardWidth / 2);
        let top = point.y - cardHeight - MAP_CARD_POINT_OFFSET;

        if (offscreenSide === "left") {
            left = minLeft;
            top = clamp(point.y - (cardHeight / 2), minTop, maxTop);
        } else if (offscreenSide === "right") {
            left = maxLeft;
            top = clamp(point.y - (cardHeight / 2), minTop, maxTop);
        } else if (offscreenSide === "top") {
            top = minTop;
            left = clamp(point.x - (cardWidth / 2), minLeft, maxLeft);
        } else if (offscreenSide === "bottom") {
            top = maxTop;
            left = clamp(point.x - (cardWidth / 2), minLeft, maxLeft);
        } else {
            left = clamp(left, minLeft, maxLeft);
            top = clamp(top, minTop, maxTop);
        }

        const nextPosition = {
            left,
            top,
            isOffscreen,
            offscreenSide,
        };

        setMapCardPosition((prevPosition) => {
            const isSameX = Math.abs(prevPosition.left - nextPosition.left) < 0.5;
            const isSameY = Math.abs(prevPosition.top - nextPosition.top) < 0.5;
            const isSameVisibility = prevPosition.isOffscreen === nextPosition.isOffscreen;
            const isSameSide = prevPosition.offscreenSide === nextPosition.offscreenSide;

            if (isSameX && isSameY && isSameVisibility && isSameSide) {
                return prevPosition;
            }

            return nextPosition;
        });
    }, [activeCoords, mapObject]);

    const scheduleCardPositionUpdate = useCallback(() => {
        if (frameRef.current !== null) {
            window.cancelAnimationFrame(frameRef.current);
        }

        frameRef.current = window.requestAnimationFrame(() => {
            frameRef.current = null;
            updateMapCardPosition();
        });
    }, [updateMapCardPosition]);

    useEffect(() => {
        if (!mapObject?.events) {
            return undefined;
        }

        const eventNames = ["boundschange", "actiontick", "actiontickcomplete"];

        eventNames.forEach((eventName) => {
            mapObject.events.add(eventName, scheduleCardPositionUpdate);
        });

        window.addEventListener("resize", scheduleCardPositionUpdate);
        scheduleCardPositionUpdate();

        return () => {
            eventNames.forEach((eventName) => {
                try {
                    mapObject.events.remove(eventName, scheduleCardPositionUpdate);
                } catch {
                    // Map could be destroyed before listeners are removed.
                }
            });

            window.removeEventListener("resize", scheduleCardPositionUpdate);

            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, [mapObject, scheduleCardPositionUpdate]);

    useEffect(() => {
        scheduleCardPositionUpdate();
    }, [activeCoords, scheduleCardPositionUpdate]);

    const handleMapReady = useCallback((instance) => {
        setMapObject(instance || null);
    }, []);

    const handlePlacemarkClick = useCallback((place) => {
        if (place?.id) {
            setActivePlaceId(place.id);
        }
    }, []);

    const handleFocusActivePoint = useCallback(() => {
        if (!mapObject || !activeCoords) {
            return;
        }

        const currentZoom = mapObject.getZoom();
        mapObject.setCenter(activeCoords, currentZoom, {
            duration: 350,
            timingFunction: "ease-in-out",
        });

        scheduleCardPositionUpdate();
    }, [activeCoords, mapObject, scheduleCardPositionUpdate]);

    const handleOpenRoute = useCallback(() => {
        const openRoute = (url) => {
            window.open(url, "_blank", "noopener,noreferrer");
        };

        if (!navigator.geolocation) {
            openRoute(buildYandexRouteUrl(null));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const fromCoords = [position.coords.latitude, position.coords.longitude];
                openRoute(buildYandexRouteUrl(fromCoords));
            },
            () => {
                openRoute(buildYandexRouteUrl(null));
            },
            {
                enableHighAccuracy: true,
                timeout: 7000,
            }
        );
    }, []);

    return (
        <>
            <section className={classes.contactsPage}>
                <div className={classes.contactsInner}>
                    <div className={classes.contactsLeft}>
                        <h1 className={classes.contactsTitle}>{UI_TEXT.pageTitle}</h1>

                        <div className={classes.contactsGroup}>
                            <div className={classes.contactsLabel}>{UI_TEXT.addressLabel}</div>
                            <a className={classes.contactsValue} href={mapLink} target="_blank" rel="noreferrer">
                                {CONTACT_ADDRESS}
                            </a>
                        </div>

                        <div className={classes.contactsGroup}>
                            <div className={classes.contactsLabel}>{UI_TEXT.numberLabel}</div>
                            <a className={classes.contactsValue} href={`tel:${CONTACT_PHONE_LINK}`}>
                                {CONTACT_PHONE}
                            </a>
                        </div>

                        <div className={classes.socialList}>
                            <a className={classes.socialLink} href={SOCIAL_LINKS.telegram} target="_blank" rel="noreferrer">
                                TELEGRAM
                                <span className={classes.telegramIcon} aria-hidden="true">{"\u2708"}</span>
                            </a>

                            <a className={classes.socialLink} href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer">
                                INSTAGRAM
                                <img src="/instagram.png" alt="Instagram" />
                            </a>

                            <a className={classes.socialLink} href={SOCIAL_LINKS.vk} target="_blank" rel="noreferrer">
                                {UI_TEXT.vkLabel}
                                <img src="/vk.png" alt="VK" />
                            </a>
                        </div>

                        <div className={classes.contactsGroup}>
                            <div className={classes.contactsLabel}>E-MAIL</div>
                            <a className={classes.contactsValue} href={`mailto:${CONTACT_EMAIL}`}>
                                {CONTACT_EMAIL}
                            </a>
                        </div>
                    </div>

                    <div className={classes.contactsRight}>
                        <Discuss formOnly />
                    </div>
                </div>
            </section>

            <section className={classes.contactsMapSection} aria-label={UI_TEXT.mapAriaLabel}>
                <YandexMapRoute
                    places={OFFICE_PLACE}
                    height={640}
                    className={classes.contactsMapCanvas}
                    onPlacemarkClick={handlePlacemarkClick}
                    onMapReady={handleMapReady}
                    mapControls={["searchControl", "zoomControl"]}
                    controlPositions={{
                        searchControl: { right: 18, top: 14 },
                        zoomControl: { right: 18, top: 86 },
                    }}
                    markerType="dot"
                    markerPreset="islands#pinkCircleDotIcon"
                    markerColor="#E5097F"
                    singlePointZoom={16}
                    restrictMapArea={[[-85, -179.99], [85, 179.99]]}
                    minZoom={2}
                    maxZoom={20}
                />

                <div className={classes.contactsMapOverlay} aria-hidden="true" />

                <div
                    ref={cardRef}
                    className={classes.contactsMapCard}
                    style={{
                        left: `${mapCardPosition.left}px`,
                        top: `${mapCardPosition.top}px`,
                    }}
                >
                    <div className={classes.mapBrandRow}>
                        <div className={classes.mapBrandLogoWrap}>
                            <img className={classes.mapBrandLogo} src="/A.png" alt="" aria-hidden="true" />
                        </div>
                        <img className={classes.mapBrandWordmark} src="/Vector.png" alt="ALAZAR STUDIO" />
                    </div>

                    <button type="button" className={classes.mapRouteButton} onClick={handleOpenRoute}>
                        {UI_TEXT.routeButton}
                    </button>

                    {mapCardPosition.isOffscreen && (
                        <button
                            type="button"
                            className={classes.mapRecenterButton}
                            onClick={handleFocusActivePoint}
                            aria-label={UI_TEXT.recenterAriaLabel}
                        >
                            {"\u2193"}
                        </button>
                    )}
                </div>
            </section>
        </>
    );
}

export default Contacts;