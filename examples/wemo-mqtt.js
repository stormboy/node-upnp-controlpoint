var util = require("util");

/**
 * Glue between MQTT and UPnP services.
 * 
 * Requires mqttjs library
 */
var UpnpControlPoint = require("../lib/upnp-controlpoint").UpnpControlPoint,
	wemo = require("../lib/wemo"),
	mqtt = require('mqtt'),
   	crypto = require('crypto');

var TRACE = true;
var DETAIL = false;

// TODO MQTT service discovery
// TODO publish lifecycle messages

var options = {
    log: true,
    
    // MQTT settings
    mqtt : {
    	"host" : "192.168.0.23",
    	"port" : 1883
    },
    
    // MQTT topics
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
	
	this.TOPIC_lifecycle   = "/meem/" + wemo.device.uuid + "/lifecycle";
	this.TOPIC_binaryIn   = "/meem/" + wemo.device.uuid + "/" + options.mqttPaths.binaryIn;		// binary control
	this.TOPIC_binaryOut  = "/meem/" + wemo.device.uuid + "/" + options.mqttPaths.binaryOut;	// binary state

	this.state = { binary : {} };

	this.mqttClient = null;
	//this.pingTimer = null;
	
	this.init(options.mqtt);
};

WemoBinaryMqtt.prototype.subscribe = function() {
	if (this.mqttClient) {
		// subscribe to contorl topics
		if (TRACE) {
			console.log("MQTT subscribing: " + this.TOPIC_binaryIn)
		}
		this.mqttClient.subscribe( this.TOPIC_binaryIn );
		
		// subscribe to topics for requests for initial-content (state).
		this.mqttClient.subscribe( this.TOPIC_binaryOut+"?" );
	}
};

WemoBinaryMqtt.prototype.init = function(options) {
	var self = this;
	
	if (TRACE) {
		console.log("initialise MQTT connection");
	}
	
	var clientId = crypto.randomBytes(24).toString("hex");
	
	// connect to MQTT service
	this.mqttClient = mqtt.createClient(options.port, options.host, {
		keepalive: 10000,
		client : clientId
	});
	
	// add handlers to MQTT client
	this.mqttClient.on('connect', function() {
		if (TRACE) {
			console.log('MQTT sessionOpened');
		}
		self.subscribe();	// subscribe to control and request topics
	});
	this.mqttClient.on('close', function() {
		if (TRACE) {
			console.log('MQTT close');
		}
	});
	this.mqttClient.on('error', function(e) {
		if (TRACE) {
			console.log('MQTT error: ' + e);
		}
	});
	this.mqttClient.addListener('message', function(topic, payload) {
		// got data from subscribed topic
		if (TRACE) {
			console.log('received ' + topic + ' : ' + payload);
		}
		var packet = {
				topic : topic,
				payload : payload,
		};

		// check if message is a request for current value, send response
		var i = topic.indexOf("?");
		if (i > 0) {
			self.handleContentRequest(packet);
		}
		else {
			self.handleInput(packet);
		}
	});

	// add WeMo state handlers	
	this.wemo.on('BinaryState', function(value) {
		var v = value == 1 ? true : false;
		self.state.binary = { value : v };
		self.mqttClient.publish( self.TOPIC_binaryOut, JSON.stringify(self.state.binary) );
	});
};


WemoBinaryMqtt.prototype.handleContentRequest = function(packet) {
	var self = this;
	var i = packet.topic.indexOf("?");
	var requestTopic = packet.topic.slice(0, i);
	var responseTopic = packet.payload;
	if (TRACE) {
		console.log("requestTopic: " + requestTopic + "  responseTopic: " + responseTopic);
	}
	if (requestTopic == self.TOPIC_binaryOut) {
		if (TRACE) {
			console.log("sending binaryOut content: " + self.state.binary);
		}
		self.mqttClient.publish( responseTopic, JSON.stringify(self.state.binary) );
	}
};

/**
 * Handle an input MQTT message
 * @param {Object} self
 * @param {Object} packet
 */
WemoBinaryMqtt.prototype.handleInput = function(packet) {
	if (packet.topic == this.TOPIC_binaryIn) {
		var msg = JSON.parse(packet.payload);
		this.wemo.setBinaryState(msg.value);
	}
	// else unhandled topic
};

/**
 * Handle discovered UPnP device
 */
var handleDevice = function(device) {

	if (TRACE) {
		console.log("handling device:" + device.deviceType + " " + device.manufacturer);
		if (DETAIL) {
			console.log("handling device:" + util.inspect(device));
		}
	}
	
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
};

var cp = new UpnpControlPoint();

cp.on("device", handleDevice);

cp.search();
