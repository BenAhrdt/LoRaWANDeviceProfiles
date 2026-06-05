// DataCake
function Decoder(bytes, port){
    var decoded = decodeUplink({ bytes: bytes, fPort: port }).data;
    return decoded;
}

// Milesight
function Decode(port, bytes){
    var decoded = decodeUplink({ bytes: bytes, fPort: port }).data;
    return decoded;
}

// The Things Industries / Main
function decodeUplink(input) {
    try {
        var bytes = input.bytes;
        var data = {};

        var batteryVoltageMax = 3.00;
        var batteryVoltageMin = 2.50;

        function clamp(value, min, max) {
            return Math.min(max, Math.max(min, value));
        }

        function calculateBatteryPercent(voltage) {
            var percent = ((voltage - batteryVoltageMin) / (batteryVoltageMax - batteryVoltageMin)) * 100;
            return Number(clamp(percent, 0, 100).toFixed(0));
        }

        function handleKeepalive(bytes, data) {
            // Byte 1 (bits 1:0) and Byte 2: Internal temperature sensor data
            // Formula: t[°C] = (T[9:0] - 400) / 10
            var tempHighBits = (bytes[1] & 0x03) << 8;
            var tempLowBits = bytes[2];
            var tempValue = tempHighBits | tempLowBits;
            data.sensorTemperature = Number(((tempValue - 400) / 10).toFixed(2));
            
            // Byte 3: Relative Humidity data
            // Formula: RH[%] = (XX * 100) / 256
            data.relativeHumidity = Number(((bytes[3] * 100) / 256).toFixed(2));
            
            // Bytes 4-5: Light sensor data
            // Byte 4: bits [15:8], Byte 5: bits [7:0]
            var lightValue = (bytes[4] << 8) | bytes[5];
            if (lightValue === 0xFFFF) {
                data.light = "Disabled";
            } else if (lightValue >= 0xFFFC && lightValue <= 0xFFFE) {
                data.light = "Sensor Error";
            } else {
                data.light = lightValue;
            }
            
            // Byte 6: Battery Voltage
            // Battery voltage [mV] = ((XX * 2200) / 255) + 1600
            data.batteryVoltage = Number(((((bytes[6] * 2200) / 255) + 1600) / 1000).toFixed(2));
            data.batteryPercent = calculateBatteryPercent(data.batteryVoltage);
            
            // Byte 7 bit 0: Occupancy Flag (1 = Occupied, 0 = Unoccupied)
            var occupiedValue = bytes[7] & 0x01;
            data.occupied = occupiedValue === 1;
            
            // Bytes 8-9: PIR trigger count
            // Byte 8: bits [15:8], Byte 9: bits [7:0]
            data.pirTriggerCount = (bytes[8] << 8) | bytes[9];
            
            return data;
        }

        function handleResponse(bytes, data){
            var commands = bytes.map(function(byte){
                return ("0" + byte.toString(16)).substr(-2); 
            });
            commands = commands.slice(0,-10); 
            var command_len = 0;
        
            commands.map(function (command, i) {
                switch (command) {
                    case '04':
                        {
                            command_len = 2;
                            var hardwareVersion = commands[i + 1];
                            var softwareVersion = commands[i + 2];
                            data.deviceVersions = { hardware: Number(hardwareVersion), software: Number(softwareVersion) };
                        }
                    break;
                    case '12':
                        {
                            command_len = 1;
                            data.keepAliveTime = parseInt(commands[i + 1], 16);
                        }
                    break;
                    case '19':
                        {
                            command_len = 1;
                            var commandResponse = parseInt(commands[i + 1], 16);
                            var periodInMinutes = commandResponse * 5 / 60;
                            data.joinRetryPeriod = periodInMinutes;
                        }
                    break;
                    case '1b':
                        {
                            command_len = 1;
                            data.uplinkType = parseInt(commands[i + 1], 16);
                        }
                    break;
                    case '1d':
                        {
                            command_len = 2;
                            var wdpC = commands[i + 1] == '00' ? false : parseInt(commands[i + 1], 16);
                            var wdpUc = commands[i + 2] == '00' ? false : parseInt(commands[i + 2], 16);
                            data.watchDogParams= { wdpC: wdpC, wdpUc: wdpUc } ;
                        }
                    break;
                    case '1f':
                        {
                            command_len = 1;
                            data.lightSensorState = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '22':
                        {
                            command_len = 3;
                            data.ledBrightness = {
                                red: parseInt(commands[i + 1], 16),
                                green: parseInt(commands[i + 2], 16),
                                blue: parseInt(commands[i + 3], 16)
                            };
                        }
                        break;
                    case '37':
                        {
                            command_len = 1;
                            data.pirSensorState = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case '39':
                        {
                            command_len = 2;
                            data.occupancyTimeout = (parseInt(commands[i + 1], 16) << 8) | parseInt(commands[i + 2], 16);
                        }
                        break;
                    case '3b':
                        {
                            command_len = 1;
                            data.pirDemoMode = parseInt(commands[i + 1], 16);
                        }
                        break;
                    case 'a4': {
                        command_len = 1;
                        data.region = parseInt(commands[i + 1], 16);
                        break;
                    }
                    default:
                        break;
                }
                commands.splice(i,command_len);
            });
            return data;
        }

        // Route the message based on the command byte
        if (bytes[0] == 1) {
            data = handleKeepalive(bytes, data);
        } else {
            data = handleResponse(bytes, data);
            if (bytes.length >= 10) {
                bytes = bytes.slice(-10);
                data = handleKeepalive(bytes, data);
            }
        }

        return { data: data };
    } catch (e) {
        throw new Error('Unhandled data');
    }
}
