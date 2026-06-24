/*
    aircraftManager.js - manages aircraft polling from api, position updates and deadheading
 */

import {feetToMetres, metresToNauticalMiles} from "../helpers.js";
import {llaToAER} from "../coords.js";
import {Aircraft} from "./aircraft.js";

// constants
const EARTH_RADIUS = 6.371e6 // mean earth radius (m)

// configuration variables
const FLIGHT_DATA_URL = "https://api.airplanes.live/v2/point"; // airplanes.live api url

export class AircraftManager {

    constructor(location, scene, minElevationDeg, furthestAircraftAltFeet, pollInterval) {
        this.location = location;
        this.scene = scene;
        this.minElevationDeg = minElevationDeg;
        this.furthestAircraftAltFeet = furthestAircraftAltFeet;
        this.pollInterval = pollInterval;

        this.aircraft = {};
    }

    async startAircraftPolling() {
        // setup interval loop
        await this.getAircraft();

        setInterval(async () => {
            await this.getAircraft();
        }, this.pollInterval);
    }

    // set user location
    setLocation(location) {
        this.location = location;
    }

    // set min elevation
    setMinElevationDeg(minElevationDeg) {
        this.minElevationDeg = minElevationDeg;
    }

    // set furthest aircraft altitude
    setFurthestAircraftAltFeet(furthestAircraftAltFeet) {
        this.furthestAircraftAltFeet = furthestAircraftAltFeet;
    }

    // set poll interval
    setPollInterval(pollInterval) {
        this.pollInterval = pollInterval;
    }

    // function to fetch aircraft in vicinity to use and filter based on angular elevation
    async getAircraft() {
        // calculate search radius as viewable distance for a plane
        const userHorizonDistance = Math.sqrt(2 * EARTH_RADIUS * this.location.alt);
        const furthestAircraftAlt = feetToMetres(this.furthestAircraftAltFeet);
        const furthestAircraftHorizonDistance = Math.sqrt(2 * EARTH_RADIUS * furthestAircraftAlt);
        const searchRadiusMetres = furthestAircraftHorizonDistance + userHorizonDistance;
        const searchRadiusNM = metresToNauticalMiles(searchRadiusMetres);

        // fetch aircraft with search radius
        let data = await fetch(`${FLIGHT_DATA_URL}/${this.location.lat}/${this.location.lng}/${searchRadiusNM}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                } else {
                    return response.json();
                }
            })

        const aircraftData = data.ac;

        // if aircraft list is empty then ignore
        if (!aircraftData || aircraftData.length === 0) {
            return;
        }

        // filter aircraft based on angular elevation
        const filteredAircraftData = [];

        for (const [key, aircraft] of Object.entries(aircraftData)) {
            // ignore aircraft with no altitude
            if (!Number.isFinite(aircraft.alt_baro)) continue;

            // calculate AER for aircraft
            const AER = llaToAER(
                aircraft.lat,
                aircraft.lon,
                feetToMetres(aircraft.alt_baro),
                this.location.lat,
                this.location.lng,
                this.location.alt
            );

            const elevation = AER.x;

            if (elevation > this.minElevationDeg) {
                filteredAircraftData.push(aircraft);
            }
        }

        // update static aircraft object with currently loaded aircraft and deadhead
        const seenCallsigns = new Set();

        // create or update
        for (const [key, aircraft] of Object.entries(filteredAircraftData)) {
            const callsign = aircraft.flight;
            seenCallsigns.add(callsign);

            if (callsign in this.aircraft) {
                this.aircraft[callsign].update(aircraft);
            } else {
                this.aircraft[callsign] = new Aircraft(aircraft, this.location, this.scene);
            }
        }

        // deadhead
        for (const cs in this.aircraft) {
            if (!seenCallsigns.has(cs)) {
                this.removeAircraft(cs);
            }
        }
    };

    // clear aircraft list
    clearAircraft() {
        for (const cs in this.aircraft) {
            this.removeAircraft(cs);
        }
    }

    // remove an aircraft
    removeAircraft(cs) {
        this.scene.remove(this.aircraft[cs].sprite);
        this.scene.remove(this.aircraft[cs].text);
        this.scene.remove(this.aircraft[cs].mesh);
        this.scene.remove(this.aircraft[cs].obj);
        delete this.aircraft[cs]
    }

    // function to draw aircraft
    drawAircraft() {
        for (const [key, val] of Object.entries(this.aircraft)) {
            val.draw();
        }
    }
}