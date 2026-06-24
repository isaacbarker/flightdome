/*
    helpers.js - provides helper functions to abstract main files:
    getting user location from navigator API
    aviation length unit conversion
    angular conversions
 */

// fetch user location from navigator api
export function getUserPosition() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            const options = {
                enableHighAccuracy: true,
            };
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        } else {
            return undefined;
        }
    });
}

// length unit conversions (feet to metres for altitude and metres to nm for distances)
export function feetToMetres(x) {
    return x / 3.281;
}

export function metresToNauticalMiles(x) {
    return x / 1852;
}

// angular unit conversions
export function degToRad(deg) {
    return deg * Math.PI / 180;
}

export function radToDeg(rad) {
    return rad * 180 / Math.PI;
}
