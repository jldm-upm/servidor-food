// *******************************************************************
// Fichero:     servidor_async.js
// -------------------------------------------------------------------
// Proyecto:     
// Autor:       José L. Domenech
// Descripción:
//              Script de servidor web de acceso a la base da datos
//              MongoDB de OpenFoodFacts
//
// -------------------------------------------------------------------
//   Historia: + 12 Dic 2019 - Primera Versión
//             + 05 Mar 2020 - Añadir log estilo Apache mediante middleware 'morgan'
//             + 03 May 2020 - Modularizar configuración del servidor
//             + 05 May 2020 - Modularizar acceso a base de datos
//             + 21 May 2020 - Peticiones al Servicio OFF
//             + 23 May 2020 - sesiones: login/new usuarios
//             + 28 May 2020 - sesiones: /user/save
// *******************************************************************
'use strict';

const wlog = require('./configuracion.logger.js');

/* -------------------------------------------------------------------
   -------                   IMPORTACIONES                     ------- 
   ------------------------------------------------------------------- */
// librería de aserciones
const assert = require('assert');
// librería cliente mongodb
const ClienteMongo = require('mongodb').MongoClient;
// librería framework web
const express = require("express");
// librerías para obtener parámetros de la querystring
const url = require("url");
const querystring = require("querystring");
// librería 'middleware' para express soporte de CORS
const cors = require('cors');
// librería 'middleware' para express de logging
const morgan = require("morgan");
// librería 'middleware' para parsear parámetros 'POST'
const bodyParser = require('body-parser');
// librería de utilidades criptográficas
const bcrypt = require('bcryptjs');
// librería para la generación de UUIDS
const uuid = require('uuid');
// librería sistema de ficheros local
const fs = require('fs');

const parse_qs = require('./search_querystring.js');

const {
    // parámetros de escuchador del servicio web
    PUERTO_SERVIDOR,
    INTERFAZ_SERVIDOR,

    //
    TAMANO_PAGINA,
    
    //
    ACCESO_SERVICIO_EXTERNO,
    URL_BASE_SERVICIO_EXTERNO,
    AXIOS_CONF,
} = require('./configuracion.servidor.js');

// instacia del objeto que importa la libería http
const axios = require('axios').create(AXIOS_CONF);

// importación de funciones de BD
const {
    bd_buscar_regexp_barcode_product,
    bd_get_valores_facets,
    bd_buscar_category_products,
    bd_buscar_codes,

    bd_usuario_buscar,
    bd_usuario_nuevo,
    bd_usuario_salvar,
    bd_usuario_votar
} = require('./bd_productos.js');

/* -------------------------------------------------------------------
   -------           CONSTANTES DE CONFIGURACIÓN               ------- 
   ------------------------------------------------------------------- */
// Definiciones de algunos valores estáticos para el servico:
const DIR_STATIC = 'static';
const PATH_STATIC = `${__dirname}/${DIR_STATIC}`; // path de almacenamiento de ficheros estáticos
const PATH_TAXONOMIES = `${PATH_STATIC}/tax`;

const JSON_NOT_FOUND = { status: 0, status_verbose: "object not found" }; // JSON objeto no encontrado

const JSON_PRODUCT_TEMPLATE = JSON.parse(fs.readFileSync(`${PATH_STATIC}/json_templates/product.json`, 'utf8')); // JSON plantilla producto

const OPCIONES_DEFECTO = {
    lang: 'en',
    skip: 0,
    page_size: TAMANO_PAGINA,
    sort_by: {}
};
/* -------------------------------------------------------------------
   -------               FUNCIONES AUXILIARES                  ------- 
   ------------------------------------------------------------------- */
// -------------------------------------------------------------------
// Función que devuelve una respuesta de servidor JSON que contiene el
// producto_json devuelto por la base de datos
//
// Parámetros:
//  - producto_json: un objeto json tal y como se devuelve por la BD
// Devuelve:
//  - objeto JSON con la respuesta del servidor.
function componer_producto_json(producto_json, sostenibilidad_usuario) {
    wlog.silly('componer_producto_json');
    // let json_res = {};

    //return Object.assign(json_res, JSON_PRODUCT_TEMPLATE, producto_json);
    let json_res = { ...JSON_PRODUCT_TEMPLATE, ...producto_json };
    return json_res;
}; // componer_producto_json

