'use strict';

//const assert = require('assert');
const assert = require('chai').assert;

const http = require('http');
const url = require('url');
const bl = require('bl');

const SERVIDOR = 'localhost';
const PUERTO = 8080;
const URL_BASE = `http://${SERVIDOR}:${PUERTO}`;

const TIEMPO_RAZONABLE_DE_RESPUESTA_MS = 15000;

function httpGet(url) {
    return new Promise(function(resolve, reject) {
        http.get(url, function(response) {
            response.pipe(bl(function(err, data) {
                const res = {
                    status: response.statusCode,
                    status_msg: response.statusMessage,
                    data: JSON.parse(data.toString())
                };
                //	console.log(res);
                resolve(res);
            }));
        });
    });
};

describe('Acceso al servidor', function() {
    describe('"/api/v0/product/:barcode.json", api_get_food_barcode_json', function() {
        it('/api/v0/product/737628064502.json: debe encontrar el producto con código de barras 737628064502', async function() {
            this.timeout(TIEMPO_RAZONABLE_DE_RESPUESTA_MS);
            const res = await httpGet(`${URL_BASE}/api/v0/product/737628064502.json`);
            assert.match(res.data.code, /737628064502/, `El código del producto devuelto ${res.data.code} debería coincidir con /737628064502/`);
        });
    });
    describe('"/data/taxonomies/:taxonomia.json", api_get_taxonomia_json', function() {
        it('/data/taxonomies/additives.json: debe devolver un objeto con alguna taxonomia (aditivos)', async function() {
            this.timeout(TIEMPO_RAZONABLE_DE_RESPUESTA_MS);
            const res = await httpGet(`${URL_BASE}/data/taxonomies/additives.json`);

            assert(Object.keys(res.data).length > 0, `Se debe devolver un array con contenido y se devolvió ${Object.keys(res.data).length}`);
        });
    });
    describe('"/:facet.json", api_get_facet_json', function() {
        it('/ingredients.json: debe devolver los facets (valores que contiene una propiedad introducidos por el usuario) que contiene la propiedad indicada', async function() {
            this.timeout(TIEMPO_RAZONABLE_DE_RESPUESTA_MS);
            const res = await httpGet(`${URL_BASE}/ingredients.json`);

            assert(res.data.count > 0, `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
        });
        it('/categories.json: debe devolver una lista de categorias', async function() {
            this.timeout(TIEMPO_RAZONABLE_DE_RESPUESTA_MS);
            const res = await httpGet(`${URL_BASE}/categories.json`);

            assert(res.data.count > 0, `Se debe devolcer un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
        });
    });
    describe('"/:facet/:category.json", api_get_category_products_json', function() {
        it('/categories/en:rice.json debe devolver los productos que corresponden a una categoria', async function() {
            this.timeout(TIEMPO_RAZONABLE_DE_RESPUESTA_MS);
            const res = await httpGet(`${URL_BASE}/categories/en:rice.json`);

            assert(res.data.count > 0, `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
        });
    });
});
