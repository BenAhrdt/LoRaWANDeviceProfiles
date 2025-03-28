The use of the 16ASPM and the "16 Dry Switch" is identical

The recommended method is to use the decoder from the repository. The difference from the original decoder is the added line:

     // Relay state
        data.device = "16ASPM";

This sets "16ASPM" in the device entry, thereby creating the downlink configuration data points in the command.
By using this customized decoder, the setup is already completed automatically (after the first uplink).


![](https://github.com/BenAhrdt/LoRaWANDeviceProfiles/blob/main/Data/Pics/16ASPM/2025-03-27-10-44-54-image.png)

downlink control: the data points are generated

![](https://github.com/BenAhrdt/LoRaWANDeviceProfiles/blob/main/Data/Pics/16ASPM/2025-03-27-11-07-00-image.png)

the relay can be controlled via Power On/Off (true/false)

In the data point "LastSend" you can see the downlink

![](https://github.com/BenAhrdt/LoRaWANDeviceProfiles/blob/main/Data/Pics/16ASPM/2025-03-27-11-11-05-image.png)

In the folder Uplink, decoded the data point "relayState" is updated

![](https://github.com/BenAhrdt/LoRaWANDeviceProfiles/blob/main/Data/Pics/16ASPM/2025-03-27-11-14-24-image.png)

Switch on the relay for a specific period of time. This can be specified in milliseconds, seconds, minutes, and hours.

![](https://github.com/BenAhrdt/LoRaWANDeviceProfiles/blob/main/Data/Pics/16ASPM/2025-03-27-11-17-53-image.png)

NEW:
Switch off the relay for a specific period of time. This can be specified in seconds.