// -------------------------------------------------------------------
// Función que devuelve un objeto JSON que corresponde un objeto no encontrado:
//
// Parámetros:
//  - codigo: string que se refiere al identificador objeto a buscar
//  - objeto: string que se refiere al tipo del objeto a buscar
// Devuelve:
//  json_not_found + {'objeto': codigo}
function object_not_found_json(codigo, objeto) {
    wlog.silly(`object_not_found_json(${codigo},${objeto})`);
    //let res = {};
    //Object.assign(res, JSON_NOT_FOUND);
    let res = { ...JSON_NOT_FOUND };

    res[objeto] = codigo;
    res['status_verbose'] = `${objeto} not found`;

    return res;
}; // object_not_found_json

// -------------------------------------------------------------------
// Función que devuelve un objeto JSON que corresponde un error.
//
// Parámetros:
//  - error: objeto 'error' recogido como excepción
// Devuelve:
//  { status: 0, status_verbose: error}
function error_json(error) {
    wlog.error(`error_json(${error})`);
    const error_msj = `Error.\n${JSON.stringify(error)}`;
    wlog.error(error_msj);
    return {
        'status': 0,
        'status_verbose': error_msj,
    };
}; // error_json

// -------------------------------------------------------------------
// Función auxiliar para determinar si un objeto tiene una propiedad
function has(object, key) {
    wlog.silly(`has(${object},${key})`);

    return object ? hasOwnProperty.call(object, key) : false;
}; // has

// Función que con los parámetros pasados en la URL (como Query String),
// devuelve un objeto con opciones de búsqueda que se utilizarán para llamar
// a métodos adicionales o como filtros en la BD
//
// - page_size -> .limit(...)
// - skip      -> .skip(...)
// - lang      -> (concat lang ":" término)
// - sort_by   -> .sort(...)
function componer_opciones_url_query(query) {
    wlog.silly(`componer_opciones_url_query(${query})`);

    let result = {};

    // try {
    if (has(query, 'page_size')) {
        result['page_size'] = Number(query['page_size']);
    }
    if (has(query, 'skip')) {
        result['skip'] = Number(query['skip']);
    }
    if (has(query, 'lang')) {
        result['lang'] = query['lang'];
    }
    if (has(query, 'sort_by')) {
        let sort_by = {};
        sort_by[query['sort_by']] = 1;
        result['sort_by'] = sort_by;
    }
    // } catch (error) {
    //     wlog.error(`Error al acceder a los datos de la query: ${error}`);
    // }
    result = { ...OPCIONES_DEFECTO, ...result };

    return result;
} // componer_opciones_url_query

// Función auxiliar que devuelve el timestamp en formato unix:
function getUnixTime() {
    wlog.silly('getUnixTime');
    
    const timestamp = Math.round((new Date()).getTime() / 1000);
    return timestamp;
}; // getUnixTime

/* -------------------------------------------------------------------
   -------                    FUNCIONES API                    ------- 
   ------------------------------------------------------------------- */

