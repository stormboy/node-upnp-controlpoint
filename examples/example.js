var UpnpControlPoint = require("../lib/upnp-controlpoint").UpnpControlPoint,
	wemo = require("../lib/wemo");

var handleDevice = function(device) {
console.log("device type: " + device.deviceType + " location: " + device.location);

	switch(device.deviceType) {

	case wemo.WemoControllee.deviceType:
		var wemoSwitch = new wemo.WemoControllee(device);
		wemoSwitch.on("BinaryState", function(value) {
			console.log("wemo switch state change: " + value);
		});

		setTimeout(function() {
			wemoSwitch.setBinaryState(true);
		}, 4000);
		setTimeout(function() {
			wemoSwitch.setBinaryState(false);
		}, 6000);
		break;

	case wemo.WemoSensor.deviceType:
		var wemoSensor = new wemo.WemoSensor(device);
		wemoSensor.on("BinaryState", function(value) {
			console.log("wemo motion sensor state change: " + value);
		});
		break;
	}
};

var cp = new UpnpControlPoint();

cp.on("device", handleDevice);

cp.search();
