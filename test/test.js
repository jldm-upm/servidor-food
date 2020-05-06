'use strict';

const assert = require('assert');

const http = require('http');
const url = require('url');
const bl = require('bl');

const SERVIDOR = 'localhost';
const PUERTO = 8080;
const URL_BASE = `http://${SERVIDOR}:${PUERTO}`;


function httpGet (url) {  
  return new Promise(function(resolve,reject){
    http.get(url, function (response) {
      response.pipe(bl(function (err, data) {  
	const res = { status: response.statusCode,
		      status_msg: response.statusMessage,
	              data: JSON.parse(data.toString())
		    };
//	console.log(res);
	resolve(res);
      }));
    });
  });
};

// describe('Array', function() {
//   describe('#indexOf()', function() {
//     it('should return -1 when the value is not present', function() {
//       assert.equal([1, 2, 3].indexOf(4), -1);
//     });
//   });
// });

// describe('Temperature Conversion', function() {
//   describe('cToF', function() {
//     // tests here
//   });
//   describe('fToC', function() {
//     // tests here
//   });
// });

describe('Acceso al servidor', async function() {
  describe('"/api/v0/product/:barcode.json", api_get_food_barcode_json', async function() {
    const res = await httpGet(`${URL_BASE}/api/v0/product/737628064502.json`);
    console.log(!!res.data.code.match(/0*737628064502/));
    console.log(res.data.status == 1);
    it('debe encontrar el producto con código de barras 737628064502', function () {
      assert(res && (res.data.code.match(/0*737628064502/)) && (res.data.status == 1));
    });
  });
  // describe('"/data/taxonomies/:taxonomia.json", api_get_taxonomia_json', async function () {
  //   let { status } = ;
  //   assert(status == 1);
  // });
});
