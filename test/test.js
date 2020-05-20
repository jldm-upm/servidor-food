'use strict';

//const assert = require('assert');
const assert = require('chai').assert;

const http = require('http');
const url = require('url');
const bl = require('bl');

const SERVIDOR = 'localhost';
const PUERTO = 8080;
const URL_BASE = `http://${SERVIDOR}:${PUERTO}`;

const TIEMPO_RAZONABLE_DE_RESPUESTA_MS = 60000;

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
    this.timeout(TIEMPO_RAZONABLE_DE_RESPUESTA_MS);
    describe('"/api/v0/product/:barcode.json", api_get_food_barcode_json', function() {
        it('/api/v0/product/737628064502.json: debe encontrar el producto con código de barras 737628064502', async function() {

            const res = await httpGet(`${URL_BASE}/api/v0/product/737628064502.json`);
            assert.match(res.data.code, /737628064502/, `El código del producto devuelto ${res.data.code} debería coincidir con /737628064502/`);
        });
    });
    describe('"/data/taxonomies/:taxonomia.json", api_get_taxonomia_json', function() {
        it('/data/taxonomies/additives.json: debe devolver un objeto con los valores de la taxonomia (aditivos)', async function() {

            const res = await httpGet(`${URL_BASE}/data/taxonomies/additives.json`);

            assert(Object.keys(res.data).length > 0, `Se debe devolver un array con contenido y se devolvió ${Object.keys(res.data).length}`);
        });
    });
    describe('"/:facet.json", api_get_facet_json', function() {
        it('/ingredients.json: debe devolver los facets (valores que contiene una propiedad introducidos por el usuario) que corresponden a ingredients', async function() {

            const res = await httpGet(`${URL_BASE}/ingredients.json`);

            assert(res.data.count > 0, `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
        });
        it('/categories.json: debe devolver una lista de categorias (facets introducidos por los usuarios)', async function() {

            const res = await httpGet(`${URL_BASE}/categories.json`);

            assert(res.data.count > 0, `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
        });
    });
    describe('"/:category/:facet.json", api_get_category_products_json', function() {
        it('/category/noodles.json debe devolver los productos que corresponden a la categoria (category) noodles (facet)', async function() {

            const res = await httpGet(`${URL_BASE}/category/noodles.json`);

            assert(res.data.count > 0, `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
        });
    });
    describe('"/:category/:facet/:num.json", api_get_category_n_products_json', function() {
        it('/category/pizzas/3.json debe devolver los productos de la tercera página (TAMANO_PAGINA=10) que corresponden a la categoria (category) pizza (facet)', async function() {

            const res = await httpGet(`${URL_BASE}/category/pizzas/3.json`);

            assert(res.data.count > 0, `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
            assert(res.data.count = 10, `Se debe devolver un array de tamaño TAMANO_PAGINA=10 pero se devolvió uno de tamaño ${res.data.count}`);
        });
    });
    describe('"/cgi/search.pl", api_search_products_json', function() {
        it('"/cgi/search.pl?action=display&sort_by=unique_scans_n&page_size=20&action=display" debe devolver los productos filtrados y ordenados según la consulta', async function() {

            const res = await httpGet(`${URL_BASE}/cgi/search.pl?action=display&sort_by=unique_scans_n&page_size=20&action=display`);

            assert(res.data.count > 0, `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
            assert(res.data.count == res.data.products.length, `El tamaño de array de productos debe de coindicidir con el campo count`);
        });
    });
});
