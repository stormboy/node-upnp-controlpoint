/**
 * Requires mqttjs library
 */

var UpnpControlPoint = require("../lib/upnp-controlpoint").UpnpControlPoint,
	wemo = require("../lib/wemo"),
	mqtt = require('mqttjs'),
   	crypto = require('crypto');

var TRACE = true;

var options = {
    log: true,
    mqtt : {
    	"host" : "192.168.0.23",
    	"port" : 1883
    },
    mqttPaths : {
    	binaryIn   : "binary/in",
    	binaryOut  : "binary/out",
    }
};

/**
 * 
 */
var WemoBinaryMqtt = function(wemo, options) {
	var self = this;

	this.wemo = wemo;
	
	this.TOPIC_binaryIn   = "/meem/" + wemo.device.uuid + "/" + options.mqttPaths.binaryIn;		// binary control
	this.TOPIC_binaryOut  = "/meem/" + wemo.device.uuid + "/" + options.mqttPaths.binaryOut;	// binary state

	this.state = { binary : {} };

	this.mqttClient = null;
	this.pingTimer = null;
	
	init(self, options.mqtt);
}

WemoBinaryMqtt.prototype.subscribe = function() {
	if (this.mqttClient) {
		// subscribe to contorl topics
		this.mqttClient.subscribe({topic: this.TOPIC_binaryIn});
		
		// subscribe to topics for requests for initial-content (state).
		this.mqttClient.subscribe({topic: this.TOPIC_binaryOut+"?"});
	}
}

WemoBinaryMqtt.prototype.startPing = function() {
    if (this.pingTimer) {
        clearTimeout(this.pingTimer);
    }
    var self = this;
    this.pingTimer = setTimeout(function() {
        ping(self);
    }, 60000);        // make sure we ping the server 
}

WemoBinaryMqtt.prototype.stopPing = function() {
    if (this.pingTimer) {
        clearTimeout(this.pingTimer);
    }
}

function ping(self) {
    if (self.mqttClient) {
        if (TRACE) {
            console.log("pinging MQTT server");
        }
        self.mqttClient.pingreq();
        self.pingTimer = setTimeout(function() {
            ping(self);
        }, 60000);
    }
}

function init(self, options) {
	
	console.log("initialise MQTT connection");
	
	// connect to MQTT service
	
	mqtt.createClient(options.port, options.host, function(err, client) {
		self.mqttClient = client;

		// add handlers to MQTT client
		self.mqttClient.on('connack', function(packet) {
			if (packet.returnCode === 0) {
				if (TRACE) {
					console.log('MQTT sessionOpened');
				}
				self.subscribe();	// subscribe to control and request topics
				self.startPing();
			}
		});
		self.mqttClient.on('close', function() {
			console.log('MQTT close');
		});
		self.mqttClient.on('error', function(e) {
			console.log('MQTT error: ' + e);
		});
		self.mqttClient.addListener('publish', function(packet) {
			// got data from subscribed topic
			if (TRACE) {
				console.log('received ' + packet.topic + ' : ' + packet.payload);
			}

			// check if message is a request for current value, send response
			var i = packet.topic.indexOf("?");
			if (i > 0) {
				handleContentRequest(self, packet);
			}
			else {
				handleInput(self, packet);
			}
		});

        // connect to MQTT service
		crypto.randomBytes(24, function(ex, buf) {		// create a random client ID for MQTT
			var clientId = buf.toString('hex');
			self.mqttClient.connect({
				keepalive: 60,
				client: clientId
			});
		});

		// add WeMo state handlers	
		self.wemo.on('BinaryState', function(value) {
			var v = value == 1 ? true : false;
			self.state.binary = { value : v };
			self.mqttClient.publish({
				topic: self.TOPIC_binaryOut, 
				payload: JSON.stringify(self.state.binary)
			});
		});
	});
}


function handleContentRequest(self, packet) {
	var i = packet.topic.indexOf("?");
	var requestTopic = packet.topic.slice(0, i);
	var responseTopic = packet.payload;
	if (TRACE) {
		console.log("requestTopic: " + requestTopic + "  responseTopic: " + responseTopic);
	}
	if (requestTopic == self.TOPIC_binaryOut) {
		if (TRACE) {
			console.log("sending binaryOut content: " + self.state.power);
		}
		self.mqttClient.publish({topic: responseTopic, payload: JSON.stringify(self.state.binary)});
	}
}

/**
 * Handle an input MQTT message
 * @param {Object} self
 * @param {Object} packet
 */
function handleInput(self, packet) {
	if (packet.topic == self.TOPIC_binaryIn) {
		var msg = JSON.parse(packet.payload);
		self.wemo.setBinaryState(msg.value);
	}
	// else unhandled topic
}


var handleDevice = function(device) {

	switch(device.deviceType) {

	case wemo.WemoControllee.deviceType:
		var wemoSwitch = new wemo.WemoControllee(device);
		var wemoMqtt = new WemoBinaryMqtt(wemoSwitch, options);
		break;

	case wemo.WemoSensor.deviceType:
		var wemoSensor = new wemo.WemoSensor(device);
		var wemoMqtt = new WemoBinaryMqtt(wemoSensor, options);
		break;
	}
}

var cp = new UpnpControlPoint();

cp.on("device", handleDevice);

cp.search();
