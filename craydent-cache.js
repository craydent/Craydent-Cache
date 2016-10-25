/*/---------------------------------------------------------/*/
/*/ Craydent LLC cache-v0.4.1                               /*/
/*/	Copyright 2011 (http://craydent.com/about)              /*/
/*/ Dual licensed under the MIT or GPL Version 2 licenses.  /*/
/*/	(http://craydent.com/license)                           /*/
/*/---------------------------------------------------------/*/
/*/---------------------------------------------------------/*/

// refresh/clear cache
// mongo support, object support
const $c = require('craydent/noConflict');
const fs = require('fs');
const fswrite = $c.yieldable(fs.writeFile, fs);
const fsread = $c.yieldable(fs.readFile, fs);
const fsstat = $c.yieldable(fs.stat, fs);
const fsreaddir = $c.yieldable(fs.readdir, fs);
const fsdelete = $c.yieldable(fs.unlink, fs);
var dir = __dirname.replace(process.cwd(),'') + '/cache/', curdir = '.' + dir;

function delete_cached_files (sync) {
	if (sync) {
		if (fs.existsSync(curdir)) {
			fs.readdirSync(curdir).forEach(function (file) {
				fs.unlinkSync(curdir + file);
			});
		}
		return;
	}
	return $c.syncroit(function* () {
		var err = yield fsstat(curdir)[0];
		var unlinks = [];
		if (!err) {
			var args = yield fsreaddir(curdir), err = args[0], dirs = args[1];
			if (err) { return; }
			for (var i = 0, len = dirs.length; i < len; i++) {
				unlinks.push(fsdelete(curdir + dirs[i]));
			}
		}
		yield $c.parallelEach(unlinks);
	});
}
delete_cached_files(true);
$c.syncroit(function*() {
	var mkdir = $c.yieldable($c.mkdirRecursive, $c);
	yield mkdir(dir);
});

