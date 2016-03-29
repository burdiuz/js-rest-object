# RESTObject

RESTObject is the library that allows usage of comfortable dot notation instead of strings while accessing remote API. It depends on [Direct Proxies support](http://caniuse.com/proxy) and [fetch()](http://caniuse.com/fetch) optionally.   

## Installation
Use bower or clone from GitHub.
```
bower install rest-object
```

## Usage
To start you need to create RESTObject instance with specifying starting point of your API.  
```javascript
var api = RESTObject.create('/example/api');
```
Path is optional, by default it will be empty string.  
```javascript
var api = RESTObject.create(); // will work too
```
and then you can go to your endpoint just like it is a property on `api` object.  
```javascript
var api = RESTObject.create('/example/api');
api.portal.users.customers.then(function(list) {
	console.log(list);
});
```
each property is an object that represents endpoint, each has CRUD and Promise methods and last one in this call sequence will do GET request to server using `/example/api/portal/users/customers` URL.  
You can store endpoint as object by using `preventDefault()` method that tells that you don't need any requests to server, you just need an object of this endpoint.   
```javascript
var customers = api.portal.users.customers.preventDefault();
```
After receiving endpoint object, you can CRUD it, each of these methods returns Promise.  
```javascript
  customers.read().then(
    function(list) {
    console.log(list);
    }
  );
```
This code does exactly same GET request to `/example/api/portal/users/customers` URL.  
Or you can continue exploring depths of your API architecture madness  
```javascript
var invoices = customers.workshops.invoices.preventDefault();
invoices[123].then(function(data){
  // do something with invoice data
});
```
Will store endpoint for URL `example/api/portal/users/customers/workshops/invoices/123` and then make GET request.  
  
Each endpoint object overrides standard object's property actions, like get or set property value, or call method. Instead of doing something with properties endpoint object translates these actions to remote URL. For example:  
```javascript
customers({data: true});
```
Calling `customers` endpoint object like a function will actually do a PUT request with argument data used as request body.  
GET/SET actions are doing GET/POST requests to server:  
```javascript
customers['111'].then(function(data) {
  console.log(data);
});
```
Will do GET request to `/example/api/portal/users/customers/111` URL.  
```javascript
customers['111'] = {data: true};
```
Will do a POST request to `/example/api/portal/users/customers/111` URL with passed data as request body.  
  
Same can be achieved using CRUD methods explicitly:  
```javascript
customers[111].read().then(function(data) {
  console.log(data);
});
customers[111].update({data: true}).then(function() {

});
```
To send DELETE request to server, just do  
```javascript
delete customers[111];
```
Or use CRUD method  
```javascript
customers[111].delete().then(function() {
  // do something?
});
```

RESTObject contains [jQuery](http://api.jquery.com/jquery.ajax/) and [fetch()](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) handlers to make requests to server. You can specify custom handler as second parameter to RESTObject.create():
```javascript
api = RESTObject.create('/example/api', RESTObject.JQUERY);
// or 
api = RESTObject.create('/example/api', function(method, url, data, params, deferred) {
// make request
});
```
By default, fetch() used.

## Example  

Project contains working example, to make it working, start `node server` and go to [http://localhost:8081/example/index.html](http://localhost:8081/example/index.html).
```
bower install
npm install
node server
```




> Written with [StackEdit](https://stackedit.io/).