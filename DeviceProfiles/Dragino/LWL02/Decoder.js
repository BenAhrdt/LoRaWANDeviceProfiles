
function decodeUplink(input) {
  var bytes = input.bytes;
  var port = input.fPort;
  var data = {};

  // Hilfsfunktionen
  function readUInt24BE(b1, b2, b3) {
    return (b1 << 16) | (b2 << 8) | b3;
  }

  // Payload prüfen
  if (bytes.length < 3) {
    return { errors: ["Payload zu kurz (" + bytes.length + " Bytes)"] };
  }

  // --- Batteriewert aus Byte 0+1 ---
  var value = ((bytes[0] << 8) | bytes[1]) & 0x3FFF;
  var bat = value / 1000;

  // Original Dragino-Bezeichnung
  data.BAT_V = bat;

  // Kontakt & Leak
  var door_open_status = (bytes[0] & 0x80) ? 1 : 0;
  var water_leak_status = (bytes[0] & 0x40) ? 1 : 0;

  // Eigene Zusatzsensoren
  var contact = !door_open_status;
  data.Contact = contact;
  data.Opened = !contact;
  data.State = contact ? "geschlossen" : "offen";

  data.WaterLeakStatus = !!water_leak_status;

  // Batterieladung Prozent
  var max = 3.1, min = 2.1;
  var actDiv = Math.min(Math.max(bat, min), max) - min;
  data.BatteryPercent = Math.round((actDiv / (max - min)) * 100);

  // Gerätetyp
  data.devicetype = "Dragino";

  // --- Portspezifische Auswertung ---
  switch (port) {

    case 10: {
      var mod = bytes[2];

      // Original Dragino-Bezeichnung
      data.MOD = mod;

      if (mod === 1 && bytes.length >= 10) {
        // Türkontakt
        var open_times = readUInt24BE(bytes[3], bytes[4], bytes[5]);
        var open_duration = readUInt24BE(bytes[6], bytes[7], bytes[8]);
        var alarm = bytes[9] & 0x01;

        data.DOOR_OPEN_STATUS = door_open_status;
        data.DOOR_OPEN_TIMES = open_times;
        data.LAST_DOOR_OPEN_DURATION = open_duration;
        data.ALARM = alarm;

        // Eigene Zusatzsensoren
        data.OpenTimes = open_times;
        data.LastOpenDuration = open_duration;
        data.Alarm = alarm;
      }

      else if (mod === 2 && bytes.length >= 9) {
        // Wasserleck
        var leak_times = readUInt24BE(bytes[3], bytes[4], bytes[5]);
        var leak_duration = readUInt24BE(bytes[6], bytes[7], bytes[8]);

        // Original Dragino-Bezeichnungen
        data.WATER_LEAK_STATUS = water_leak_status;
        data.WATER_LEAK_TIMES = leak_times;
        data.LAST_WATER_LEAK_DURATION = leak_duration;

        // Eigene Zusatzsensoren
        data.WaterLeakTimes = leak_times;
        data.LastWaterLeakDuration = leak_duration;
      }

      else if (mod === 3 && bytes.length >= 10) {
        // Kombi-Modus
        var alarm = bytes[9] & 0x01;

        data.DOOR_OPEN_STATUS = door_open_status;
        data.WATER_LEAK_STATUS = water_leak_status;
        data.ALARM = alarm;

        // Eigene Zusatzsensoren
        data.Alarm = alarm;
      }

      return { data: data };
    }

    default:
      return {
        errors: ["Unsupported or unknown FPort: " + port],
        data: data
      };
  }
}
