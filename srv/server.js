/*eslint no-console: 0*/
"use strict";

var port = process.env.PORT || 3000;
var express = require("express");
var https = require("https");
var passport = require("passport");
var xssec = require("@sap/xssec");
var xsenv = require("@sap/xsenv");
var schedulerLib = require("./lib/schedulerLib");
const { response } = require("express");

var app = express();

passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
	uaa: {
		name: "shadowuser-mgmt-job-uaa"
	}
}).uaa));

app.use(passport.initialize());

app.use(
	passport.authenticate("JWT", {
		session: false
	})
);

function messageJobStart(res, jobname) {
	return new Promise(function (resolve, reject) {
		res.type("text/plain").status(202).send("Async Job started: " + jobname).then(resolve());
	});
}

function getToken() {
	return new Promise(function (resolve, reject) {
		var shadowUserAPIAccessConfiguration = xsenv.getServices({
			configuration: {
				name: "general-apiaccess"
			}
		});
		var querystring = require("querystring");
		var postData = querystring.stringify({
			grant_type: "client_credentials",
			response_type: "token"
		});
		
		var host = shadowUserAPIAccessConfiguration.configuration.url.toString().replace("https://", "").replace("http://", "");
		var auth = Buffer.from(
			shadowUserAPIAccessConfiguration.configuration.clientid + ":" + 
			shadowUserAPIAccessConfiguration.configuration.clientsecret)
			.toString('base64');

		var options = {
			host: host,
			port: 443,
			method: 'POST',
			path: '/oauth/token',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': 'Basic ' + auth,
				'Content-Length': postData.length
			}
		};
		// request object
		var req = https.request(options, function (res) {
			var result = '';
			res.on('data', function (chunk) {
				result += chunk;
			});
			res.on('end', function () {
				var resultJSON = JSON.parse(result);
				if (resultJSON && resultJSON.access_token) {
					resolve(resultJSON.access_token);
				} else {
					reject("unexpected response");
				}
			});
			res.on('error', function (err) {
				console.log(err);
				reject(err);
			});
		});
		// req error
		req.on('error', function (err) {
			console.log(err);
		});
		//send request witht the postData form
		req.write(postData);
		req.end();
	});
}

function readUsers(startIndex){
	return new Promise(async function (resolve, reject) {
		var currentToken = await getToken();	
		var shadowUserAPIAccessConfiguration = xsenv.getServices({
			configuration: {
				name: "general-apiaccess"
			}
		});
				
		var host = shadowUserAPIAccessConfiguration.configuration.apiurl.toString().replace("https://", "").replace("http://", "");
		var path = startIndex ? "/Users?startIndex=" + startIndex : "/Users";		
		var options = {
			host: host,
			port: 443,
			method: 'GET',
			path: path,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': 'Bearer ' + currentToken
			}
		};
		// request object
		var req = https.request(options, function (res) {
			var result = '';
			res.on('data', function (chunk) {
				result += chunk;
			});
			res.on('end', function () {				
				if(res.statusCode === 200){
					resolve(result);
				} else {
					reject(res.statusCode);
				} 
			});
			res.on('error', function (err) {
				console.log(err);
				reject();
			});
		});
		req.end();
	});
}

function readGroups(startIndex){
	return new Promise(async function (resolve, reject) {
		var currentToken = await getToken();	
		var shadowUserAPIAccessConfiguration = xsenv.getServices({
			configuration: {
				name: "general-apiaccess"
			}
		});
				
		var host = shadowUserAPIAccessConfiguration.configuration.apiurl.toString().replace("https://", "").replace("http://", "");
		var path = startIndex ? "/Groups?startIndex=" + startIndex : "/Groups";		
		var options = {
			host: host,
			port: 443,
			method: 'GET',
			path: path,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': 'Bearer ' + currentToken
			}
		};
		// request object
		var req = https.request(options, function (res) {
			var result = '';
			res.on('data', function (chunk) {
				result += chunk;
			});
			res.on('end', function () {				
				if(res.statusCode === 200){
					resolve(result);
				} else {
					reject(res.statusCode);
				} 
			});
			res.on('error', function (err) {
				console.log(err);
				reject();
			});
		});
		req.end();
	});
}

