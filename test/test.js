'use strict';

const assert = require('assert');
const http = require('http');
const https = require('https');
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

const SERVIDOR = 'localhost';
const PUERTO = 8080;
const URL_BASE = `http://${SERVIDOR}:${PUERTO}`;

describe('Acceso al servidor', function() {
  describe('"/api/v0/product/:barcode.json", api_get_food_barcode_json', async function() {
    const res = await http.get(URL_BASE + "/api/v0/product/737628064502.json");
    it('debe encontrar el producto con código de barras 737628064502', function () {
      assert(res);
      assert(res.code == '737628064502' && res.status == 1);
    });
  });
  // describe('"/data/taxonomies/:taxonomia.json", api_get_taxonomia_json', async function () {
  //   let { status } = ;
  //   assert(status == 1);
  // });
});
