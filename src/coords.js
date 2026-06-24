/*
    coords.js - provides helper functions for converting between different earth based coordinate systems:
    ellipsoidal (LLA)
    cartesian (ECEF)
    east, north, up (ENU),
    azimuth, elevation, range (AER)

    for details on the calculations:
    https://gssc.esa.int/navipedia/index.php/Transformations_between_ECEF_and_ENU_coordinates
    https://gssc.esa.int/navipedia/index.php/Ellipsoidal_and_Cartesian_Coordinates_Conversion
 */

import {Vector3} from '@math.gl/core';

import {degToRad, radToDeg} from "./helpers.js"

// physical constants
const a = 6378137.0 // earth semi-major axis (m) (WGS_84)
const f = 1/(298.257223563) // flattening factor (WGS_84)
const e_2 = 2 * f - f**2 // eccentricity (WGS_84)

// from ellipsoidal to cartesian coordinates
export function llaToECEF(lat, lng, h) {
    // convert to radians
    const phi = degToRad(lat);
    const lambda = degToRad(lng);

    // calc radius of curvature for prime vertical
    const N = a / Math.sqrt(1 - e_2 * Math.sin(phi)**2);

    const x = (N+h) * Math.cos(phi) * Math.cos(lambda);
    const y = (N+h) * Math.cos(phi) * Math.sin(lambda);
    const z = ((1 - e_2) * N + h) * Math.sin(phi);

    return new Vector3(x, y, z);
}

// from cartesian to east north up
export function ecefToENU(x, y, z, lat0, lng0, h0) {
    // compute line of sight vector, rDelta
    const r0 = llaToECEF(lat0, lng0, h0);
    const rSat = new Vector3(x, y, z);
    const rDelta = rSat.clone().subtract(r0);

    // calculate enu unit vectors
    const phi = degToRad(lat0);
    const lambda = degToRad(lng0);

    const e = new Vector3(-Math.sin(lambda), Math.cos(lambda), 0);
    const n = new Vector3(
        -Math.cos(lambda) * Math.sin(phi),
        -Math.sin(lambda) * Math.sin(phi),
        Math.cos(phi)
    );
    const u = new Vector3(
        Math.cos(lambda) * Math.cos(phi),
        Math.sin(lambda) * Math.cos(phi),
        Math.sin(phi)
    );

    // calculate ENU coordinates
    const E = rDelta.dot(e);
    const N = rDelta.dot(n);
    const U = rDelta.dot(u);

    return new Vector3(E, N, U);
}

// from ellipsoidal to azimuth, elevation and range
export function llaToAER(lat, lng, h, lat0, lng0, h0) {
    // get ENU coords of satellite in observer frame
    const rSat = llaToECEF(lat, lng, h);
    const ENU = ecefToENU(...rSat, lat0, lng0, h0);

    const E = ENU.x;
    const N = ENU.y;
    const U = ENU.z;

    // calculate AER coordinates
    const Az = radToDeg(Math.atan2(E, N));
    const El = radToDeg(Math.atan2(U, Math.sqrt(E*E + N*N)));
    const Ra = Math.sqrt(E*E + N*N + U*U);

    return new Vector3(El, Az, Ra);
}