// 2. Modbus command am Dragino erzeugen um Batterie wert mit abzufragen
// Auf CS Downlink hinschicken auf Port 1
// AF0201069003017E000100
// dann 2 zeilen im Decoder anpassen (siehe unten)
// 90 03 01 65 00 09
// ClientID 90, Read (03) StartAdress 0165, Numeber register 2 read 9
// Response
// 0d530101380000025f003e0000000000f90000265c
// 00 01 02 03 04 05 06 07 08 09 10 11 12 Byte
//    0D 4E 90 06 E7 00 0D 02 96 00 3C 00 00 00 00 00 96 00 00 27 1A
//    Batt     Lux   UVI   Temp  Humid wind  gust  direc Rain  Presu       
// Test payload 0D4E9006E7000D0296003C0000000000960000271A
// Time Interval Einstellung: Messaging, Downlink, Port 1, replace Downlink, Bytes
// 3 Std = 01 00 2A 30
// 1 Std = 01 00 0E 10
// 20 Min = 01 00 04 B0
// 5 Min = 01 00 01 2C
// 1 Min = 01 00 00 3C
// andere Zeiten Sekunden in HEX umwandeln und hinter 01 00 hängen
  
  function decodeUplink(input) {
  var bytes = input.bytes;
  var fPort = input.fPort;
  if( fPort == 2 ) {
    
    
    
    var batteryVoltage = (bytes[0]<<8 | bytes[1]) /1000; 
    var light = (bytes[3]<<8 | bytes[4]) *10;
    var uvi = (bytes[5]<<8 | bytes[6]) /10;
    var temperature = Math.round ( (((bytes[7]<<8 | bytes[8]) /10) -40) * 1e2 ) / 1e2; 
    var humidity = (bytes[9]<<8 | bytes[10]) ;
    var windspeed = (bytes[11]<<8 | bytes[12]) /10 ;
    var gustspeed = (bytes[13]<<8 | bytes[14]) /10;
    var winddirection = (bytes[15]<<8 | bytes[16]) ;
    var rainfall = (bytes[17]<<8 | bytes[18]) /10;
    var pressure = (bytes[19]<<8 | bytes[20]) /10 ;
    var device = "Dragino" ;
    var utc = new Date().toUTCString();
    // 1. Zeile
    var volt = (bytes[21]<<8 | bytes[22]) /100 ;
    


    
    
    
  return {
    data: {
      Voltage: batteryVoltage,
      Light: light,
      Uvi: uvi,
      Temperature: temperature,
      Humidity: humidity,
      Windspeed: windspeed,
      Gustspeed: gustspeed,
      Winddirection: winddirection,
      Rainfall: rainfall,
      Pressure: pressure,
      Device: device,
      Timestamp: utc,
      // 2. zeile:
      Battery_WS90: volt,

      
    }  
    }
  }

  else {
    return {
    data: {
    // RAW: bytes 
  //     uplink: btoa (input.bytes)
    }
    }
 }
}
