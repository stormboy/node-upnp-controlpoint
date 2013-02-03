var UpnpControlPoint = require("./lib/upnp-controlpoint").UpnpControlPoint,
	wemo = require("./lib/wemo");

var handleDevice = function(device) {

	switch(device.deviceType) {
	case "urn:Belkin:device:controllee:1":
	// case wemo.WemoControllee.deviceType:
		var wemoSwitch = new wemo.WemoControllee(device);

		setTimeout(function() {
			wemoSwitch.change(true);
		}, 4000);
		setTimeout(function() {
			wemoSwitch.change(false);
		}, 6000);

		break;
	// case wemo.WemoSensor.deviceType:
	case "urn:Belkin:device:sensor:1":
		var wemoSensor = new wemo.WemoSensor(device);
		break;
	}
	
}

var cp = new UpnpControlPoint();

cp.on("device", handleDevice);

cp.search();