// -------------------------------------------------------------------
// Función del API del servidor:
//
// /api/v0/product/:barcode.json
//
// PRODUCTO: Buscar producto por codigo de barras.
//
// Al servidor se le pasa en la URL el barcode que se quiere consultar.
//
// Devuelve JSON con la información conetenida en la BD o un JSON que indica que no se encontró.
//
// Parámetros:
//  - req: petición del cliente
//  - res: respuesta del servidor
//  - next: callback después de tratar esta petición
async function api_get_food_barcode_json(req, res, next) {
    wlog.silly('api_get_food_barcode_json');

    let json_res = {};
    
    try {
        const barcode = req.params.barcode; // en OpenFoodFacts los códigos (en 'code') son strings
        json_res['code'] = barcode;
        const regexp_barcode = "^0*" + barcode.trim().replace(/^0+/, '') + "$";

        const res_busqueda = await bd_buscar_regexp_barcode_product(regexp_barcode);

        // comprobar si se encontró un producto con ese código de barras:
        if (res_busqueda &&
            res_busqueda.hasOwnProperty('code') &&
            res_busqueda['code'].match(regexp_barcode)) {
            json_res = {
                'code': res_busqueda.code,
                'product': componer_producto_json(res_busqueda),
                'status': 1
            };
        } else {
            wlog.info(`product ${barcode} not found`);
            // no se encontró el producto
            if (ACCESO_SERVICIO_EXTERNO) {
                wlog.info('Acceso a servicio externo');
                // este servidor mapea lo suficientemente bien:
                const url_busqueda = req.originalUrl;
                const url_peticion = URL_BASE_SERVICIO_EXTERNO + url_busqueda;
                wlog.info(`Accediendo a servicio externo: ${url_peticion}`);

                const respuesta = await axios.get(url_peticion);
                wlog.info('RESPUESTA EXTERNA:');
                if (respuesta &&
                    respuesta.hasOwnProperty('code') &&
                    respuesta['code'].match(regexp_barcode)) {
                    json_res = respuesta.data;
                    // TODO: ¿insert o upsert el dato en la bd si json_res.status=1?
                } else {
                    wlog.info('Devolviendo objeto no encontrado en servicio externo');
                    json_res = object_not_found_json(barcode, 'product');
                }                
            } else {
                wlog.info('Devolviendo objeto no encontrado');
                json_res = object_not_found_json(barcode, 'product');
            }
        }
    } catch (error) {
        json_res = error_json(error);
    }
    res.send(json_res);
}; // async api_get_food_barcode_json

// -------------------------------------------------------------------
// Función del API del servidor.
//
// /data/taxonomies/:taxonomia.json
//
// TAXONOMIA: Valores predefinidos para una propiedad.
//
// Al servidor se le pasa en la URL el nombre de la taxonomía que se quiere consultar.
//
// Devuelve JSON con la información estática sobre la taxonomía en formato JSON
// o un documento JSON indicando el error.
//
// Parámetros:
//  - req: petición del cliente
//  - res: respuesta del servidor
//  - next: callback después de tratar esta petición
async function api_get_taxonomia_json(req, res, next) {
    wlog.silly('api_get_taxonomia_json');

    const arr_taxonomias = [
        'additives',
        'additives_classes',
        'allergens',
        'brands',
        'categories',
        'countries',
        'ingredients',
        'ingredients_analysis',
        'languages',
        'nova_groups',
        'nutrient_levels',
        'states',
        'sustainability'];

    let json_path = '';

    let taxonomia = req.params.taxonomia;
    let exp_taxonomia = taxonomia.trim();

    // - tipo de respuesta MIME: application/json
    //    res.append('Content-Type', 'application/json');
    // - contenido de la respuesta:
    if (arr_taxonomias.includes(exp_taxonomia)) { // seguridad: sólo acceder a datos predefinidos
        json_path = `${exp_taxonomia}.json`;
        res.sendFile(json_path, { 'root': PATH_TAXONOMIES });
    } else {
        wlog.error(object_not_found_json(exp_taxonomia, 'taxonomy'));
        res.send(object_not_found_json(exp_taxonomia, 'taxonomy'));
    }
}; // async api_get_taxonomia_json

// -------------------------------------------------------------------
// Función del API del servidor.
//
// /:facet.json
//
// FACET: Todos los valores introducidos por los usuarios para una propiedad.
//
// Al servidor se le pasa en la URL el nombre del facet que se quiere consultar.
//
// Devuelve JSON con la información sobre el facet en formato JSON
// o un documento JSON indicando el error.
//
// Parámetros:
//  - req: petición del cliente
//  - res: respuesta del servidor
//  - next: callback después de tratar esta petición
async function api_get_facet_json(req, res, next) {
    wlog.silly('api_get_facet_json');

    let json_res = {};
    let result = {};

    let facet = req.params.facet;
    let exp_category = facet.trim();
    try {
        const opciones = componer_opciones_url_query(req.query);

        result = await bd_get_valores_facets(facet, opciones);

        if (result && (result.length > 0)) {
            json_res = { 'count': result.length, 'tags': result, 'status': 1 };
        } else {
            json_res = { 'count': 0, 'tags': null, 'status': 0 };
            wlog.error(JSON.stringify(json_res));
        }
    } catch (error) {
        json_res = error_json(error);
    };

    res.send(json_res);
}; // async api_get_facet_json


