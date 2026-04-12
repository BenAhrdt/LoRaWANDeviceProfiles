function decodeUplink(input) {
  var port = input.fPort;
  var bytes = input.bytes;
  var value=(bytes[0]<<8 | bytes[1])&0x3FFF;
  var bat=value/1000;//Battery,units:V
  
  var contact=bytes[0]&0x80?false:true;
  var state = contact? "geschlossen": "offen";
  var water_leak_status=bytes[0]&0x40?true:false;
  
  var mod=bytes[2];
  var alarm=bytes[9]&0x01;
  var data = {};
  switch (input.fPort) {
 	case 10:
    if(mod==1){
      var open_times=bytes[3]<<16 | bytes[4]<<8 | bytes[5];
      var open_duration=bytes[6]<<16 | bytes[7]<<8 | bytes[8];//units:min

        data.BatV=bat,
        data.Mod=mod,
        data.Contact=contact,
        data.Opened=!contact,
		data.StateText = state,
        data.OpenTimes=open_times,
        data.LastOpenDuration=open_duration,
       data.Alarm=alarm
  	}
  	else if(mod==2){
  		var leak_times=bytes[3]<<16 | bytes[4]<<8 | bytes[5];
  		var leak_duration=bytes[6]<<16 | bytes[7]<<8 | bytes[8];//units:min
  
      	data.BatV=bat,
      	data.Mod=mod,
      	data.WaterLeakStatus=water_leak_status,
      	data.WaterLeakTimes=leak_times,
      	data.LastWaterLeakDuration=leak_duration
	}
  	else if(mod==3){
      data.BatV=bat,
      data.Mod=mod,
      data.Contact=contact,
	  data.Opened=!contact,
	  data.State = state,
      data.WaterLeakStatus=water_leak_status,
      data.Alarm=alarm
  	}
 	else{
      data.BatV=bat,
      data.Mod=mod
  	}
    // Battery calculation
    max = 3.1;
    min = 2.1;
    div = max - min;
    actDiv = Math.min(Math.max(bat, min), max) - min;
    data.BatteryPercent = Math.round((actDiv / div) * 100);
	data.devicetype = "Dragino";
  	return {
  		data: data,
    }

	default:
    return {
      errors: ["unknown FPort"]
    }
  }
}
