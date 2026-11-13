function decodeUplink(input) {
  var port = input.fPort;
  var bytes = input.bytes;
  var nowUtc = new Date().toISOString();
  var data = {};

  // parse battery raw (bits 0..13 of first two bytes)
  var value = (bytes[0] << 8 | bytes[1]) & 0x3FFF;
  var bat = value / 1000; // Battery in V

  // contact flag: bit7 of bytes[0] (1 = closed? original logic: bit set -> false)
  var contact = (bytes[0] & 0x80) ? false : true;
  var state = contact ? "geschlossen" : "offen";
  var water_leak_status = (bytes[0] & 0x40) ? true : false;

  var mod = bytes[2];
  var alarm = (bytes[9] & 0x01);

  switch (port) {
    case 10:
      if (mod === 1) {
        var open_times = (bytes[3] << 16) | (bytes[4] << 8) | bytes[5];
        var open_duration = (bytes[6] << 16) | (bytes[7] << 8) | bytes[8]; // units: min

        data.BatV = bat;
        data.Mod = mod;
        data.Contact = contact;
        data.Opened = !contact;
        data.StateText = state;
        data.OpenTimes = open_times;
        data.LastOpenDuration = open_duration;
        data.Alarm = alarm;
      } else if (mod === 2) {
        var leak_times = (bytes[3] << 16) | (bytes[4] << 8) | bytes[5];
        var leak_duration = (bytes[6] << 16) | (bytes[7] << 8) | bytes[8]; // units: min

        data.BatV = bat;
        data.Mod = mod;
        data.WaterLeakStatus = water_leak_status;
        data.WaterLeakTimes = leak_times;
        data.LastWaterLeakDuration = leak_duration;
      } else if (mod === 3) {
        data.BatV = bat;
        data.Mod = mod;
        data.Contact = contact;
        data.Opened = !contact;
        data.StateText = state;
        data.WaterLeakStatus = water_leak_status;
        data.Alarm = alarm;
      } else {
        data.BatV = bat;
        data.Mod = mod;
      }

      // Battery calculation (robust)
      var max = 2.85;
      var min = 2.1;
      var div = max - min;

      // determine source field for voltage (accept BatV or batteryVoltage)
      var batRaw = Number(data.BatV ?? data.batteryVoltage ?? bat);

      if (Number.isNaN(batRaw)) {
        // fallback: if still NaN, set BatteryPercent to null
        data.BatteryPercent = null;
      } else {
        // clamp input into [min, max]
        var v = Math.min(Math.max(batRaw, min), max);
        // compute percent, clamp to [0,100], then round
        var percentFloat = (v - min) / div * 100;
        percentFloat = Math.min(Math.max(percentFloat, 0), 100);
        data.BatteryPercent = Math.round(percentFloat);
      }

      data.devicetype = "Dragino";
      data.TimestampUTC = nowUtc;

      return { data: data };

    default:
      return { errors: ["unknown FPort"] };
  }
}
