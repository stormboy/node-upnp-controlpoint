node-upnp-controlpoint
======================

A UPnP Control Point implementation for Node.js for discovering and interfacing with UPnP devices.

Device implementations for Belkin Wemo sensors and switches are provided as a starting point.

Dependencies
------------

Install dependencies:

		npm install

Example
-------

### Simple Wemo demo.

		node examples/example.js

Will look for Belkin WeMo switch and Belkin WeMo motion sensor.  Will turn the switch on and then off, and 
listen for and log state change on switches and sensors.

### Interfacing with MQTT service

		node examples/wemo-mqtt

This app will listen for messages sent to an MQTT topic that will turn a Wemo switch on/off. It will also send switch state
to an MQTT topic.

To Do
-----

Handle more device types such as:
- MediaRenderer : AVTransport, RenderingControl and ConnectionManager services.
- MediaServer : Content Directory, ConnectionManager and AVTransport services.
- Sonos Zone Player and asociated services.