// -------------------------------------------------------------------
// Función del API del servidor.
//
// /:category/:facet/:num.json
//
// :CATEGORY: Nombre de una propiedad, p.e. 'category' que usará la propiedad 'categories_tags'
// :FACET: Valor que puede toma la propiedad :CATEGORY 
// :NUM: Número de página (el tamaño de las páginas se indica en el valor de conf. TAMANO_PAGINA)
//
// Al servidor se le pasa en la URL el el nombre de la categoria
// que se quiere consultar, el valor que deben tener los productos
// para esa categoría y el número de página de datos requeridos (con TAMANO_PAGINA elementos)
//
// Devuelve JSON con los productos que pertenecen a esa categoría
// o un documento JSON indicando el error.
//
// Parámetros:
//  - req: petición del cliente
//  - res: respuesta del servidor
//  - next: callback después de tratar esta petición
async function api_get_category_n_products_json(req, res, next) {
    wlog.silly('api_get_category_products_json');

    let json_res = {};

    let facet = req.params.facet;
    let exp_facet = facet.trim();

    let category = req.params.category;
    let exp_category = category.trim();

    let num_pag = req.params.num;
    try {
        let n_num_pag = parseInt(num_pag);
        
        const opciones = componer_opciones_url_query(req.query);
        opciones.page_size = TAMANO_PAGINA;
        opciones.skip = TAMANO_PAGINA * (n_num_pag-1); // pág=1 inicial
        
        let result = await bd_buscar_category_products(exp_category, exp_facet, opciones);

        if (result && (result.length > 0)) {
            json_res['count'] = result.length;
            json_res['products'] = result;
            json_res['status'] = 1;
            json_res['opciones'] = opciones;
        } else {
            json_res = { 'count': 0, 'tags': null, 'status': 0, 'opciones': opciones };
            wlog.error(JSON.stringify(json_res));
        }
    } catch (err) {
        json_res = error_json(err);
    };
    res.send(json_res);
}; // async api_get_category_n_products_json

// -------------------------------------------------------------------
// Función del API del servidor.
//
// /:category/:facet.json
//
// :CATEGORY: Nombre de una propiedad, p.e. 'category' que usará la propiedad 'categories_tags'
// :FACET: Valor que puede toma la propiedad :CATEGORY 
//
// Al servidor se le pasa en la URL el el nombre de la categoria
// que se quiere consultar y el valor que deben tener los productos para esa categoría.
//
// Devuelve JSON con los productos que pertenecen a esa categoría
// o un documento JSON indicando el error.
//
// Parámetros:
//  - req: petición del cliente
//  - res: respuesta del servidor
//  - next: callback después de tratar esta petición
async function api_get_category_products_json(req, res, next) {
    wlog.silly('api_get_category_products_json');

    let json_res = {};

    let facet = req.params.facet;
    let exp_facet = facet.trim();

    let category = req.params.category;
    let exp_category = category.trim();

    try {
        const opciones = componer_opciones_url_query(req.query);

        let result = await bd_buscar_category_products(exp_category, exp_facet, opciones);

        if (result && (result.length > 0)) {
            json_res['count'] = result.length;
            json_res['products'] = result;
            json_res['status'] = 1;
            json_res['opciones'] = opciones;
        } else {
            json_res = { 'count': 0, 'tags': null, 'status': 0, 'opciones': opciones };
            wlog.error(JSON.stringify(json_res));
        }
    } catch (err) {
        json_res = error_json(err);
    };
    res.send(json_res);
}; // async api_get_category_products_json

