function toBool(value) {
    return value === 1 || value === true || value === '1';
}

function roundToOne(num) {
    return +(Math.round(num + "e+1") + "e-1");
}

function merge_obj(obj1, obj2) {
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname2 in obj2) { obj3[attrname2] = obj2[attrname2]; }
    return obj3;
}

function handleKeepalive(bytes) {
    if (bytes.length < 9) {
        return {};
    }

    let tmp = ("0" + (bytes[6] !== undefined ? bytes[6].toString(16) : "00")).substr(-2);
    let motorRange1 = tmp[1];
    let motorRange2 = ("0" + (bytes[5] !== undefined ? bytes[5].toString(16) : "00")).substr(-2);
    let motorRange = parseInt("0x" + motorRange1 + motorRange2, 16);

    let motorPos2 = ("0" + (bytes[4] !== undefined ? bytes[4].toString(16) : "00")).substr(-2);
    let motorPos1 = tmp[0];
    let motorPosition = parseInt("0x" + motorPos1 + motorPos2, 16);

    let batteryTmp = ("0" + (bytes[7] !== undefined ? bytes[7].toString(16) : "00")).substr(-2)[0];
    let batteryVoltageCalculated = 2 + parseInt("0x" + batteryTmp, 16) * 0.1;

    let decbin = (number) => {
        if (number < 0) {
            number = 0xFFFFFFFF + number + 1;
        }
        number = number.toString(2);
        return "00000000".substr(number.length) + number;
    };

    let byte7Bin = decbin(bytes[7] !== undefined ? bytes[7] : 0);
    let openWindow = byte7Bin[4];
    let highMotorConsumption = byte7Bin[5];
    let lowMotorConsumption = byte7Bin[6];
    let brokenSensor = byte7Bin[7];

    let byte8Bin = decbin(bytes[8] !== undefined ? bytes[8] : 0);
    let childLock = byte8Bin[0];
    let calibrationFailed = byte8Bin[1];
    let attachedBackplate = byte8Bin[2];
    let perceiveAsOnline = byte8Bin[3];
    let antiFreezeProtection = byte8Bin[4];

    let sensorTemp = 0;
    if (bytes[0] === 1) {
        sensorTemp = (bytes[2] !== undefined ? bytes[2] : 0) * 165 / 256 - 40;
    }
    if (bytes[0] === 129) {
        sensorTemp = (bytes[2] !== undefined ? bytes[2] : 0 - 28.33333) / 5.66666;
    }

    let data = {};
    data.Device = "Vicki";
    data.Reason = bytes[0];
    data.TargetTemperature = bytes[1];
    data.SensorTemperature = Number(sensorTemp.toFixed(2));
    data.RelativeHumidity = Number(((bytes[3] !== undefined ? bytes[3] : 0) * 100 / 256).toFixed(2));
    data.MotorRange = motorRange;
    data.MotorPosition = motorPosition;
    data.BatteryVoltage = Number(batteryVoltageCalculated.toFixed(2));
    data.OpenWindow = toBool(openWindow);
    data.HighMotorConsumption = toBool(highMotorConsumption);
    data.LowMotorConsumption = toBool(lowMotorConsumption);
    data.BrokenSensor = toBool(brokenSensor);
    data.ChildLock = toBool(childLock);
    data.CalibrationFailed = toBool(calibrationFailed);
    data.NotAttachedBackplate = toBool(!attachedBackplate);
    data.PerceiveAsOnline = toBool(perceiveAsOnline);
    data.AntiFreezeProtection = toBool(antiFreezeProtection);
    data.Mode = 0;
    data.ValveOpenness = motorRange !== 0 ? Math.round((1 - (motorPosition / motorRange)) * 100) : 0;

    if(!data.hasOwnProperty('targetTemperatureFloat')){
        data.targetTemperatureFloat = parseFloat(bytes[1]);
    }

    let max = 3.65;
    let min = 2.1;
    let div = max - min;
    let actDiv = data.BatteryVoltage - min;
    data.BatteryPercent = Math.round((actDiv / div) * 100);
    data.LowBat = data.BatteryVoltage < 3;

    return data;
}

