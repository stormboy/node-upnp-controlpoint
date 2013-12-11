var util = require('util'),
	EventEmitter = require('events').EventEmitter;

var TRACE = true;
var DETAIL = false;

/**
 * A UPnP WeMo Controllee.  Includes socket switch.
 */
var WemoControllee = function(device) {
	EventEmitter.call(this);
    
	var self = this;
	this.device = device;
	this.eventService = null;

	// find the basic event service in the device
	for (name in this.device.services) {
		var service = this.device.services[name];
		if (service.serviceType == SERVICE_TYPE_BasicEvent) {
			self.eventService = service;
			break;
		}
	};

	if (this.eventService) {
		this.eventService.on("stateChange", function(value) {
			if (TRACE && DETAIL) {
				console.log("wemo switch state change: " + JSON.stringify(value));
			}
			if (value["BinaryState"]) {
				self.emit("BinaryState", value.BinaryState);
			}
			else if (value["UserAction"]) {
				self.emit("UserAction", value.BinaryState);
			}
		});
		this.eventService.subscribe(function(err, data) {
			//
		});
	}
	
};

util.inherits(WemoControllee, EventEmitter);

WemoControllee.deviceType = "urn:Belkin:device:controllee:1";

/**
 * send state change to device
 */
WemoControllee.prototype.setBinaryState = function(value) {
	var self = this;
	var v = value ? 1 : 0;
	var args = { BinaryState : v };
	this.eventService.callAction(ACTION_SetBinaryState, args, function(err, buf) {
		if (err) {
			console.log("got err when performing action: " + err + " => " + buf);
		}
		else {
			if (TRACE && DETAIL) {
				console.log("got SOAP reponse: " + buf);
			}
			
			// if success, can emit state change immediately
			self.emit("BinaryState", v);
		}
	});
};

/**
 * A UPnP WeMo motion sensor.
 */
var WemoSensor = function(device) {
	EventEmitter.call(this);
	
	var self = this;
    
	this.device = device;
	this.eventService = null;

	// find the basic event service in the device
	for (name in this.device.services) {
		var service = this.device.services[name];
		if (service.serviceType == SERVICE_TYPE_BasicEvent) {
			self.eventService = service;
			break;
		}
	};

	if (this.eventService) {
		this.eventService.on("stateChange", function(value) {
			// console.log("wemo motion sensor state change: " + JSON.stringify(value));
			if (value["BinaryState"]) {
				self.emit("BinaryState", value.BinaryState);
			}
		});
		this.eventService.subscribe(function(err, data) {
			//
		});
	}
};

util.inherits(WemoSensor, EventEmitter);

WemoSensor.deviceType = "urn:Belkin:device:sensor:1";


exports.devices = [ WemoControllee, WemoSensor ];
exports.WemoControllee = WemoControllee;
exports.WemoSensor = WemoSensor;


const SERVICE_TYPE_BasicEvent = "urn:Belkin:service:basicevent:1";
const SERVICE_TYPE_WiFiSetup = "urn:Belkin:service:WiFiSetup:1";
const SERVICE_TYPE_TimeSync = "urn:Belkin:service:timesync:1";
const SERVICE_TYPE_FirmwareUpdate = "urn:Belkin:service:firmwareupdate:1";
const SERVICE_TYPE_Rules = "urn:Belkin:service:rules:1";
const SERVICE_TYPE_MetaInfo = "urn:Belkin:service:metainfo:1";
const SERVICE_TYPE_RemoteAccess = "urn:Belkin:service:remoteaccess:1";

const ACTION_SetBinaryState = "SetBinaryState";



/* ---------------------------------------------------------------------------------- */
const SOAP_ENV_PRE = "<?xml version=\"1.0\"?>\n<s:Envelope \
xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\" \
s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><s:Body>\n";

const SOAP_ENV_POST = "</s:Body>\n</s:Envelope>\n";