// -------------------------------------------------------------------
// Función del API del servidor.
//
// /cgi/search.pl
//
// Al servidor se le pasa en la URL como parámetros las opciones de filtro de búsqueda
// de productos que se le quieren pasar.
//
// Devuelve JSON con los productos filtrados
// o un documento JSON indicando el error.
//
// Parámetros:
//  - req: petición del cliente
//  - res: respuesta del servidor
//  - next: callback después de tratar esta petición
async function api_search_products_json(req, res, next) {
    wlog.silly('api_search_products_json');

    let json_res = {};

    try {
        const opciones = componer_opciones_url_query(req.query);

        const query_parser = parse_qs(req.query);
        const mongoDB_query = query_parser.length > 0 ? { $and: query_parser } : {};

        const result = await bd_buscar_codes(mongoDB_query, opciones);

        //     res_cursor.forEach(val => {
        // //      wlog.silly('        ' + JSON.stringify(val));
        //       result.push[result.length] = val;
        //     });
        if (result && (result.length > 0)) {
            json_res = { status: 1, status_verbose: 'search found' };
            json_res['count'] = result.length;
            json_res['products'] = result;
            json_res['status'] = 1;
            json_res['opciones'] = opciones;
        } else {
            json_res = object_not_found_json(mongoDB_query, 'products');
            wlog.error(JSON.stringify(json_res));
        }
    } catch (error) {
        json_res = error_json(error);
    };

    res.send(json_res);
}; // async api_search_products_json

/* -------------------------------------------------------------------
   -------                   API SESIONES                      ------- 
   ------------------------------------------------------------------- */
// -------------------------------------------------------------------
// Objeto que mantendrá las sesiones,
// Contendrá objetos cuya clave es un uuid y contendrán { un: username, ts: timestamp }
let sesiones = {};

/*       FUNCIONES AUXILIARES USUARIOS      */

/* Función que devuelve el resultado de añadir una nueva sesion

   Modifica la variable sesiones.

   Parámetros:
   json_res: el objeto de respuesta que se modificará con los datos de sesión a devolver

   usuario: datos del usuario que están en la bd

   Devuelve:
   un objeto con la información que se almacena de la sesión
*/
function respuestaResultadoSesion(json_res, usuario) {
    wlog.silly(`respuestaResultadoSesion(${JSON.stringify(json_res)}, ${JSON.stringify(usuario)})`);
    const res = { ...json_res };
    // Añadir la sesion
    const new_sesion = ponerSesion(usuario.username);
    
    res['session'] = new_sesion;
    res['username'] = usuario.username;
    res['conf'] = res.conf;
    res['vot'] = res.vot;
    
    return res;
} // respuestaResultadoSesion

/* Función que añade una sesión para el usuario 'username'.

   Modifica la variable sesiones.

   Parámetros:
   username: nombre de usuario para el que se creará la sesión

   Devuelve:
   un objeto con la información que se almacena de la sesión
*/
function ponerSesion(username) {
    wlog.silly(`ponerSesion(${username})`);
    const timestamp = getUnixTime();
    const session_id = uuid.v5(username + timestamp, "36274658-96e5-4b80-8d2d-85d6d8ba50ef");

    // borrar sesiones de este usuario
    for (let ses in sesiones) {
        if (ses.un == username) {
            delete sesiones[ses.id];
        }
    }
    
    let session_obj = {};
    session_obj['id'] = session_id;
    session_obj['un'] = username;
    session_obj['ts'] = timestamp;
    
    sesiones[session_id] = session_obj;

    return session_obj;
}; // ponerSesion

function getSesion(session_id) {
    wlog.silly(`getSesion(${session_id})`);
    return sesiones[session_id];
} // getSesion

function borrarSesion(session_id) {
    wlog.silly(`borrarSesion(${session_id})`);
    const res = getSesion(session_id);
    if (res) {
        delete sesiones[session_id];
    } else {
        wlog.error('Sesión no econtrada');
    }
    
    return res;
} // borrarSesion

// Función del API de usuarios del servidor.
//
// /user/login
//
// Al servidor se le pasa como parámetros post el nombre de usuario
// (username) y la contraseña (password).
//
// Comprueba si existen en la BD y si es así crea un objeto de sesion
// que almacena en la variable sesiones y devuelve este objeto con 'status'=1,
// ('status'=0) si no se encontró el usuario o se pudo crear la sesión
//
// Parámetros:
//  - req: petición del cliente
//  - res: respuesta del servidor
//  - next: callback después de tratar esta petición
async function user_login(req, res, next) {
    wlog.silly('user_login');

    const username = req.body.username,
          password = req.body.password;

    let json_res = { status: 1, status_verbose: 'OK' };
    
    try {
        const result = await bd_usuario_buscar(username);
        if (result) {
            // se ha encontrado el usuario: comprobar que es correcto
            if (bcrypt.compareSync(password, result.hash)) {
                // nueva sesion
                json_res = respuestaResultadoSesion(json_res, result);
                json_res['conf'] = result.conf;
                json_res['vot'] = result.vot;
                wlog.info(`Usuario ${username} ha iniciado una nueva sesion`);
                wlog.info(`LOGIN: ${JSON.stringify(json_res)}`);
            } else {
                wlog.error(`El usuario ${username} no tiene la clave indicada`);
                json_res = object_not_found_json(username,'password');
            }
        } else {
            json_res = object_not_found_json(username, 'usuario');
            wlog.error(JSON.stringify(json_res));
        }
    } catch(error) {
        json_res = error_json(error);
    }

    res.send(json_res);
}; // async user_login

