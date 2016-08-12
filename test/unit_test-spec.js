var Cache = require("../craydent-cache");

$c.DEBUG_MODE = true;


describe ('Cache methods', function () {
	var results = [], shouldbe = [], operation = [];
	var cache = new Cache({refresh_interval:450});
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



			cache.refresh('http://craydent.com/test/users.js');

			shouldbe.push(false);
			results.push(yield cache.get('http://craydent.com/test/users.js'));
			operation.push('toBe');

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

			yield cache.add("somestring",function(cb){
				cb(str);
			});

			shouldbe.push("hello");
			results.push(yield cache.get('somestring'));
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