function handleResponse(bytes) {
    let commands = bytes.map(b => ("0" + b.toString(16)).slice(-2));
    let resultToPass = {};

    let i = 0;
    while (i < commands.length) {
        let command = commands[i];
        let commandLen = 1;

        switch (command) {
            case '04': // HW/SW Version
                commandLen = 3;
                resultToPass = merge_obj(resultToPass, {
                    deviceVersions: {
                        hardware: parseInt(commands[i + 1], 16),
                        software: parseInt(commands[i + 2], 16),
                    }
                });
                break;

            case '5a': // Heizpläne
                commandLen = 2 + ((parseInt(commands[i + 1], 16) === 2) ? 4 : 8)*5;
                {
                    let blockIndex = parseInt(commands[i + 1], 16);
                    let startEventIndex = blockIndex * 8;
                    let eventsInBlock = (blockIndex === 2) ? 4 : 8;
                    let events = [];
                    for (let k = 0; k < eventsInBlock; k++) {
                        let offset = i + 2 + k*5;
                        let hour = parseInt(commands[offset], 16);
                        let minute = parseInt(commands[offset + 1], 16);
                        let tempRaw = (parseInt(commands[offset + 2], 16) << 8) | parseInt(commands[offset + 3], 16);
                        let targetC = tempRaw / 10.0;
                        let weekdays = parseInt(commands[offset + 4], 16);
                        let isEmpty = (hour === 0 && minute === 0 && tempRaw === 0 && weekdays === 0);
                        events.push({
                            index: startEventIndex + k,
                            hour: hour,
                            minute: minute,
                            target: targetC,
                            weekdaysMask: weekdays,
                            configured: !isEmpty
                        });
                    }
                    resultToPass['heatingEvents_block' + blockIndex] = events;
                }
                break;

            case '5c': // Heizsaison Start/Ende (mit +1 Korrektur 0-basiert)
                commandLen = 5;
                resultToPass = merge_obj(resultToPass, {
                    heatingScheduleStartEnd: {
                        start: { month: parseInt(commands[i + 1], 16) + 1, day: parseInt(commands[i + 2], 16) },
                        end: { month: parseInt(commands[i + 3], 16) + 1, day: parseInt(commands[i + 4], 16) }
                    }
                });
                break;

            case '5e': // Zeit Unix-Timestamp
                commandLen = 5;
                let ts = (parseInt(commands[i + 1], 16) << 24) |
                         (parseInt(commands[i + 2], 16) << 16) |
                         (parseInt(commands[i + 3], 16) << 8) |
                          parseInt(commands[i + 4], 16);
                resultToPass.deviceTime = { unix: ts, iso: new Date(ts * 1000).toISOString() };
                break;

            case '60': // Zeitzone signed Byte
                commandLen = 2;
                let tzRaw = parseInt(commands[i + 1], 16);
                if(tzRaw > 127) tzRaw -= 256;
                resultToPass.deviceTimezoneHours = tzRaw;
                break;

            case '59': // Heizplan Set (Downlink confirm)
                commandLen = 7;
                resultToPass.heatingEventSet = {
                    eventIndex: parseInt(commands[i + 1], 16),
                    startHour: parseInt(commands[i + 2], 16),
                    startMinute: parseInt(commands[i + 3], 16),
                    targetTemp: (parseInt(commands[i + 4], 16) << 8 | parseInt(commands[i + 5], 16)) / 10,
                    weekdaysBitmask: parseInt(commands[i + 6], 16)
                };
                break;

            default:
                commandLen = 1;
                break;
        }
        commands.splice(i, commandLen);
    }
    return resultToPass;
}

function decodeUplink(input) {
    let bytes = input.bytes;
    let data = {};

    if (!bytes || bytes.length === 0) {
        return { data: { error: "Keine Daten" } };
    }

    if (bytes[0] === 1 || bytes[0] === 129) {
        data = merge_obj(data, handleKeepalive(bytes));
    } else {
        data = merge_obj(data, handleResponse(bytes));
        data = merge_obj(data, handleKeepalive(bytes.slice(-9)));
    }

    return { data: data };
}