// Función del API de usuarios del servidor.
//
// /user/new
//
// Al servidor se le pasa como parámetros post el nombre de usuario
// (username) y la contraseña (password).
//
// Comprueba si existe un usuario en la BD y si es así o hay algún otro problema
// para crear el usuario devuelve un JSON con 'status=0'.
//
// Si no existe guarda un hash de la contraseña y salt en la BD,
// junto con el nombre de usuario y con los datos de usuario (incluyendo un número de sessión).
//
// Parámetros:
//  - req: petición del cliente
//  - res: respuesta del servidor
//  - next: callback después de tratar esta petición
async function user_newuser(req, res, next) {
    wlog.silly('api_newuser');

    const username = req.body.username,
          password = req.body.password,
          password2 = req.body.password2,
          accepted = req.body.accepted;

    let json_res = { status: 1 };
    let result = null;
    
    try {
        if (!(username && password && accepted &&
              (username.length > 0) &&
              (password.length > 7))) {
            
            json_res['status'] = 0;
            json_res['status_verbose'] = 'Problemas con los datos recibidos';
        } else {
            // comprobar que no existe
            const usu_check = await bd_usuario_buscar(username);

            if (usu_check) {
                wlog.info(`El usuario ${username} ya existe`);
                json_res['status'] = 0;
                json_res['status_verbose'] = 'El usuario ya existe';
            }  else {
                wlog.info("Comprobaciones correctas: Dando de alta");            
                const salt = bcrypt.genSaltSync(16);
                const hash = bcrypt.hashSync(password, salt);
                const res_alta = await bd_usuario_nuevo(username, hash, salt, getUnixTime());
                wlog.info("Resultado del alta:");
                if (res_alta) {
                    wlog.info("Res alta OK");
                    wlog.silly("Creando sesion");

                    json_res = respuestaResultadoSesion(json_res, { username: username });
                    wlog.info(`Usuario ${username} ha iniciado una nueva sesion`);
                } else {
                    wlog.error("Res alta FAILED");
                    json_res['status'] = 0;
                    res['status_verbose'] = `Unspecified problem adding user to the DB: ${res_alta}`;
                }
            }
        }
    } catch(error) {
        json_res = error_json(error);
    }

    res.send(json_res);
}; // async user_newuser

// Función del API de usuarios del servidor.
//
// /user/logout
//
// Al servidor se le pasa como parámetro el nombre de usuario y el identificador de sesion.
//
// Comprueba si existen en el gestor de sesiones BD y si es así lo elimina
//
// Parámetros:
//  - req: petición del cliente
//  - res: respuesta del servidor
//  - next: callback después de tratar esta petición
async function user_logout(req, res, next) {
    wlog.silly(`api_logout(${JSON.stringify(req.body)})`);

    const username = req.body.un,
          session_id = req.body.id,
          timestamp_li = req.body.ts;

    let json_res = { status: 1 };
    
    try {
        if (username && session_id) {
            const session_borrada = borrarSesion(session_id);
            if (!session_borrada) {
                json_res['status'] = 0;
                json_res['status_verbose'] = `Sesión ${session_id} no encontrada`;
            }
        } else {
            json_res['status'] = 0;
            json_res['status_verbose'] = 'Datos de sesión incorrectos';
            wlog.error(JSON.stringify(json_res));
        }
    } catch(error) {
        json_res = error_json(error);
    }

    res.send(json_res);
}; // async user_logout

