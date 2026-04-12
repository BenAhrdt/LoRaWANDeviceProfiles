// 00 01 02 03 04 05 06 07 08 09 10 11 12 Byte
//    0D 4E 01 03 E8 00 BD 01 66
//    Batt     Mois  Temp  Condu
// Test payload 0D4E0103E800BD0166
// Time Interval Einstellung: Messaging, Downlink, Port 1, replace Downlink, Bytes
// 3 Std = 01 00 2A 30
// 1 Std = 01 00 0E 10
// 20Min = 01 00 04 B0
// 1 Min = 01 00 00 3C
// andere Zeiten Sekunden in HEX umwandeln und hinter 01 00 hÃ¤ngen
  
  function decodeUplink(input) {
  var bytes = input.bytes;
  var fPort = input.fPort;
  if( fPort == 2 ) {
    
    
    
    var batteryVoltage = (bytes[0]<<8 | bytes[1]) /1000; 
    var soilmoisture = (bytes[3]<<8 | bytes[4]) /10;
    var soiltemperature = (bytes[5]<<24>>16 | bytes[6]) / 10;
    var soilconductivity = (bytes[7]<<8 | bytes[8]) ;

    
    
    
  return {
    data: {
      Volt: batteryVoltage,
      Soilmoisture: soilmoisture,
      Soiltemperature: soiltemperature,
      Soilconductivity: soilconductivity,
      devicetype: "Dragino"
    }  
    }
  }

  else {
    return {
    data: {
    RAW: bytes 
  //     uplink: btoa (input.bytes)
    }
    }
 }
}
