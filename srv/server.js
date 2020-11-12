/*eslint no-console: 0*/
"use strict";

var port = process.env.PORT || 3000;
var express = require("express");
var passport = require("passport");
var xssec = require("@sap/xssec");
var xsenv = require("@sap/xsenv");
var schedulerLib = require("./lib/schedulerLib");

var app = express();
passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
	uaa: {
		tag: "xsuaa"
	}
}).uaa));

app.use(passport.initialize());

app.use(
	passport.authenticate("JWT", {
		session: false
	})
);

app.get("/demoJobSync", function (req, res) {
	res.writeHead(200, {
		"Content-Type": "text/plain"
	});
	res.end("Sync Demo Job is called!");
});

function messageJobStart(res) {
	return new Promise(function (resolve, reject) {
		res.type("text/plain").status(202).send("Async Demo Job started").then(resolve());
	});
}

app.get("/demoJobAsync", function (req, res) {
	var jobID = req.get("x-sap-job-id");
	var jobScheduleId = req.get("x-sap-job-schedule-id");
	var jobRunId = req.get("x-sap-job-run-id");

	var schedulerUpdateRequest = {
		jobId: jobID,
		scheduleId: jobScheduleId,
		runId: jobRunId,
		data: ""
	};

	var jobStartPromise = messageJobStart(res);
	jobStartPromise.then(async function () {
		await new Promise(resolve => setTimeout(resolve, 25000));
		schedulerLib.updateJob(schedulerUpdateRequest, true, "Async Demo Job ended succesfully");
	});
});

app.get("/demoJobWithErrorAsync", function (req, res) {
	var jobID = req.get("x-sap-job-id");
	var jobScheduleId = req.get("x-sap-job-schedule-id");
	var jobRunId = req.get("x-sap-job-run-id");

	var schedulerUpdateRequest = {
		jobId: jobID,
		scheduleId: jobScheduleId,
		runId: jobRunId,
		data: ""
	};

	var jobStartPromise = messageJobStart(res);
	jobStartPromise.then(async function () {
		await new Promise(resolve => setTimeout(resolve, 25000));
		schedulerLib.updateJob(schedulerUpdateRequest, false, "Async Demo Job ended with an error. Please check xxx.");
	});
});

app.listen(port, function () {
	console.log("myapp listening on port " + port);
});