// Función del API de usuarios del servidor.
//
// /user/save
//
// Al servidor se le pasa como parámetro el nombre de usuario,
// el identificador de sesion y tiempo de creación de sesión.
// También se le pasa la configuración a salvar
//
// Comprueba si existen en el gestor de sesiones BD y si es así guarda
// en la BD la configuración
//
// Parámetros:
//  - req: petición del cliente
//  - res: respuesta del servidor
//  - next: callback después de tratar esta petición
async function user_save(req, res, next) {
    wlog.silly(`api_save(${JSON.stringify(req.body)})`);

    const username = req.body.un,
          session_id = req.body.id,
          timestamp_li = req.body.ts,
          conf = req.body.conf;

    let json_res = { status: 1 };
    
    try {
        if (username && session_id) {
            const session = getSesion(session_id);
            if (!session) {
                json_res['status'] = 0;
                json_res['status_verbose'] = `Sesión ${session_id} no encontrada`;
            } else if ((session.un === username) && (session.ts = timestamp_li)) {
                const res = await bd_usuario_salvar(username, conf);
                if (!(res.result.ok == 1)) {
                    json_res['status'] = 0;
                    json_res['status_verbose'] = `No se pudo salvar`;
                }
            } else {
                json_res['status'] = 0;
                json_res['status_verbose'] = `Sesión ${session_id} no coincidente`;
                wlog.error(JSON.stringify(json_res));
            }
        } else {
            json_res['status'] = 0;
            json_res['status_verbose'] = 'Datos de sesión incorrectos';
            wlog.error(JSON.stringify(json_res));
        }
    } catch(error) {
        json_res = error_json(error);
    }

    res.send(json_res);
}; // async user_logout

// Función del API de usuarios del servidor.
//
// /user/vote/:code/:sustainability/:value
//
// Al servidor se le pasa como parámetros el código del producto,
// el valor de sostenibilidad a votar y el valor que se le asignará.
//
// Como dato POST se le pasa el JSON que identifica la session
//
// Comprueba si existe una sessión como la que se ha pasado.
//
// Actualiza las votaciones del usuario para ese código, valor de sostenibilidad.
//
// Comprueba si existe el producto y actualiza los datos de sostenibilidad
// agregados de producto. Si el usuario ya había votado ese codigo/sostenibilidad
// "desagrega" el valor y lo añade correctamente.
//
// Parámetros:
//  - req: petición del cliente
//  - res: respuesta del servidor
//  - next: callback después de tratar esta petición
async function user_vote(req, res, next) {
    wlog.silly(`api_vote [${JSON.stringify(req.body)}]`);

    const username = req.body.un,
          session_id = req.body.id,
          timestamp_li = req.body.ts;

    const code = req.params.code,
          sustainability = req.params.sustainability,
          value = req.params.value;

    let json_res = { status: 1, status_verbose: 'OK' };
    
    try {
        // comprobar si la sesión es válida:
        if (username && session_id) {
            let session = getSesion(session_id);
            if (session && (session.un === username)) {
                // obtener los datos de este usuario
                const res = await bd_usuario_votar(username, code, sustainability, value);

                if ((res && ((res.usu.result.ok === 1) && (res.prod.result.ok === 1)))) {
                    json_res['username'] = username;
                    json_res['session'] = session;
                    json_res['vot'] = res.usu.doc.vot;
                    json_res['conf'] = res.usu.doc.conf;
                } else {
                    json_res = error_json('Error votando');
                }
            } else {
                json_res = object_not_found_json(session_id, 'sesion');
                wlog.error(JSON.stringify(json_res));
            }
        } else {
            json_res['status'] = 0;
            json_res['status_verbose'] = 'Datos de sesión incorrectos';
            wlog.error(JSON.stringify(json_res));
        }
    } catch (error) {
        json_res = error_json(error);
    }
    
    res.send(json_res);
}; // async user_vote

/* -------------------------------------------------------------------
   -------            CONFIGURACIÓN DEL SERVIDOR               ------- 
   ------------------------------------------------------------------- */

