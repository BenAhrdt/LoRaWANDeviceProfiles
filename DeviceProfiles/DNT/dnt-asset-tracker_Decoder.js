// Payloadparser for dnt-LW-ATX products
// tested with firmware at least at version v1.0.2
// Parser version: 1.0.4
//
// wiki.hafenmeister.com
//
// Edit for funktion TTN Mapper & Traccar Webhook with DevEUI and real RX metadata
// Added Benjamin Schmidt 16.10.2024
// Adapted: 2025-12-10

// messages
var POWER_ON = 0;
var HEARTBEAT = 1;
var GNSS_DATA_DECIMAL_DEGREE = 2;
var GNSS_TIMEOUT = 3;
var CONFIG = 4;
var QOS_INFO = 5;
var EXTENDED_GNSS_DATA = 6;

// reason for transmission of coordinates
var BUTTON = 1;
var CYCLE = 2;
var START_MOVING = 3;
var FURTHER_MOVING = 4;
var END_MOVING = 5;
var REQUESTED = 6;
var POR = 7;

function reason_as_str(byte) {
    switch ((byte >> 4)) {
        case BUTTON: return "Button";
        case CYCLE: return "Cycle";
        case START_MOVING: return "Start trip";
        case FURTHER_MOVING: return "Trip";
        case END_MOVING: return "End trip";
        case REQUESTED: return "Requested by User";
        case POR: return "POR";
        default: return "unknown";
    }
}

function decodeUplink(input) {
    var payload = input.bytes;
    var decoded = {};
    var index = 0;

    decoded.Voltage = decode_voltage(payload[index++], 1);

    var next_field = 0;
    var coord = {};
    var config = {};

    while (index < payload.length) {
        next_field = payload[index++];

        if ((next_field & 0x0f) == POWER_ON) {
            decoded.reason = "Start-up";

            decoded.hw_rev = String.fromCharCode(payload[index++]);
            decoded.fw_version = payload[index++] + "." + payload[index++] + "." + payload[index++];
            decoded.bl_version = payload[index++] + "." + payload[index++] + "." + payload[index++];
        }
        else if ((next_field & 0x0f) == HEARTBEAT) {
            decoded.reason = "Heartbeat";
            decoded.gps_activations = (payload[index++] << 16) + (payload[index++] << 8) + payload[index++];
            decoded.gps_timeouts = (payload[index++] << 16) + (payload[index++] << 8) + payload[index++];
            decoded.false_activations = (payload[index++] << 16) + (payload[index++] << 8) + payload[index++];
            decoded.average_ttf = payload[index++] * 2; // resolution 2 sec
        }
        else if ((next_field & 0x0f) == GNSS_DATA_DECIMAL_DEGREE) {
            decoded.reason = reason_as_str(next_field);
            decoded.gnss_info = "Data_DD";

            coord.latitude = parseFloat(uint32(payload.slice(index, index + 4))) / 1000000;
            index += 4;
            coord.longitude = parseFloat(uint32(payload.slice(index, index + 4))) / 1000000;
            index += 4;
            coord.altitude = (payload[index] << 8) + payload[index + 1];
            index += 2;
            coord.hdop = decompress_dop(payload.slice(index, index + 2));
            index += 2;
            coord.ttf = payload[index++] * 2; // resolution 2 sec

            if ((coord.altitude & 0x8000) > 0) {
                coord.altitude = coord.altitude - 0x10000;
            }

            decoded.latitude = coord.latitude;
            decoded.longitude = coord.longitude;
            decoded.altitude = coord.altitude;
            decoded.hdop = coord.hdop;
            decoded.ttf = coord.ttf;
            decoded.sats = payload[index++] || 8; // fallback falls sats nicht vorhanden
        }
        else if ((next_field & 0x0f) == GNSS_TIMEOUT) {
            decoded.reason = reason_as_str(next_field);
            decoded.gnss_info = "Timeout";

            coord.sat_in_view = payload[index++];
            coord.gnss_active_time = payload[index++];

            decoded.latitude = coord.latitude || 0;
            decoded.longitude = coord.longitude || 0;
            decoded.altitude = coord.altitude || 0;
            decoded.sats = coord.sat_in_view || 8;
        }
        else {
            break; // andere Felder überspringen
        }
    }

    // Traccar-kompatible rx_metadata: entweder reale TTN-Metadaten oder Dummy
    var rx_metadata = [];
    if (input.rxMetadata && input.rxMetadata.length > 0) {
        input.rxMetadata.forEach(function(rx) {
            rx_metadata.push({
                gateway_ids: { gtw_id: rx.gatewayID || "unknown-gateway" },
                rssi: rx.rssi || 0,
                snr: rx.snr || 0,
                time: rx.time || new Date().toISOString()
            });
        });
    } else {
        // Dummy, falls keine Metadaten vorhanden
        rx_metadata.push({
            gateway_ids: { gtw_id: "test-gateway" },
            rssi: 0,
            snr: 0,
            time: new Date().toISOString()
        });
    }

    // Traccar-kompatibler Webhook mit DevEUI als device_id
    var webhook = {
        end_device_ids: { device_id: input.devEUI },
        uplink_message: {
            decoded_payload: {
                latitude: decoded.latitude,
                longitude: decoded.longitude,
                altitude: decoded.altitude,
                sats: decoded.sats,
                hdop: decoded.hdop,
                ttf: decoded.ttf
            },
            rx_metadata: rx_metadata
        }
    };

    return webhook;
}

// Hilfsfunktionen unverändert
function decode_voltage(value, offset) {
    var volt = offset + (value >> 6);
    var millivolt = (value & 0x3f) * 20 / 1000;
    return Number((volt + millivolt).toFixed(2));
}

function decompress_dop(bytes) {
    var integer = bytes[0];
    var fraction = bytes[1] * 4 / 100;
    return Number((integer + fraction).toFixed(2));
}

function uint32(bytes) {
    return ((bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0]);
}
