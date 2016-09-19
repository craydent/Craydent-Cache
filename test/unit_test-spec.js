var CraydentCache = require("../craydent-cache");
var $c = require('craydent/noConflict');
$c.DEBUG_MODE = true;
$c.DEBUG_MODE = true;
var userTestObject = { users: [
	{ username: 'mtglass', name: 'Mark Glass', age: 10 },
	{ username: 'urdum', name: 'Ursula Dumfry', age: 10 },
	{ username: 'hydere', name: 'Henry Dere', age: 10 },
	{ username: 'cumhere', name: 'Cass Umhere', age: 10 },
	{ username: 'bstill', name: 'Bob Stillman', age: 10 },
	{ username: 'cirfuksalot', name: 'Camron', age: 10 },
	{ username: 'chadden', name: 'Corey Hadden', age: 30 },
	{ username: 'squeeb', name: 'Joseph Esquibel', age: 32 },
	{ username: 'cinada', name: 'Clark Inada', age: 31 },
	{ username: 'shurliezalot', name: 'Josh N', age: 10 },
	{ username: 'noze_nutin', name: 'Mai Boss', age: 10 },
	{ username: 'czass', name: 'Cater Zass', age: 10 },
	{ username: 'awesome_game', name: 'clash of clans', age: 21 }
]};

describe ('Cache methods', function () {

	var results = [], shouldbe = [], operation = [];
	var cache = new CraydentCache({refresh_interval:450});

	beforeEach(function (done) {
		$c.syncroit(function*(){
			shouldbe.push(false);
			results.push(yield cache.get('http://craydent.com/test/users.js'));
			operation.push("toBe");

			shouldbe.push(true);
			results.push(yield cache.add('http://craydent.com/test/users.js'));
			operation.push("toBe");


			shouldbe.push(userTestObject);
			results.push(yield cache.get('http://craydent.com/test/users.js'));
			operation.push("toEqual");

			shouldbe.push(cache.files['http://craydent.com/test/users.js{}'].last_updated);
			var ndt = yield new Promise(function(res){
				setTimeout(function(){
					res(cache.files['http://craydent.com/test/users.js{}'].last_updated);
				},700);
			});
			results.push(ndt);
			operation.push("not.toBe");

			yield cache.refresh('http://craydent.com/test/users.js');

			shouldbe.push(userTestObject);
			results.push(yield cache.get('http://craydent.com/test/users.js'));
			operation.push('toEqual');

			var nndt = yield new Promise(function(res){
				setTimeout(function(){
					res(cache.files['http://craydent.com/test/users.js{}'].last_updated);
				},900);
			});
			results.push(nndt);
			shouldbe.push(ndt);
			operation.push("not.toBe");


			shouldbe.push(true);
			results.push(yield cache.refresh('http://craydent.com/test/users.js'));
			operation.push('toBe');

			var str = "hello";

			yield cache.add("somestring",function*(cb){
				return yield cb(str);
			});

			shouldbe.push("hello");
			results.push(yield cache.get('somestring'));
			operation.push('toBe');

			yield cache.add("somestring2",function*(cb){
				return yield cb(str+'2');
			});

			shouldbe.push("hello2");
			results.push(yield cache.get('somestring2'));
			operation.push('toBe');

			str += "world";

			yield new Promise(function(res){
				setTimeout(function(){
					$c.syncroit(function*(){
						shouldbe.push("helloworld");
						results.push(yield (cache.get('somestring')));
						operation.push('toBe');
						res(true);
					})
				},500);
			});

			done();
		});
	});
	it('test add, get, and refresh',function(){
		for (var i = 0, len = results.length; i < len; i++) {
			if (operation[i].indexOf('.') == -1) {
				expect(results[i])[operation[i]](shouldbe[i]);
			} else {
				var parts = operation[i].split('.');
				var jas = expect(results[i]);
				for (var j = 0, jlen = parts.length - 1; j < jlen; j++) {
					jas = $c.isFunction() ? jas[parts[j]]() : jas[parts[j]];
				}
				jas[parts[parts.length - 1]](shouldbe[i]);

			}
		}

	});
});

describe ('ReadMe examples', function () {
	var result1, result2, result3;
	beforeEach(function (done) {
		$c.syncroit(function* () {
			var cache = new CraydentCache({refresh_interval: 60000}); // 60 seconds
			var success = yield cache.add('http://craydent.com/test/users.js');
			if (success) {
				result1 = yield cache.get('http://craydent.com/test/users.js');
			}
			yield cache.refresh('http://craydent.com/test/users.js');

			var cache1 = new CraydentCache({refresh_interval: 60000}); // 60 seconds
			var success1 = yield cache1.add('http://craydent.com/test/users.js', 30000, 'example_alias'); // this will refresh every 30 seconds
			var success2 = yield cache1.add('http://craydent.com/test/users.js', 'example_alias2'); // this will still refresh every 60 seconds

			if (success1) {
				result2 = yield cache1.get('example_alias');
			}
			if (success2) {
				result3 = yield cache1.get('example_alias2');
			}
			yield cache1.refresh('example_alias');
			yield cache1.delete('example_alias2');
			done();
		});
	});
	it('test read me no alias', function () {
		expect(result1).toEqual(userTestObject);
	});
	it('test read me alias', function () {
		expect(result2).toEqual(userTestObject);
	});
	it('test read me alias 2', function () {
		expect(result3).toEqual(userTestObject);
	});
});