app.get("/readShadowUsers", function (req, res) {
	var jobID = req.get("x-sap-job-id");
	var jobScheduleId = req.get("x-sap-job-schedule-id");
	var jobRunId = req.get("x-sap-job-run-id");

	var schedulerUpdateRequest = {
		jobId: jobID,
		scheduleId: jobScheduleId,
		runId: jobRunId,
		data: ""
	};

	var jobStartPromise = messageJobStart(res, "readShadowUsers");
	jobStartPromise.then(async function () {		
		var users = null;
		try{
			var response = await readUsers();
			var responseAsJSON = JSON.parse(response);
			users = responseAsJSON.resources;
			
			if(responseAsJSON.totalResults > 100){
				for (var startIndex = 101; startIndex <= responseAsJSON.totalResults;) {
					var response = await readUsers(startIndex);
					var responseAsJSON = JSON.parse(response);
					users = users.concat(responseAsJSON.resources);
					startIndex += 100;
				}				
			}
		} catch(error){
			// do nothing, just go on
		} finally {
			if(users && users.length){
				schedulerLib.updateJob(schedulerUpdateRequest, true, "Async Job ended succesfully: " + users.length + " users found");
			} else {
				schedulerLib.updateJob(schedulerUpdateRequest, true, "Async Job ended with error: cannot read users");
			}
		}		
	});
});

app.get("/readGroups", function (req, res) {
	var jobID = req.get("x-sap-job-id");
	var jobScheduleId = req.get("x-sap-job-schedule-id");
	var jobRunId = req.get("x-sap-job-run-id");

	var schedulerUpdateRequest = {
		jobId: jobID,
		scheduleId: jobScheduleId,
		runId: jobRunId,
		data: ""
	};

	var jobStartPromise = messageJobStart(res, "readGroups");
	jobStartPromise.then(async function () {		
		var groups = null;
		try{
			var response = await readGroups();
			var responseAsJSON = JSON.parse(response);
			groups = responseAsJSON.resources;
			
			if(responseAsJSON.totalResults > 100){
				for (var startIndex = 101; startIndex <= responseAsJSON.totalResults;) {
					var response = await readGroups(startIndex);
					var responseAsJSON = JSON.parse(response);
					groups = groups.concat(responseAsJSON.resources);
					startIndex += 100;
				}				
			}
		} catch(error){
			// do nothing, just go on
		} finally {
			if(groups && groups.length){
				schedulerLib.updateJob(schedulerUpdateRequest, true, "Async Job ended succesfully: " + groups.length + " groups found");
			} else {
				schedulerLib.updateJob(schedulerUpdateRequest, true, "Async Job ended with error: cannot read groups");
			}
		}		
	});
});

app.get("/pingShadowUserAccess", function (req, res) {
	var jobID = req.get("x-sap-job-id");
	var jobScheduleId = req.get("x-sap-job-schedule-id");
	var jobRunId = req.get("x-sap-job-run-id");

	var schedulerUpdateRequest = {
		jobId: jobID,
		scheduleId: jobScheduleId,
		runId: jobRunId,
		data: ""
	};

	var shadowUserAPIAccessConfiguration = xsenv.getServices({
		configuration: {
			name: "general-apiaccess"
		}
	});

	var clienid = shadowUserAPIAccessConfiguration.configuration.clientid;
	var clientsecret = shadowUserAPIAccessConfiguration.configuration.clientsecret;
	var authURL = shadowUserAPIAccessConfiguration.configuration.url;

	var jobStartPromise = messageJobStart(res, "pingShadowUserAccess");
	jobStartPromise.then(async function () {
		if(clienid && clientsecret && authURL){
			schedulerLib.updateJob(schedulerUpdateRequest, true, "Async Job ended succesfully: environment variables can be read");
		}else{
			schedulerLib.updateJob(schedulerUpdateRequest, false, "Async Job ended with error: API access information could not be retrieved");
		}	
	});
});

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

	var jobStartPromise = messageJobStart(res, "demoJobAsync");
	jobStartPromise.then(async function () {
		await new Promise(resolve => setTimeout(resolve, 25000));
		schedulerLib.updateJob(schedulerUpdateRequest, true, "Async Demo Job ended succesfully");
	});
});

app.listen(port, function () {
	console.log("myapp listening on port " + port);
});