function CraydentCache(options){
/*|{
	"info": "Class that caches requests and queries for performance.",
	"category": "Plugin",
	"parameters":[
		{"options": "(Object) specs with properties:<br />(Int) refresh_interval<br />(Boolean) in_memory<br />"}],

	"description":"<h2>Configuration details:</h2><br /><h3>refresh_interval</h3><p><br /></p><h3>in_memory</h3><p>This field is a flag to indicate to use memory and not the default file system to cache.  This will make the retrieval fast in sacrifice of memory space and limitaitons.<br /></p>",
	"overloads":[],

	"url": "",
	"returnType": "(void)"
}|*/
	var self = this;
	options = options || {};
	self.rootdir = dir;

	// Properties
	this.refresh_interval = options.refresh_interval || 1000*60*60;
	this.in_memory = !!options.in_memory;
	this.files = options.files || {};
	this._aliases = {};
	this.memory_data = options.memory_data || {};

	// Methods
	this.add = function (name, func, refresh_interval, alias){
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
				{"refresh_interval": "(Int) Time interval in ms to refresh the data"}]},

			{"parameters":[
				{"Url": "(String) Url to the end point"},
				{"alias": "(String) Alias to use when retrieving the data"}]},

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
		return $c.syncroit(function* () {
			try {
				var options = {};
				if ($c.isString(refresh_interval)) {
					alias = refresh_interval;
					refresh_interval = undefined;
				}
				if ($c.isObject(func)) {
					options = func;
					func = options.callback;
				} else if ($c.isInt(func)) {
					refresh_interval = func;
					func = undefined;
				} else if ($c.isString(func)) {
					alias = func;
					func = undefined;
				}
				refresh_interval = refresh_interval || self.refresh_interval;
				var files = self.files;
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
					return $c.syncroit(function *(){
						var err = yield fswrite(curdir + filename, typeof data == 'object' ? JSON.stringify(data) : data);
						if (err) { $c.logit(err); return false; }
						files[name].current = filename;
						files[name].timeout = setTimeout(function () {
							if ($c.isGenerator(func)) {
								return $c.syncroit(function*(){ return yield* func(cb); });
							}
							if ($c.isPromise(func)) { return $c.syncroit(function*(){ return yield func; }); }
							return !!func && func(cb);
						}, refresh_interval);
						return true;
					});
				};

				if ($c.isString(func) && /^https?:\/\/.*$/.test(func)) { // is a url
					var url = func;
					name = func + JSON.stringify(options);
					func = function* (callback) {
						var epdata = yield $c.ajax({
							url: url,
							headers: options.headers,
							method: options.method || "GET",
							data: options.data
						});
						return yield callback(epdata);
					};
				} else if (/^mongodb:\/\/.*$/.test(name)) {
					var con = name, collection = options.collection, query = options.find,
						MongoClient = require('mongodb').MongoClient,
						connect = $c.yieldable(MongoClient.connect, MongoClient);
					name = JSON.stringify(options);
					func = function* (callback) {
						var args = yield connect(con), err = args[0], db = args[1];
						if (err) {
							$c.logit(err);
							return false;
						}
						var collection = db.collection(collection);
						var query = collection.find(query);

						var margs = yield ($c.yieldable(query.toArray, query)()), m_err = margs[0], data = margs[1];
						if (m_err) {
							$c.logit(m_err);
							return false
						}
						return yield callback(data);
					}
				} else {
					name += JSON.stringify(options);
				}

				if ($c.isGenerator(func)) { return yield* func(cb); }
				if ($c.isPromise(func)) { return yield func; }

				return !!func && func(cb);

			} catch (e) {
				$c.logit(e);
				return false;
			}
		});
	};
	this.delete = function (name, mongo) {
	/*|{
		"info": "Method to delete data for all or a specified cache store.",
		"category": "Plugin",
		"parameters":[],

		"overloads":[
			{"parameters":[
				{"Url": "(String) Url to the end point"}]},

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
		mongo = mongo || {};
		return $c.syncroit(function* () {
			try {
				var alias = name;
				name = name + JSON.stringify(mongo);
				var file = self.files[name];
				if (self._aliases[alias]) {
					file = self._aliases[alias];
				}

				if (!file && arguments.length) { return false; }

				var files = file ? {f:file} : self.files;
				var unlinks = [];
				for (var prop in files) {
					if (!files.hasOwnProperty(prop)) { continue; }
					file = files[prop];
					unlinks.push(fsdelete(file.cuid0));
					unlinks.push(fsdelete(file.cuid1));
					clearTimeout(file.timeout);
					delete self._aliases[file.alias];
					delete self.memory_data[file.name];
					delete files[prop];
				}
				yield $c.parallelEach(unlinks);
				return true;
			} catch (e) {
				$c.logit(e);
				return false;
			}
		});
	};
	this.get = function (name, mongo) {
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
		return $c.syncroit(function* () {
			try {
				var alias = name;
				mongo = mongo || {};
				name = name + JSON.stringify(mongo);
				var file = self.files[name];
				if (self._aliases[alias]) {
					file = self._aliases[alias];
					if (self.in_memory) {
						return self.memory_data[file.name] || false;
					}
				}
				if (!file) { return false; }
				if (self.in_memory) { return self.memory_data[file.name] || false; }
				var args = yield fsread(curdir + file.current), err = args[0], data = args[1];
				if (err) { $c.logit(err); return false; }
				if ($c.isNull(data)) { return false; }
				return $c.tryEval(data, JSON.parse) || data.toString();

			} catch (e) {
				$c.logit(e);
				return false;
			}
		});
	};
	this.refresh = function (name, mongo) {
	/*|{
		"info": "Method to refresh data for all or a specified cache store.",
		"category": "Plugin",
		"parameters":[],

		"overloads":[
			{"parameters":[
				{"Url": "(String) Url to the end point"}]},

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
		var arglen = arguments.length;
		return $c.syncroit(function*() {
			try {
				var files = self.files,
					alias = name;
				mongo = mongo || {};
				name = name + JSON.stringify(mongo);
				//var file = self.files[name];
				files = self._aliases[alias] || self.files[name] ? {f: self._aliases[alias] || self.files[name]} : files;
				if (!arglen) {
					yield delete_cached_files();
					self.memory_data = {};
					self.files = {};
				}
				var rtn = true;
				for (var prop in files) {
					if (!files.hasOwnProperty(prop)) { continue; }
					var file = files[prop];
					var success = yield self.add(alias, file.method, file.refresh_interval, file.alias);
					if (!success) {
						$c.logit("failed to add item to cache: ", {
							name: file.name,
							method: file.method,
							refresh_interval: file.refresh_interval,
							alias: file.alias
						});
						rtn = false;
					}
				}
				return rtn;

			} catch (e) {
				$c.logit(e);
				return false;
			}
		});
	};
}
CraydentCache.VERSION = require('./package.json').version;
module.exports = CraydentCache;