/*/---------------------------------------------------------/*/
/*/ Craydent LLC cache-v0.2.0                               /*/
/*/	Copyright 2011 (http://craydent.com/about)              /*/
/*/ Dual licensed under the MIT or GPL Version 2 licenses.  /*/
/*/	(http://craydent.com/license)                           /*/
/*/---------------------------------------------------------/*/
/*/---------------------------------------------------------/*/

// refresh/clear cache
// mongo support, object support
require('craydent/noConflict');
var fs = require('fs'),
	dir = __dirname.replace(process.cwd(),'') + '/cache/', curdir = '.' + dir;

function delete_cached_files () {
	if (fs.existsSync(curdir)) {
		fs.readdirSync(curdir).forEach(function (file) {
			fs.unlinkSync(curdir + file);
		});
	}
}
delete_cached_files();

/*|{
	"info": "Class that caches requests and queries for performance.",
	"category": "Plugin",
	"parameters":[
		{"params": "(Object) specs with properties:<br />(Int) refresh_interval<br />(Boolean) in_memory<br />"}],

 	"description":"<h2>Configuration details:</h2><br /><h3>refresh_interval</h3><p><br /></p><h3>in_memory</h3><p>This field is a flag to indicate to use memory and not the default file system to cache.  This will make the retrieval fast in sacrifice of memory space and limitaitons.<br /></p>",
	"overloads":[],

	"url": "",
	"returnType": "(void)"
}|*/
function Cache(params){
	var self = this;
	params = params || {};
	self.rootdir = dir;

	// Properties
	this.refresh_interval = params.refresh_interval || 1000*60*60;
	this.in_memory = !!params.in_memory;
	this.files = params.files || {};
	this._aliases = {};
	this.memory_data = params.memory_data || {};

	// Methods
	/*|{
		"info": "Method to add data end points or queries to be stored in the cache.",
		"category": "method",
		"parameters":[
			{"Url": "(String) Url to the end point"}],

	 "overloads":[
		{"parameters":[
			{"Url": "(String) Url to the end point"},
			{"options": "(Object) Options such as headers(property=>'headers'), request method such as GET and POST (property=>'method'), and the payload to send to the request (property=>'data')"}]},

		{"parameters":[
			{"Url": "(String) Url to the end point"},
			{"options": "(Object) Options such as headers(property=>'headers'), request method such as GET and POST (property=>'method'), and the payload to send to the request (property=>'data')"},
			{"refresh_interval": "(Int) Time interval in ms to refresh the data"}]},

		{"parameters":[
			{"Url": "(String) Url to the end point"},
			{"options": "(Object) Options such as headers(property=>'headers'), request method such as GET and POST (property=>'method'), and the payload to send to the request (property=>'data')"},
			{"alias": "(String) Alias to use when retrieving the data"}]},

		{"parameters":[
			{"Url": "(String) Url to the end point"},
			{"options": "(Object) Options such as headers(property=>'headers'), request method such as GET and POST (property=>'method'), and the payload to send to the request (property=>'data')"},
			{"refresh_interval": "(Int) Time interval in ms to refresh the data"},
	 		{"alias": "(String) Alias to use when retrieving the data"}]},

		{"parameters":[
			{"MongoConnection": "(String) Mongo connection string"},
			{"Options": "(Object) Required fields are 'collection' and 'find'. 'collection' is the collections name in the MongoDB and find is the MongoDB query as an object."}]},

		{"parameters":[
			{"MongoConnection": "(String) Mongo connection string"},
			{"Options": "(Object) Required fields are 'collection' and 'find'. 'collection' is the collections name in the MongoDB and find is the MongoDB query as an object."},
			{"refresh_interval": "(Int) Time interval in ms to refresh the data"}]}

		{"parameters":[
			{"MongoConnection": "(String) Mongo connection string"},
			{"Options": "(Object) Required fields are 'collection' and 'find'. 'collection' is the collections name in the MongoDB and find is the MongoDB query as an object."},
	 		{"alias": "(String) Alias to use when retrieving the data"}]}

		{"parameters":[
			{"MongoConnection": "(String) Mongo connection string"},
			{"Options": "(Object) Required fields are 'collection' and 'find'. 'collection' is the collections name in the MongoDB and find is the MongoDB query as an object."},
			{"refresh_interval": "(Int) Time interval in ms to refresh the data"},
	 		{"alias": "(String) Alias to use when retrieving the data"}]}],

		"url": "",
		"returnType": "(void)"
	}|*/
	this.add = function (name, func, refresh_interval, alias){
		return new Promise(function (res) {
			try {
				if ($c.isString(refresh_interval)) {
					alias = refresh_interval;
					refresh_interval = undefined;
				}
				refresh_interval = refresh_interval || self.refresh_interval;
				var files = self.files;
				var options = {};
				if ($c.isObject(func)) {
					options = func;
					func = undefined;
				}
				if (!func && /^http(s?):\/\/.*$/.test(name)) {
					func = name;
				}
				var cb = function (data) {
					if (!files[name]) {
						files[name] = {};
						files[name].name = name;
						files[name].cuid0 = files[name].cuid0 || $c.cuid();
						files[name].cuid1 = files[name].cuid1 || $c.cuid();
						files[name].current = files[name].cuid0;
						files[name].refresh_interval = refresh_interval;
						files[name].method = func;
						files[name].alias = alias;
					}
					if (self.in_memory) {
						self.memory_data[name] = data;
					}
					files[name].last_updated = $c.now();
					alias && (self._aliases[alias] = files[name]);
					var filename = files[name].current == files[name].cuid0 ? files[name].cuid1 : files[name].cuid0;
					fs.writeFile(curdir + filename, typeof data == 'object' ? JSON.stringify(data) : data, function (err) {
						if (err) {
							return res(false);
						}
						files[name].current = filename;
						res(true);
						setTimeout(function () {
							if (!$c.isGenerator(func)) {
								return func(cb);
							} else {
								eval("$c.syncroit(function*(){ cb(yield* func());});")
							}
						}, refresh_interval);
					});
				};
				if ($c.isString(func) && /^https?:\/\/.*$/.test(func)) { // is a url
					var url = func;
					name = func + JSON.stringify(options);
					func = function (callback) {
						$c.ajax({
							url: url,
							headers: options.headers,
							method: options.method || "GET",
							data: options.data,
							onsuccess: function (data) {
								callback(data);
							},
							onerror:function (err) {
								if (err) { $c.logit(err); return res(false); }
							}
						});
					};
				} else if (/^mongodb:\/\/.*$/.test(name)) {
					var con = name, collection = options.collection, query = options.find;
					name = JSON.stringify(options);

					func = function (callback) {
						var MongoClient = require('mongodb').MongoClient;
						MongoClient.connect(con, function (err, db) {
							if (err) { $c.logit(err); return res(false); }
							var collection = db.collection(collection);
							// Find some documents
							collection.find(query).toArray(function (err, data) {
								callback(data);
							});
						});
					};
				} else {
					name += JSON.stringify(options);
				}
				$c.mkdirRecursive(self.rootdir, function () {
					if (!$c.isGenerator(func)) {
						return func(cb);
					} else {
						eval("$c.syncroit(function*(){ cb(yield* func());});")
					}
				});

			} catch (e) {
				$c.logit(e);
				return res(false);
			}
		});
	};
	/*|{
		"info": "Method to get data for the specified cache store.",
		"category": "Plugin",
		"parameters":[
			{"Url": "(String) Url to the end point"}],

		"overloads":[
			{"parameters":[
				{"Alias": "(String) Alias to the data."}]},

			{"parameters":[
				{"Url": "(String) Url to the end point"},
				{"options": "(Object) Options that were passed when adding."}]},

			{"parameters":[
				{"MongoConnection": "(String) Mongo connection string"},
				{"Options": "(Object) Options that were passed when adding."}]}],

		"url": "",
		"returnType": "(void)"
	}|*/
	this.get = function (name, mongo) {
		return new Promise(function (res) {
			try {
				var alias = name;
				mongo = mongo || {};
				name = name + JSON.stringify(mongo);
				var file = self.files[name];
				if (self._aliases[alias]) {
					file = self._aliases[alias];
					if (self.in_memory) {
						return res(self.memory_data[file.name]);
					}
				}
				if (!file) {
					return res(false);
				}
				if (self.in_memory) {
					return res(self.memory_data[file.name]);
				}
				fs.readFile(curdir + file.current, function (err, data) {
					if (err) { $c.logit(err); return res(false);}
					res($c.tryEval(data, JSON.parse) || data.toString());
				});

			} catch (e) {
				$c.logit(e);
				return res(false);
			}
		});
	};
	this.refresh = function (name, mongo) {
		return $c.syncroit(function*() {
			try {
				var files = self.files,
					alias = name;
				mongo = mongo || {};
				name = name + JSON.stringify(mongo);
				//var file = self.files[name];
				files = self._aliases[alias] || self.files[name] ? [self._aliases[alias] || self.files[name]] : files;

				delete_cached_files();
				self.memory_data = {};
				self.files = {};
				var rtn = true;
				for (var file in files) {
					if (!files.hasOwnProperty(file)) {
						continue;
					}
					var success = yield self.add(alias, files[file].method, files[file].refresh_interval, files[file].alias);
					if (!success) {
						$c.logit("failed to add item to cache: ", {
							name: files[file].name,
							method: files[file].method,
							refresh_interval: files[file].refresh_interval,
							alias: files[file].alias
						});
						rtn = false;
					}
				}
				return rtn;

			} catch (e) {
				$c.logit(e);
				return res(false);
			}
		});
	};
}
Cache.VERSION = require('./package.json').version;
module.exports = Cache;