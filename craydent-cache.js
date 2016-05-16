require('craydent');
var fs = require('fs');
var dir = __dirname.replace(process.cwd(),'') + '/cache/', curdir = '.' + dir;
if (fs.existsSync(curdir)) {
	fs.readdirSync(curdir).forEach(function (file) {
		fs.unlinkSync(curdir+file);
	});
}
module.exports = function(params){
	var self = this;
	params = params || {};
	self.rootdir = dir;
	this.refresh_interval = params.refresh_interval || 1000*60*60;
	this.get = function (name){
		return new Promise(function( res ){
			fs.readFile(curdir + self.files[name].current,function(err,data){
				res($c.tryEval(data,JSON.parse));
			});
		});
	};
	this.files = params.files || {};
	this.add = function (name, func, refresh_interval){
		return new Promise(function( res ) {
			refresh_interval = refresh_interval || self.refresh_interval;
			var files = self.files;
			if (!func && /http(s?):\/\/.*/.test(name)) {
				func = name;
			}
			var cb = function (data) {
				if (!files[name]) {
					files[name] = {};
					files[name].cuid0 = files[name].cuid0 || $c.cuid();
					files[name].cuid1 = files[name].cuid1 || $c.cuid();
					files[name].current = files[name].cuid0;
					files[name].refresh_interval = refresh_interval;
					files[name].method = func;
				}
				var filename = files[name].current == files[name].cuid0 ? files[name].cuid1 : files[name].cuid0;
				fs.writeFile(curdir + filename, typeof data == 'object' ? JSON.stringify(data) : data,function( err ) {
					if (err) { res(false); }
					files[name].current = filename;
					res(true);
					setTimeout(function () {
						func(cb);
					}, refresh_interval);
				});
			};
			if ($c.isString(func)) {
				func = function (callback) {
					$c.ajax({url: name, onsuccess: callback});
				}
			}
			$c.mkdirRecursive(self.rootdir,function(){
				if (!$c.isGenerator(func)) {
					return func(cb);
				} else {
					eval("$c.syncroit(function*(){ cb(yield* func());});")
				}

			});
		});
	}
};