// -------------------------------------------------------------------
// Configura un servidor de aplicación con las rutas apropiadas.
//
// Parámetros:
//  - aplicacion - aplicación `express' a la que se añadirá la configuración de la API
//
// Devuelve: La propia aplicación configurada.
function configurar(aplicacion, clienteMongo) {
    wlog.silly('configurar');
    // -------------------
    // --- MIDDLEWARE: ---
    // -------------------
    // habilitar CORS
    // aplicacion.use(cors);
    
    // middleware para parsear parámetros json
    aplicacion.use( bodyParser.json() );       // to support JSON-encoded bodies
    aplicacion.use( bodyParser.urlencoded({     // to support URL-encoded bodies
        extended: true
    }) );
    
    // middleware de log usando la librería morgan (formato Apache)
    const morgan_fmt = "[:date[iso]] access - HTTP/:http-version :method :url - :remote-addr [:status :response-time ms]";
    aplicacion.use(morgan(morgan_fmt));

    // // Ejemplo para instalar un middleware:
    // aplicacion.use(function (req, res, next) {
    //   wlog.silly('Time:', Date.now());
    //   req.nowTime = Date.now();
    //   next();
    // });

    // todas las respuestas deberían ser documentos JSON
    aplicacion.use((req, res, next) => {
        wlog.silly('poner_json');
        res.set('Content-Type', 'application/json');
        next();
    });
    
    // --------------
    // --- RUTAS: ---
    // --------------

    // URL API de información de producto através de su `barcode'.
    aplicacion.options('/api/v0/product/:barcode.json', cors());
    aplicacion.get('/api/v0/product/:barcode.json', cors(), api_get_food_barcode_json);

    // URL API de valores de "taxonomías".
    aplicacion.options("/data/taxonomies/:taxonomia.json", cors());
    aplicacion.get("/data/taxonomies/:taxonomia.json", cors(), api_get_taxonomia_json);
    // otra forma (creo que peor por que tiene menos comprobaciones) de hacerlo:
    //  aplicacion.use("/data/taxonomies", express.static(`${PATH_ESTATICO}/tax`));

    // URL API de valores de "facets".
    aplicacion.options("/data/taxonomies/:taxonomia.json", cors());
    aplicacion.get("/:facet.json", cors(), api_get_facet_json);

    // URL API para obtener productos que pertenecen a una categoria de un facet
    aplicacion.get("/:category/:facet.json", api_get_category_products_json);
    aplicacion.get("/:category/:facet/:num.json", api_get_category_n_products_json);

    // URL API busqueda de un producto
    aplicacion.get("/cgi/search.pl", api_search_products_json);

    // USUARIOS
    
    // URL API login
    aplicacion.options('/user/login', cors());
    aplicacion.post("/user/login", cors(), user_login);
    aplicacion.options('/user/new', cors());
    aplicacion.post("/user/new", cors(), user_newuser);
    aplicacion.options('/user/logout', cors());
    aplicacion.post("/user/logout", cors(), user_logout);
    aplicacion.options('/user/save', cors());
    aplicacion.post("/user/save", cors(), user_save);

    // URL votación
    aplicacion.options('/user/vote/:code/:sustainability/:value', cors());
    aplicacion.post('/user/vote/:code/:sustainability/:value', cors(), user_vote);
    
    // Se devuelve un documento JSON si no se encuentra una ruta coincidente.
    app.use(function(req, res, next) {
        wlog.warn(`resource_not_found_json (${req.url})`);
        res.set('Content-Type', 'application/json');
        res.status(404).send({ status: 0, url: req.url, status_verbose: `resource not found: ${req.url}` });
    });

    return aplicacion;
}; // configurar

/* -------------------------------------------------------------------
   -------                 VARIABLES GLOBALES                  ------- 
   ------------------------------------------------------------------- */
const app = express();

/* -------------------------------------------------------------------
   -------                        MAIN                         ------- 
   ------------------------------------------------------------------- */
// Iniciar el servidor
function start() {
    app.listen(PUERTO_SERVIDOR, INTERFAZ_SERVIDOR, function() {
        console.log("Configuarando servidor...");

        configurar(app, ClienteMongo);

        // print a message when the server starts listening
        console.log(`Iniciando servidor en ${INTERFAZ_SERVIDOR}:${PUERTO_SERVIDOR}`);
        console.log(`$DIR_STATIC=${PATH_STATIC}`);
        console.log(`\nProbar con:\n
curl -vv http://localhost:${PUERTO_SERVIDOR}/api/v0/product/737628064502.json\n`);
    });
}

module.exports.start = start;
