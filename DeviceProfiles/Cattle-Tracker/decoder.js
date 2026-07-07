/*
This is a javascript decoder for the GlobalSat LT-10/LT-20 LORAWAN GPS tracker.
The decoder is built to work with TheThingsNetwork/Stack V3
Special thanks to Gul-Dukat, AH and akenza.io for initial work.
The script was found on the Forum of TheThingsNetwork. But it had some flaws, where
".toString(16)" would remove the leading zero of a hex-string, so sometimes it would happen to
get the wrong latitude/longitude.
Example Payloads (FPort 1):
With GPS Fix:
80089E3856005123424300
No Fix:
8008000000000000025901
*/

// Functions Convert HEX to Bits
function hexToBits(hex) {
    var out = "";
    for (var c of hex) {
        switch (c) {
            case '0': out += "0000"; break;
            case '1': out += "0001"; break;
            case '2': out += "0010"; break;
            case '3': out += "0011"; break;
            case '4': out += "0100"; break;
            case '5': out += "0101"; break;
            case '6': out += "0110"; break;
            case '7': out += "0111"; break;
            case '8': out += "1000"; break;
            case '9': out += "1001"; break;
            case 'a': out += "1010"; break;
            case 'b': out += "1011"; break;
            case 'c': out += "1100"; break;
            case 'd': out += "1101"; break;
            case 'e': out += "1110"; break;
            case 'f': out += "1111"; break;
            case 'A': out += "1010"; break;
            case 'B': out += "1011"; break;
            case 'C': out += "1100"; break;
            case 'D': out += "1101"; break;
            case 'E': out += "1110"; break;
            case 'F': out += "1111"; break;
            default: return "";
        }
    }
    return out;
}

// Convert Bits to Signed INT
function bitsToSigned(bits) {
    var value = parseInt(bits, 2);
    var limit = 1 << (bits.length - 1);

    if (value >= limit) {
        value = value - limit - limit;
    }
    return value;
}

function bitsToUnsigned(bits) {
    return parseInt(bits, 2);
}

function toLittleEndianSigned(hex) {
    var hexArray = [];
    while (hex.length >= 2) {
        hexArray.push(hex.substring(0, 2));
        hex = hex.substring(2, hex.length);
    }
    hex = hexArray.join('');

    var hex2bits = hexToBits(hex);
    var signedInt = bitsToSigned(hex2bits);

    return signedInt;
}

// Add leading zero if toString(16) removed it
function toPaddedHexString(number) {
    var hex = number.toString(16).toLowerCase();
    if (hex.length % 2 !== 0) {
        hex = '0' + hex;
    }
    return hex;
}

function decodeUplink(input) {
    var data = {};
    var warnings = [];

    var gps = Math.round((bitsToUnsigned(hexToBits(toPaddedHexString(input.bytes[8] << 8))) / 256) / 32);

    if (gps === 0) {
        data.gps = "No fix";
    } else if (gps === 1) {
        data.gps = "2D fix";
    } else if (gps === 2) {
        data.gps = "3D fix";
    } else {
        data.gps = "Unknown";
    }

    if (gps !== 0) {
        var longitudeInteger = (input.bytes[2]) + (input.bytes[3] << 8) + (input.bytes[4] << 16);
        data.longitude = ((toLittleEndianSigned(toPaddedHexString(longitudeInteger))) * 215) / 10 * 0.000001;

        var latitudeInteger = (input.bytes[5]) + (input.bytes[6] << 8) + (input.bytes[7] << 16);
        data.latitude = ((toLittleEndianSigned(toPaddedHexString(latitudeInteger))) * 108) / 10 * 0.000001;
    }

    data.batterypercent = bitsToUnsigned(hexToBits(toPaddedHexString(input.bytes[9] << 8))) / 256;

    return {
        data: data,
        warnings: warnings
    };
}
