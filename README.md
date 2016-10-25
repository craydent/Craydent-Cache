<img src="http://craydent.com/JsonObjectEditor/img/svgs/craydent-logo.svg" width=75 height=75/>

# Craydent Cache 0.4.1
**by Clark Inada**

This module is a caching system so api data can be retrieved quickly with minimum overhead.

## Usages
Craydent-Cache constructor takes up to 1 argument. 

* options - options can have any of the following properties:
    * refresh_interval - Integer interval to refresh the cache in milliseconds (Default 3600000ms).
    * in_memory - Boolean flag to keep data in memory instead of file system (Default false).
    * files - Object providing the details of the files used to populate cache.  This is not typically used and the cache should be rebuilt on restart (Default {}).
    * memory_data - Object providing the data stored in memory for the cache.  This is not typically used and the cache should be rebuilt on restart (Default {}).
    
**Note: by default Craydent-Cache will use the filesystem to cache but when in_memory is set to true, it will keep the cache in memory which will significantly increas performace but will consume much more memory resources.

###Methods
Craydent-Cache has 3 methods

* add - this method allows you to add files or endpoints to cache. Returns a Promise and overloads as follows:
    * add("URL"); // (String) Url to the end point.
    * add("URL", callback); // (Function/Generator) Callback: custom method to retrieve or manipulate the data before saving.  Callback should return a boolean to let Craydent Cache know that the add was successful.  Callback is passed a function as an argument and this function returns a Promise.
    * add("URL",options); // (Object) options for caching.
        * options can have any of the following properties
            * headers - HTTP Headers as an Object of key value pairs.
            * method - HTTP method (GET,POST,PUT,DEL) as a String.
            * callback - Custom method to retrieve and manipulate data before saving.
            * data - HTTP body of the request.
    * add("URL", refresh_interval); // (Integer) Time interval in ms to refresh the data.
    * add("URL", refresh_interval, callback);
    * add("URL", alias); // (String) Alias to use when retrieving the cached data.
    * add("URL", alias, callback);
    * add("URL", options, refresh_interval);
    * add("URL", options, alias);
    * add("URL", options, refresh_interval, alias);
    * add("Mongo URL", mongo_options); // (String) Mongo connection string, (Object) options for the mongo query.
        * mongo_options must have any of the following properties.
            * collection - (String) Name of the collection in the MongoDB.
            * find - (Object) Query object used query MongoDB records.
    * add("Mongo URL", mongo_options, refresh_interval); // (Integer) Time interval in ms to refresh the data.
    * add("Mongo URL", mongo_options, alias); // (String) Alias to use when retrieving the cached data.
    * add("Mongo URL", mongo_options, refresh_interval, alias); 

* get - This method is used to retrieve the cached data. Returns a Promise and overloads as follows:
    * get("URL"); // (String) Url to the end point stored in cache.
    * get("Alias"); // (String) Alias name set when invoking the add method.
    * get("URL", options); // (Object) options used when invoking the add method (see above).
    * get("Mongo URL", options); // (String) Mongo connection string, (Object) options used when invoking the add method (see above).

* refresh - This method is used to manually invoke a refresh on cached data. Returns a Promise and overloads as follows: 
    * same as get method

* delete - This method is used to remove an item in the cache and prevent further updates.  Returns a Promise and overloads as follows:
    * same as get method

###Code Examples
```js
function* () {
	const CraydentCache = require('craydent-cache');
	let cache = new CraydentCache({refresh_interval:60000}); // 60 seconds
	let success = yield cache.add('http://example.com/some/rest/endpoint');
	if (success) {
	    var result = yield cache.get('http://example.com/some/rest/endpoint');
	    // result contains the content as a string or a JSON if parsable
	}
	yield cache.refresh('http://example.com/some/rest/endpoint');
}
```

```js
function* () {
	const CraydentCache = require('craydent-cache');
	let cache = new CraydentCache({refresh_interval:60000}); // 60 seconds
	let success = yield cache.add('http://example.com/some/rest/endpoint',30000,'example_alias'); // this will refresh every 30 seconds
	let success2 = yield cache.add('http://example.com/some/rest/endpoint2','example_alias2'); // this will still refresh every 60 seconds
	
	if (success) {
	    var result = yield cache.get('example_alias');
	    // result contains the content as a string or a JSON if parsable
	}
	if (success2) {
	    var result2 = yield cache.get('example_alias2');
	    // result contains the content as a string or a JSON if parsable
	}
	yield cache.refresh('example_alias');
	yield cache.delete('example_alias2');
}
```




## Installation

```shell
$ npm i --save craydent-cache
```


## Download

 * [GitHub](https://github.com/craydent/Cache/)
 * [BitBucket](https://bitbucket.org/craydent/cache)
 * [GitLab](https://gitlab.com/craydent/cache)

Craydent-Cache is released under the [Dual licensed under the MIT or GPL Version 2 licenses](http://craydent.com/license).<br>
