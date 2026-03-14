import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import classes from "./Contacts.module.css";
import Discuss from "../../Blocks/Discuss/Discuss";
import YandexMapRoute from "../../YandexMapRoute";
import { publicContactsAPI } from "@/lib/api";

const UI_TEXT = {
    pageTitle: "КОНТАКТЫ",
    addressLabel: "АДРЕС",
    numberLabel: "НОМЕР",
    vkLabel: "ВКОНТАКТЕ",
    mapAriaLabel: "Карта офиса ALAZAR STUDIO",
    routeButton: "ПРОЛОЖИТЬ МАРШРУТ",
    recenterAriaLabel: "Вернуть точку в центр карты",
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

function buildYandexRouteUrl(fromCoords, destinationCoords) {
    const destination = `${destinationCoords.latitude},${destinationCoords.longitude}`;
    const rtext = fromCoords
        ? `${fromCoords[0]},${fromCoords[1]}~${destination}`
        : destination;

    return `https://yandex.ru/maps/?rtext=${encodeURIComponent(rtext)}&rtt=auto`;
}

function parseSocialNetworks(str) {
    if (!str) return [];
    try {
        const parsed = typeof str === "string" ? JSON.parse(str) : str;
        if (!parsed?.linkEnabled || !Array.isArray(parsed.values) || !Array.isArray(parsed.links)) {
            return [];
        }
        return parsed.values.map((label, i) => ({
            label: label || "",
            url: parsed.links[i] || "#",
        })).filter((item) => item.url && item.url !== "#");
    } catch {
        return [];
    }
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

async function geocodeAddress(address) {
    if (!address || typeof address !== "string" || !address.trim()) return null;
    const query = address.trim();
    const url = `${NOMINATIM_URL}?${new URLSearchParams({
        q: query,
        format: "json",
        limit: "1",
    })}`;
    const res = await fetch(url, {
        headers: {
            "Accept-Language": "ru",
            "User-Agent": "AlazarStudio-Contacts/1.0",
        },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const first = data?.[0];
    if (!first || first.lat == null || first.lon == null) return null;
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { latitude: lat, longitude: lon };
}

function Contacts() {
    const [contactsData, setContactsData] = useState(null);
    const [contactCoords, setContactCoords] = useState(null);
    const [activePlaceId, setActivePlaceId] = useState("alazar-office");
    const [mapObject, setMapObject] = useState(null);
    const [mapCardPosition, setMapCardPosition] = useState(MAP_CARD_DEFAULT_POSITION);

    const cardRef = useRef(null);
    const frameRef = useRef(null);

    const contact = useMemo(() => {
        const list = contactsData?.contacts;
        if (!Array.isArray(list) || list.length === 0) return null;
        return list.find((c) => c.isPublished !== false) ?? list[0];
    }, [contactsData]);

    const address = useMemo(
        () => contact?.adres ?? "",
        [contact]
    );
    const phoneDisplay = useMemo(
        () => contact?.nomer ?? "",
        [contact]
    );
    const phoneLink = useMemo(() => {
        const raw = contact?.nomer ?? "";
        return raw.replace(/\D/g, "") || "";
    }, [contact]);
    const email = useMemo(
        () => contact?.e_mail ?? "",
        [contact]
    );
    const socialItems = useMemo(
        () => (contact?.sotsial_nye_seti != null ? parseSocialNetworks(contact.sotsial_nye_seti) : []),
        [contact]
    );

    const officePlace = useMemo(
        () =>
            contactCoords
                ? [
                    {
                        id: "alazar-office",
                        title: "ALAZAR STUDIO",
                        latitude: contactCoords.latitude,
                        longitude: contactCoords.longitude,
                    },
                ]
                : [],
        [contactCoords]
    );

    const activePlace = useMemo(
        () => officePlace.find((place) => place.id === activePlaceId) ?? officePlace[0] ?? null,
        [activePlaceId, officePlace]
    );

    useEffect(() => {
        if (!contact?.adres) {
            setContactCoords(null);
            return;
        }
        let cancelled = false;
        geocodeAddress(contact.adres).then((coords) => {
            if (!cancelled) {
                setContactCoords(coords ?? null);
            }
        }).catch(() => {
            if (!cancelled) setContactCoords(null);
        });
        return () => { cancelled = true; };
    }, [contact?.adres]);

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

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await publicContactsAPI.get();
                if (cancelled) return;
                const data = res.data;
                setContactsData(data);
                console.log("Contacts API data:", data);
            } catch {
                if (!cancelled) {
                    setContactsData(null);
                }
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

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
            openRoute(buildYandexRouteUrl(null, contactCoords));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const fromCoords = [position.coords.latitude, position.coords.longitude];
                openRoute(buildYandexRouteUrl(fromCoords, contactCoords));
            },
            () => {
                openRoute(buildYandexRouteUrl(null, contactCoords));
            },
            {
                enableHighAccuracy: true,
                timeout: 7000,
            }
        );
    }, [contactCoords]);

    return (
        <>
            <section className={classes.contactsPage}>
                <div className={classes.contactsInner}>
                    <div className={classes.contactsLeft}>
                        <h1 className={classes.contactsTitle}>{UI_TEXT.pageTitle}</h1>

                        <div className={classes.contactsGroup}>
                            <div className={classes.contactsLabel}>{UI_TEXT.addressLabel}</div>
                            {contactCoords ? (
                                <a
                                    className={classes.contactsValue}
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handleOpenRoute(); }}
                                >
                                    {address}
                                </a>
                            ) : (
                                <span className={classes.contactsValue}>{address}</span>
                            )}
                        </div>

                        <div className={classes.contactsGroup}>
                            <div className={classes.contactsLabel}>{UI_TEXT.numberLabel}</div>
                            <a className={classes.contactsValue} href={`tel:${phoneLink}`}>
                                {phoneDisplay}
                            </a>
                        </div>

                        {socialItems.length > 0 &&
                            <div className={classes.socialList}>
                                {
                                    socialItems.map((item, i) => (
                                        <a
                                            key={i}
                                            className={classes.socialLink}
                                            href={item.url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {item.label.toUpperCase()}
                                        </a>
                                    ))
                                }
                            </div>
                        }

                        <div className={classes.contactsGroup}>
                            <div className={classes.contactsLabel}>E-MAIL</div>
                            <a className={classes.contactsValue} href={`mailto:${email}`}>
                                {email}
                            </a>
                        </div>
                    </div>

                    <div className={classes.contactsRight}>
                        <Discuss formOnly />
                    </div>
                </div>
            </section>

            {contactCoords && (
                <section className={classes.contactsMapSection} aria-label={UI_TEXT.mapAriaLabel}>
                    <YandexMapRoute
                        places={officePlace}
                        height={640}
                        className={classes.contactsMapCanvas}
                        onPlacemarkClick={handlePlacemarkClick}
                        onMapReady={handleMapReady}
                        mapControls={[]}
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

                        {/* {mapCardPosition.isOffscreen && (
                            <button
                                type="button"
                                className={classes.mapRecenterButton}
                                onClick={handleFocusActivePoint}
                                aria-label={UI_TEXT.recenterAriaLabel}
                            >
                                {"\u2193"}
                            </button>
                        )} */}
                    </div>
                </section>
            )}
        </>
    );
}

export default Contacts;