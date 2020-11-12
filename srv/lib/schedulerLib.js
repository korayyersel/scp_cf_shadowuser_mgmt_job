"use strict";

var xsenv = require("@sap/xsenv");
var https = require("https");
var jobsc = require("@sap/jobs-client");

module.exports = {

	getJobOptions: function () {
		var jobOptions = xsenv.getServices({
			jobs: {
				tag: "jobscheduler"
			}
		});
		return jobOptions;
	},

	getJobSchedulerAPIToken: function () {
		return new Promise(function (resolve, reject) {
			var jobOptions = this.getJobOptions();
			var querystring = require("querystring");
			var host = jobOptions.jobs.uaa.url.toString().replace("https://", "").replace("http://", "");
			var clientid = jobOptions.jobs.uaa.clientid;
			var clientsecret = jobOptions.jobs.uaa.clientsecret;

			// form data
			var postData = querystring.stringify({
				grant_type: "client_credentials",
				client_id: clientid,
				client_secret: clientsecret
			});

			// request option
			var options = {
				host: host,
				port: 443,
				method: 'POST',
				path: '/oauth/token',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
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
						reject();
					}
				});
				res.on('error', function (err) {
					console.log(err);
					reject();
				});
			});

			// req error
			req.on('error', function (err) {
				console.log(err);
			});

			//send request witht the postData form
			req.write(postData);
			req.end();
		}.bind(this));
	},

	updateJob: function (schedulerUpdateRequest, success, message) {
		var jobOptions = this.getJobOptions();

		var schedulerOptions = {
			baseURL: jobOptions.jobs.url,
			token: '',
			timeout: 15000
		};

		var tokenPromise = this.getJobSchedulerAPIToken();
		tokenPromise.then(function (token) {
			var schedulerUpdateBody = {
				success: success,
				message: message
			};
			schedulerOptions.token = token;
			var scheduler = new jobsc.Scheduler(schedulerOptions);
			schedulerUpdateRequest.data = schedulerUpdateBody;
			scheduler.updateJobRunLog(schedulerUpdateRequest, function (err, result) {
				if (err) {
					return console.log('Error updating run log: %s', err);
				}
			});
		});
	},

	createJob: function (jobDescription) {
		return new Promise(function (resolve, reject) {
			var jobOptions = this.getJobOptions();
			var schedulerOptions = {
				baseURL: jobOptions.jobs.url,
				token: '',
				timeout: 15000
			};
			var tokenPromise = this.getJobSchedulerAPIToken();
			tokenPromise.then(function (token) {
				schedulerOptions.token = token;
				var scheduler = new jobsc.Scheduler(schedulerOptions);
				scheduler.createJob(jobDescription, function (err, body) {
					if (err) {
						console.dir(err);
						reject(err);
					} else {
						resolve(body);
					}
				});
			});
		}.bind(this));
	}
};