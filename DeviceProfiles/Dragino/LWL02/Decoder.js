function decodeUplink(input) {
  var bytes = input.bytes;
  var port = input.fPort;
  var data = {};

  // Hilfsfunktionen
  function readUInt24BE(b1, b2, b3) {
    return (b1 << 16) | (b2 << 8) | b3;
  }

  // --- Batteriewert aus Byte 0+1 ---
  if (bytes.length < 2) {
    return { errors: ["Payload zu kurz (" + bytes.length + " Bytes)"] };
  }

  var value = ((bytes[0] << 8) | bytes[1]) & 0x3FFF;
  var bat = value / 1000; // V
  data.BatV = bat;

  // Kontakt & Leak
  var contact = (bytes[0] & 0x80) ? false : true; // 1=geschlossen
  data.Contact = contact;
  data.Opened = !contact;
  data.State = contact ? "geschlossen" : "offen";

  var water_leak_status = (bytes[0] & 0x40) ? true : false;

  // Batterieladung Prozent
  var max = 3.1, min = 2.1;
  var div = max - min;
  var actDiv = Math.min(Math.max(bat, min), max) - min;
  data.BatteryPercent = Math.round((actDiv / div) * 100);

  // Gerätetyp für Klarheit
  data.devicetype = "Dragino";

  // --- Portspezifisch auswerten ---
  switch (port) {
    case 10: {
      var mod = bytes[2];
      data.Mod = mod;

      if (mod === 1 && bytes.length >= 10) {
        // Türkontakt
        var open_times = readUInt24BE(bytes[3], bytes[4], bytes[5]);
        var open_duration = readUInt24BE(bytes[6], bytes[7], bytes[8]);
        var alarm = bytes[9] & 0x01;

        data.OpenTimes = open_times;
        data.LastOpenDuration = open_duration;
        data.Alarm = alarm;
      }
      else if (mod === 2 && bytes.length >= 9) {
        // Wasserleck
        var leak_times = readUInt24BE(bytes[3], bytes[4], bytes[5]);
        var leak_duration = readUInt24BE(bytes[6], bytes[7], bytes[8]);

        data.WaterLeakStatus = water_leak_status;
        data.WaterLeakTimes = leak_times;
        data.LastWaterLeakDuration = leak_duration;
      }
      else if (mod === 3 && bytes.length >= 10) {
        // Kombi‑Modus
        var alarm = bytes[9] & 0x01;
        data.WaterLeakStatus = water_leak_status;
        data.Alarm = alarm;
      }
      // sonst: nur Basisinfos BatV, Mod enthalten
      return { data: data };
    }

    default:
      return { 
        errors: ["Unsupported or unknown FPort: " + port],
        data: data
      };
  }
}
