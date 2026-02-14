### Automatische Übertragung der LoRaWAN GPS Positionsdaten zum Traccar Server ab V6.11
hier am Beispiel vom t-Beam

1. Es muss der hier hinterlegte Decoder bei TTN eingetragen sein


2. Die in TTN eingetragene End device id muss mit der in Traccar eingetragenen Kennung übereinstimmen

<img width="394" height="107" alt="image" src="https://github.com/user-attachments/assets/ae6b0727-aac8-4882-b4f4-a9cd982d6216" />

 

<img width="333" height="94" alt="image" src="https://github.com/user-attachments/assets/52e7453a-4229-44fd-a000-d84c2090930d" />


 
3.  Im Router muss (auch) der Port ```5261``` zum Traccar Server freigegeben sein

<img width="726" height="62" alt="image" src="https://github.com/user-attachments/assets/69266dd9-ecb9-4b3a-9189-cf2fe29f8dd2" />

 

4. In TTN muss ein Custom webhook eingerichtet sein:


<img width="871" height="856" alt="image" src="https://github.com/user-attachments/assets/f1fdbd96-5f3b-443f-9b59-e553ec698f9d" />



Bei Problemen kann man (mit passender Kennung) auch erstmal per Curl Befehl prüfen:

```
curl -X POST http://192.168.0.191:5261/ -H "Content-Type: application/json" -d '{"end_device_ids":{"device_id":"CattleTracker"},"uplink_message":{"decoded_payload":{"latitude":53.55810393711032,"longitude":9.928943471405269,"altitude":10,"sats":8},"rx_metadata":[{"gateway_ids":{"gtw_id":"test-gateway"},"rssi":0,"snr":0,"time":"2025-12-10T17:24:29.000Z"}]}}'

```
es müssen folgende Attriubute vorhanden sein:

```
"latitude":53.55810393711032,
"longitude":9.928943471405269,
"altitude":10,
"sats":8},
```



#### Ergebnis:

<img width="1480" height="964" alt="image" src="https://github.com/user-attachments/assets/08342d31-0d64-485c-9e73-754c75d6a84c" />



#### Install Traccar:

[https://github.com/J-Paul0815/SmartHome/tree/main/Projects/Traccar](https://github.com/J-Paul0815/SmartHome/tree/main/Projects/Traccar)
