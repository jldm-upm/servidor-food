'use strict';

//const assert = require('assert');
const assert = require('chai').assert;

const http = require('http');
const url = require('url');
const bl = require('bl');
const querystring = require('querystring');

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

function httpPost(host,port,url,data) {
    return new Promise(function(resolve, reject) {
        // Build the post string from an object
        const post_data = querystring.stringify(data);
        // An object of options to indicate where to post to
        const post_options = {
            host: host,
            port: port,
            path: url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(post_data)
            }
        };
        // Set up the request
        let post_req = http.request(post_options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                resolve(JSON.parse(chunk));
            });
        });

        // post the data
        post_req.write(post_data);
        post_req.end();
    });
}

describe('Productos', function() {
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
        const q2 = '/languages.json';
        it(`${q2}: debe devolver los facets (valores que contiene una propiedad introducidos por el usuario) que corresponden a ingredients`, async function() {

            const res = await httpGet(`${URL_BASE}${q2}`);

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

describe('Usuarios', function() {
    this.timeout(TIEMPO_RAZONABLE_DE_RESPUESTA_MS);
    const code = '737628064502';
    describe('/user/new', function () {
        const q = '/user/new';
        const data = {
            username: 'test',
            password: 'testtest',
            password2: 'testtest',
            accepted: true
        };
        it(`${q}[${JSON.stringify(data)}] tiene que devolver una sesión`, async function () {
            const res = await httpPost(SERVIDOR, PUERTO, q, data);
            console.log(`RES: ${JSON.stringify(res)}`);
            assert(res['session']['id'].length > 0, `Se devolvió la sesión ${JSON.stringify(res)}`);
        });
    });
    describe('/user/login', function () {
        const q = '/user/login';
        const data = {
            username: 'test',
            password: 'testtest'
        };
        it(`${q}[${JSON.stringify(data)}] tiene que devolver una sesión`, async function () {
            const res = await httpPost(SERVIDOR, PUERTO, q, data);
            console.log(`RES: ${JSON.stringify(typeof(res))}`);
            assert(res['session']['id'].length > 0, `Se devolvió la sesión ${JSON.stringify(res)}`);
        });
    });
    // describe('/user/save');
    // describe('Votaciones', function () {
    //     describe('/user/vote/:code/:sustainability/:value');
    // });
    // describe('/user/logout');
    // describe('/user/delete');
});
