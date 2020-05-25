'use strict';

//const assert = require('assert');
const assert = require('chai').assert;

const http = require('http');
const url = require('url');
const bl = require('bl');

const SERVIDOR = '127.0.0.1';
const PUERTO = 8000;
const URL_BASE = `http://${SERVIDOR}:${PUERTO}`;

const TIEMPO_RAZONABLE_DE_RESPUESTA_MS = 120000;

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
    const code = '737628064502';
    describe('"/api/v0/product/:barcode.json", api_get_food_barcode_json', function() {
        const q = `/api/v0/product/${code}.json`;
        it(`${q}: debe encontrar el producto con código de barras ${code}`, async function() {

            const res = await httpGet(`${URL_BASE}${q}`);
            assert.match(res.data.code, new RegExp(code),
                         `El código del producto devuelto ${res.data.code} debería coincidir con /${code}/`);
        });
    });
    describe('"/data/taxonomies/:taxonomia.json", api_get_taxonomia_json', function() {
        const q = '/data/taxonomies/ingredients.json';
        it(`${q}: debe devolver un objeto con los valores de la taxonomia (aditivos)`, async function() {

            const res = await httpGet(`${URL_BASE}${q}`);

            assert(Object.keys(res.data).length > 0,
                   `Se debe devolver un array con contenido y se devolvió ${Object.keys(res.data).length}`);
        });
    });
    describe('"/:facet.json", api_get_facet_json', function() {
        const q2 = '/ingredients.json';
        it(`${q2}: debe devolver los facets (valores que contiene una propiedad introducidos por el usuario) que corresponden a ingredients`, async function() {

            const res = await httpGet(`${URL_BASE}${q2}`);

            assert(res.data.count > 0,
                   `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
        });
        const q = '/categories.json';
        it(`${q}: debe devolver una lista de categorias (facets introducidos por los usuarios)`, async function() {

            const res = await httpGet(`${URL_BASE}${q}`);

            assert(res.data.count > 0,
                   `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
        });
    });
    describe('"/:category/:facet.json", api_get_category_products_json', function() {
        const cat='category';
        const tag = 'categories_tags';
        const fac='noodles';
        const q = `/${cat}/${fac}.json/`;
        it(`${q} debe devolver los productos que corresponden a la ${cat} (category) ${fac} (facet)`, async function() {

            const res = await httpGet(`${URL_BASE}${q}`);
            
            assert(res.data.count > 0,
                   `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
        });
    });
    describe('"/:category/:facet/:num.json", api_get_category_n_products_json', function() {
        const q = '/category/pizzas/3.json';
        it(`${q} debe devolver los productos de la tercera página (TAMANO_PAGINA=10) que corresponden a la categoria (category) pizza (facet)`, async function() {

            const res = await httpGet(`${URL_BASE}${q}`);

            assert(res.data.count > 0,
                   `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
            assert(res.data.count = 10,
                   `Se debe devolver un array de tamaño TAMANO_PAGINA=10 pero se devolvió uno de tamaño ${res.data.count}`);
        });
    });
    describe('"/cgi/search.pl", api_search_products_json', function() {
        const q = "/cgi/search.pl?action=display&sort_by=unique_scans_n&page_size=20&action=display"; 
        it(`${q} debe devolver los productos filtrados y ordenados según la consulta`, async function() {

            const res = await httpGet(`${URL_BASE}${q}`);

            assert(res.data.count > 0,
                   `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
            assert(res.data.count == 20,
                   `Se debe devolver 20 elementos, como los indicados en page_size, pero se devolviero ${res.data.count}`);
            assert(res.data.count == res.data.products.length,
                   `El tamaño de array de productos debe de coindicidir con el campo count`);
        });
        const q2 = "/cgi/search.pl?page_size=20&tagtype_0=categories&tag_contains_0=contains&tag_0=cereals"; 
        it(`${q2} debe devolver los productos filtrados y ordenados según la consulta`, async function() {

            const res = await httpGet(`${URL_BASE}${q2}`);

            assert(res.data.count > 0,
                   `Se debe devolver un array con contenido y se devolvió uno que contiene ${res.data.count} elementos`);
            assert(res.data.count == res.data.products.length,
                   `El tamaño de array de productos debe de coindicidir con el campo count`);
        });
    });
});
