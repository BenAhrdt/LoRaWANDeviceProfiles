function decodeUplink(input) {
    var bytes = input.bytes;
    var data = {};
    var resultToPass = {};
    toBool = function (value) { return value == '1' };

    function merge_obj(obj1, obj2) {
        var obj3 = {};
        for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
        for (var attrname2 in obj2) { obj3[attrname2] = obj2[attrname2]; }
        return obj3;
    }

    function handleKeepalive(bytes, data){
        tmp = ("0" + bytes[6].toString(16)).substr(-2);
        motorRange1 = tmp[1];
        motorRange2 = ("0" + bytes[5].toString(16)).substr(-2);
        motorRange = parseInt("0x" + motorRange1 + motorRange2, 16);

        motorPos2 = ("0" + bytes[4].toString(16)).substr(-2);
        motorPos1 = tmp[0];
        motorPosition = parseInt("0x" + motorPos1 + motorPos2, 16);

        batteryTmp = ("0" + bytes[7].toString(16)).substr(-2)[0];
        batteryVoltageCalculated = 2 + parseInt("0x" + batteryTmp, 16) * 0.1;

        let decbin = (number) => {
            if (number < 0) {
                number = 0xFFFFFFFF + number + 1
            }
            number = number.toString(2);
            return "00000000".substr(number.length) + number;
        }
        byte7Bin = decbin(bytes[7]);
        openWindow = byte7Bin[4];
        highMotorConsumption = byte7Bin[5];
        lowMotorConsumption = byte7Bin[6];
        brokenSensor = byte7Bin[7];
        byte8Bin = decbin(bytes[8]);
        childLock = byte8Bin[0];
        calibrationFailed = byte8Bin[1];
        attachedBackplate = byte8Bin[2];
        perceiveAsOnline = byte8Bin[3];
        antiFreezeProtection = byte8Bin[4];

        var sensorTemp = 0;
        if (Number(bytes[0].toString(16))  == 1) {
            sensorTemp = (bytes[2] * 165) / 256 - 40;
        }
        if (Number(bytes[0].toString(16)) == 81) {
            sensorTemp = (bytes[2] - 28.33333) / 5.66666;
        }
      
        data.Device = "Vicki";
        data.Reason = Number(bytes[0].toString(16));
        data.TargetTemperature = Number(bytes[1]);
        data.SensorTemperature = Number(sensorTemp.toFixed(2));
        data.RelativeHumidity = Number(((bytes[3] * 100) / 256).toFixed(2));
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
        data.ValveOpenness = motorRange != 0 ? Math.round((1-(motorPosition/motorRange))*100) : 0;
        if(!data.hasOwnProperty('targetTemperatureFloat')){
            data.targetTemperatureFloat = parseFloat(bytes[1])
        }
      
        // Battery calculation (mit Clamp wie in deiner Version)
        var max = 3.65;
        var min = 2.1;
        var div = max - min;
        var actDiv = Math.min(Math.max(data.BatteryVoltage, min), max) - min;
        data.BatteryPercent = Math.round((actDiv / div) * 100);
        data.LowBat = data.BatteryVoltage < 3;

        return data;
    }
   
    function handleResponse(bytes, data){
        var commands = bytes.map(function(byte, i){
        	return ("0" + byte.toString(16)).substr(-2); 
        });
        commands = commands.slice(0,-9);
        var command_len = 0;

        commands.map(function (command, i) {
            switch (command) {
                case '04': {
                    command_len = 2;
                    var hardwareVersion = commands[i + 1];
                    var softwareVersion = commands[i + 2];
                    var dataK = { deviceVersions: { hardware: Number(hardwareVersion), software: Number(softwareVersion) } };
                    resultToPass = merge_obj(resultToPass, dataK);
                } break;

                case '12': {
                    command_len = 1;
                    var dataC = { keepAliveTime: parseInt(commands[i + 1], 16) };
                    resultToPass = merge_obj(resultToPass, dataC);
                } break;

                case '13': {
                    command_len = 4;
                    var enabled = toBool(parseInt(commands[i + 1], 16));
                    var duration = parseInt(commands[i + 2], 16) * 5;
                    var tmp = ("0" + commands[i + 4].toString(16)).substr(-2);
                    var motorPos2 = ("0" + commands[i + 3].toString(16)).substr(-2);
                    var motorPos1 = tmp[0];
                    var motorPosition = parseInt('0x' + motorPos1 + motorPos2, 16);
                    var delta = Number(tmp[1]);
                    var dataD = { openWindowParams: { enabled: enabled, duration: duration, motorPosition: motorPosition, delta: delta } };
                    resultToPass = merge_obj(resultToPass, dataD);
                } break;

                case '14': {
                    command_len = 1;
                    var dataB = { childLock: toBool(parseInt(commands[i + 1], 16)) };
                    resultToPass = merge_obj(resultToPass, dataB);
                } break;

                case '15': {
                    command_len = 2;
                    var dataA = { temperatureRangeSettings: { min: parseInt(commands[i + 1], 16), max: parseInt(commands[i + 2], 16) } };
                    resultToPass = merge_obj(resultToPass, dataA);
                } break;

                case '16': {
                    command_len = 2;
                    var d = { internalAlgoParams: { period: parseInt(commands[i + 1], 16), pFirstLast: parseInt(commands[i + 2], 16), pNext: parseInt(commands[i + 3], 16) } };
                    resultToPass = merge_obj(resultToPass, d);
                } break;

                case '17': {
                    command_len = 2;
                    var dF = { internalAlgoTdiffParams: { warm: parseInt(commands[i + 1], 16), cold: parseInt(commands[i + 2], 16) } };
                    resultToPass = merge_obj(resultToPass, dF);
                } break;

                case '18': {
                    command_len = 1;
                    var dE = { operationalMode: parseInt(commands[i + 1], 16) };
                    resultToPass = merge_obj(resultToPass, dE);
                } break;

                case '19': {
                    command_len = 1;
                    var commandResponse = parseInt(commands[i + 1], 16);
                    var periodInMinutes = commandResponse * 5 / 60;
                    var dH = { joinRetryPeriod: periodInMinutes };
                    resultToPass = merge_obj(resultToPass, dH);
                } break;

                case '1b': {
                    command_len = 1;
                    var dG = { uplinkType: parseInt(commands[i + 1], 16) };
                    resultToPass = merge_obj(resultToPass, dG);
                } break;

                case '1d': {
                    command_len = 2;
                    var wdpC = commands[i + 1] == '00' ? false : parseInt(commands[i + 1], 16);
                    var wdpUc = commands[i + 2] == '00' ? false : parseInt(commands[i + 2], 16);
                    var dJ = { watchDogParams: { wdpC: wdpC, wdpUc: wdpUc } };
                    resultToPass = merge_obj(resultToPass, dJ);
                } break;

                case '1f': {
                    command_len = 1;
                    var d1f = {  primaryOperationalMode: commands[i + 1] };
                    resultToPass = merge_obj(resultToPass, d1f);
                } break;

                case '21': {
                    command_len = 6;
                    var d21 = {batteryRangesBoundaries:{ 
                        Boundary1: parseInt(commands[i + 1] + commands[i + 2], 16), 
                        Boundary2: parseInt(commands[i + 3] + commands[i + 4], 16), 
                        Boundary3: parseInt(commands[i + 5] + commands[i + 6], 16), 
                    }};
                    resultToPass = merge_obj(resultToPass, d21);
                } break;

                case '23': {
                    command_len = 4;
                    var d23 = {batteryRangesOverVoltage:{ 
                        Range1: parseInt(commands[i + 2], 16), 
                        Range2: parseInt(commands[i + 3], 16), 
                        Range3: parseInt(commands[i + 4], 16), 
                    }};
                    resultToPass = merge_obj(resultToPass, d23);
                } break;

                case '27': {
                    command_len = 1;
                    var d27 = {OVAC: parseInt(commands[i + 1], 16)};
                    resultToPass = merge_obj(resultToPass, d27);
                } break;

                case '28': {
                    command_len = 1;
                    var d28 = { manualTargetTemperatureUpdate: parseInt(commands[i + 1], 16) };
                    resultToPass = merge_obj(resultToPass, d28);
                } break;

                case '29': {
                    command_len = 2;
                    var d29 = { proportionalAlgoParams: { coefficient: parseInt(commands[i + 1], 16), period: parseInt(commands[i + 2], 16) } };
                    resultToPass = merge_obj(resultToPass, d29);
                } break;

                case '2b': {
                    command_len = 1;
                    var d2b = { algoType: commands[i + 1] };
                    resultToPass = merge_obj(resultToPass, d2b);
                } break;

                case '36': {
                    command_len = 3;
                    var kp = parseInt(`${commands[i + 1]}${commands[i + 2]}${commands[i + 3]}`, 16) / 131072;
                    var d36 = { proportionalGain: Number(kp).toFixed(5) };
                    resultToPass = merge_obj(resultToPass, d36);
                } break;

                case '3d': {
                    command_len = 3;
                    var ki = parseInt(`${commands[i + 1]}${commands[i + 2]}${commands[i + 3]}`, 16) / 131072;
                    var d3d = { integralGain: Number(ki).toFixed(5) };
                    resultToPass = merge_obj(resultToPass, d3d);
                } break;

                case '3f': {
                    command_len = 2;
                    var d3f = { integralValue : (parseInt(`${commands[i + 1]}${commands[i + 2]}`, 16))/10 };
                    resultToPass = merge_obj(resultToPass, d3f);
                } break;

                case '40': {
                    command_len = 1;
                    var d40 = { piRunPeriod : parseInt(commands[i + 1], 16) };
                    resultToPass = merge_obj(resultToPass, d40);
                } break;

                case '42': {
                    command_len = 1;
                    var d42 = { tempHysteresis : parseInt(commands[i + 1], 16) };
                    resultToPass = merge_obj(resultToPass, d42);
                } break;

                case '44': {
                    command_len = 2;
                    var d44 = { extSensorTemperature : (parseInt(`${commands[i + 1]}${commands[i + 2]}`, 16))/10 };
                    resultToPass = merge_obj(resultToPass, d44);
                } break;

                case '46': {
                    command_len = 3;
                    var enabled46 = toBool(parseInt(commands[i + 1], 16));
                    var duration46 = parseInt(commands[i + 2], 16) * 5;
                    var delta46 = parseInt(commands[i + 3], 16) /10;
                    var d46 = { openWindowParams: { enabled: enabled46, duration: duration46, delta: delta46 } };
                    resultToPass = merge_obj(resultToPass, d46);
                } break;

                case '48': {
                    command_len = 1;
                    var d48 = { forceAttach : parseInt(commands[i + 1], 16) };
                    resultToPass = merge_obj(resultToPass, d48);
                } break;

                case '4a': {
                    command_len = 3;
                    var activatedTemperature = parseInt(commands[i + 1], 16)/10;
                    var deactivatedTemperature = parseInt(commands[i + 2], 16)/10;
                    var targetTemperature = parseInt(commands[i + 3], 16);
                    var d4a = { antiFreezeParams: { activatedTemperature, deactivatedTemperature, targetTemperature } };
                    resultToPass = merge_obj(resultToPass, d4a);
                } break;

                case '4d': {
                    command_len = 2;
                    var d4d = { piMaxIntegratedError : (parseInt(`${commands[i + 1]}${commands[i + 2]}`, 16))/10 };
                    resultToPass = merge_obj(resultToPass, d4d);
                } break;

                case '50': {
                    command_len = 2;
                    var d50 = { effectiveMotorRange: { minValveOpenness: 100 - parseInt(commands[i + 2], 16), maxValveOpenness: 100 - parseInt(commands[i + 1], 16) } };
                    resultToPass = merge_obj(resultToPass, d50);
                } break;

                case '52': {
                    command_len = 2;
                    var d52 = { targetTemperatureFloat : (parseInt(`${commands[i + 1]}${commands[i + 2]}`, 16))/10 };
                    resultToPass = merge_obj(resultToPass, d52);
                } break;

                case '54': {
                    command_len = 1;
                    var offset =  (parseInt(commands[i + 1], 16) - 28) * 0.176
                    var d54 = { temperatureOffset : offset };
                    resultToPass = merge_obj(resultToPass, d54);
                } break;

                /* ===== NEU ab FW 4.6: Heizpläne/Zeit/Zeitzone ===== */

                case '59': { // Heizplan-Event bestätigt (Downlink-Ack)
                    command_len = 6; // inkl. +1 für das Kommandobyte wird unten über splice entfernt
                    var d59 = {
                        heatingEventSet: {
                            eventIndex: parseInt(commands[i + 1], 16),
                            startHour: parseInt(commands[i + 2], 16),
                            startMinute: parseInt(commands[i + 3], 16),
                            targetTemp: ((parseInt(commands[i + 4], 16) << 8) | parseInt(commands[i + 5], 16)) / 10,
                            weekdaysBitmask: parseInt(commands[i + 6], 16)
                        }
                    };
                    resultToPass = merge_obj(resultToPass, d59);
                } break;

                case '5a': { // Heizpläne blockweise
                    var blockIndex = parseInt(commands[i + 1], 16);
                    var eventsInBlock = (blockIndex === 2) ? 4 : 8;
                    command_len = 1 /*block id*/ + 1 /*cmd selbst zählt separat*/ + eventsInBlock * 5;
                    var startEventIndex = blockIndex * 8;
                    var events = [];
                    for (var k = 0; k < eventsInBlock; k++) {
                        var offset = i + 2 + k * 5;
                        var hour = parseInt(commands[offset], 16);
                        var minute = parseInt(commands[offset + 1], 16);
                        var tempRaw = (parseInt(commands[offset + 2], 16) << 8) | parseInt(commands[offset + 3], 16);
                        var targetC = tempRaw / 10.0;
                        var weekdays = parseInt(commands[offset + 4], 16);
                        var isEmpty = (hour === 0 && minute === 0 && tempRaw === 0 && weekdays === 0);
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
                } break;

                case '5c': { // Heizsaison Start/Ende
                    command_len = 4;
                    var d5c = {
                        heatingScheduleStartEnd: {
                            start: { month: parseInt(commands[i + 1], 16) + 1, day: parseInt(commands[i + 2], 16) },
                            end:   { month: parseInt(commands[i + 3], 16) + 1, day: parseInt(commands[i + 4], 16) }
                        }
                    };
                    resultToPass = merge_obj(resultToPass, d5c);
                } break;

                case '5e': { // Gerätezeit (Unix)
                    command_len = 4;
                    var ts =
                        (parseInt(commands[i + 1], 16) << 24) |
                        (parseInt(commands[i + 2], 16) << 16) |
                        (parseInt(commands[i + 3], 16) << 8) |
                         parseInt(commands[i + 4], 16);
                    resultToPass = merge_obj(resultToPass, { deviceTime: { unix: ts, iso: new Date(ts * 1000).toISOString() } });
                } break;

                case '60': { // Zeitzonen-Offset (signed Byte in Stunden)
                    command_len = 1;
                    var tzRaw = parseInt(commands[i + 1], 16);
                    if (tzRaw > 127) tzRaw -= 256;
                    resultToPass = merge_obj(resultToPass, { deviceTimezoneHours: tzRaw });
                } break;

                default:
                    // unbekanntes Kommando -> 0 weiter, nur das Kommando-Byte wird weggeschnitten
                    command_len = 0;
                    break;
            }

            // Wichtig: Das alte Muster benutzt map+splice; hier deshalb konsistent:
            commands.splice(i, command_len);
        });
        return resultToPass;
    }
    
    if (bytes[0].toString(16) == 1 || bytes[0].toString(16) == 129) {
        data = merge_obj(data, handleKeepalive(bytes, data));
    } else {
        data = merge_obj(data, handleResponse(bytes, data));
        bytes = bytes.slice(-9);
        data = merge_obj(data, handleKeepalive(bytes, data));
    }

    return {
        data: data
    };
}
