// *******************************************************************
// Fichero:     bd_productos.js
// -------------------------------------------------------------------
// Proyecto:     
// Autor:       José L. Domenech
// Descripción:
//              Funciones asincronas de acceso a la base de datos.
//
//              Usadas en el mapeo de un función de la API json con
//              una consulta a la base de datos.
//
// -------------------------------------------------------------------
//   Historia: + 05 May 2020 - Primera Versión
//             + 24 May 2020 - Búsqueda de usuarios
//             + 25 May 2020 - Creación de usuarios
//             + 01 Jun 2020 - Datos sostenibilidad
// *******************************************************************
'use strict';

const wlog = require('./configuracion.logger.js');

const {
    URL_MONGODB,
    OPCIONES_MONGODB,

    // nombre de la bd de productos OFF
    BD_PRODUCTOS,
    // nombre de la colección de productos
    COLECCION_PRODUCTOS,

    PAGE_SIZE,

    FILTRO_BUSQUEDA_ADICIONAL,

    BD_USUARIOS,
    COLECCION_USUARIOS,

    BD_WRITE_CONCERN
} = require('./configuracion.bd.js');

const MONGO = require('mongodb').MongoClient;
const MONGO_U = require('mongodb').MongoClient;

const load_tax = require('./taxonomies.js').load_tax;

const OPCIONES_DEFECTO = {
    skip: 0,
    page_size: PAGE_SIZE,
    lang: 'en',
    sort_by: {}
};

const arr_categories_pl = [
    'additives',
    'allergens',
    'brands',
    'categories',
    'countries',
    'contributors',
    'code',
    'entry_dates',
    'ingredients',
    'labels',
    'languages',
    'nutrition_grade',
    'packaging',
    'packaging_codes',
    'purchase_places',
    'photographer',
    'informer',
    'states',
    'stores',
    'traces'];

const arr_categories_sl = [
    'additive',
    'allergen',
    'brand',
    'category',
    'country',
    'contributor',
    'code',
    'entry_date',
    'ingredient',
    'label',
    'language',
    'nutrition_grade',
    'packaging',
    'packaging_code',
    'purchase_place',
    'photographer',
    'informer',
    'state',
    'store',
    'trace'];
/*
  Función para buscar un producto por código de barras

  Parámetros:
  - regexp_barcode: una expresión regular representando el código de barras a buscar
  - [opciones]: opciones de búsqueda
  Devuelve:
  - Un objeto que representa el producto en formato JSON
*/
async function bd_buscar_regexp_barcode_product(regexp_barcode, opciones = OPCIONES_DEFECTO) {
    wlog.silly(`bd_buscar_regexp_barcode_product(${regexp_barcode})`);
    const c = await MONGO.connect(URL_MONGODB);
    const db = await c.db(BD_PRODUCTOS);

    const col_productos = await db.collection(COLECCION_PRODUCTOS);

    const query_busqueda = { ...FILTRO_BUSQUEDA_ADICIONAL, code: { $regex: regexp_barcode, $options: "$i" } };

    wlog.silly(`query: ${JSON.stringify(query_busqueda)}`);
    const result = await col_productos.findOne(query_busqueda); //.sort(opciones.sort_by);

    return sostenibilidad_producto(result);
}; // bd_buscar_regexp_barcode_product

/*
  Función para buscar los valores distintos (facets )que contiene el campo

  Parámetros:
  - campo: una propiedad de los productos
  - [opciones]: opciones de búsqueda
  Devuelve:
  - Todos los valores posibles que puede tomar la propiedad
*/
async function bd_get_valores_facets(campo, opciones = OPCIONES_DEFECTO) {
    wlog.silly(`bd_get_valores_facets(${campo},${JSON.stringify(opciones)})`);

    opciones = { ...OPCIONES_DEFECTO, ...opciones };

    let result = [];

    if (!(arr_categories_pl.includes(campo))) {
        return result;
    };

    const c = await MONGO.connect(URL_MONGODB);
    const db = await c.db(BD_PRODUCTOS);

    const col_productos = await db.collection(COLECCION_PRODUCTOS);

    const field = campo + "_tags";

    // 1 - con distinct:
    result = await col_productos.distinct(field, FILTRO_BUSQUEDA_ADICIONAL);

    // 2 - con agregaciones:
    // let query = [{ $group: {} }];
    // query[0]['$group']['id_'] = field;
    // wlog.silly(query);
    // result = await col_productos.aggregate(query).skip(skip).limit(page_size);
    // result = result.filter(val => !!val); // eliminar valores nulos

    return result;
}; // bd_get_valores_facets

/*
  Función para buscar todos los productos que contengan el valor perteneciente a una propiedad 

  Parámetros:
  - category: la propiedad en la que se buscar los valores
  - facet: el valor de la propiedad a buscar
  - [opciones]: opciones de búsqueda
  Devuelve:
  - Todos los productos en los que el valor este contenido en la propiedad
*/
async function bd_buscar_category_products(category, facet, opciones = OPCIONES_DEFECTO) {
    wlog.silly(`bd_buscar_category_products(${category},${facet},${JSON.stringify(opciones)})`);

    opciones = { ...OPCIONES_DEFECTO, ...opciones };

    let result = null;

    if (arr_categories_sl.includes(category)) { // seguridad: sólo acceder a datos predefinidos
        const c = await MONGO.connect(URL_MONGODB);
        const db = await c.db(BD_PRODUCTOS);
        const col_productos = await db.collection(COLECCION_PRODUCTOS);

        const facet_tags = arr_categories_pl[arr_categories_sl.indexOf(category)] + '_tags';
        // TODO: traducir y generalizar
        const valor = opciones.lang + ":" + facet;

        let query_busqueda = { ...FILTRO_BUSQUEDA_ADICIONAL };
        query_busqueda[facet_tags] = valor;
        wlog.silly(JSON.stringify(query_busqueda));
        wlog.silly(`QUERY: ${JSON.stringify(query_busqueda)}`);
        result = await col_productos.find(query_busqueda).sort(opciones.sort_by).skip(opciones.skip).limit(opciones.page_size).toArray();

        result = result.filter(val => !!val); // eliminar valores nulos
    } else {
        result = null;
    };

    return result;
} // bd_buscar_category_products

/*
  Función para buscar todos los productos que coincidan con la query de búsqueda

  Parámetros:
  - query: objeto que representa una query mongoDB
  - [opciones]: opciones de búsqueda
  Devuelve:
  - Todos los productos que devuelva la consulta
*/
async function bd_buscar_codes(query, opciones = OPCIONES_DEFECTO) {
    wlog.silly(`bd_buscar(${JSON.stringify(query)}, ${JSON.stringify(opciones)}})`);

    opciones = { ...OPCIONES_DEFECTO, ...opciones };

    const c = await MONGO.connect(URL_MONGODB);
    const db = await c.db(BD_PRODUCTOS);
    const col_productos = await db.collection(COLECCION_PRODUCTOS);

    let result = await col_productos.find(query).sort(opciones.sort_by).skip(opciones.skip).limit(opciones.page_size).toArray();
    result = result.filter(val => !!val); // eliminar valores nulos

    return result;
}; // bd_buscar

/*
  Función para buscar un usuario cuyo username sea usuario

  Parámetros:
  - usuario: nombre de usuario a buscar
  Devuelve:
  - El objeto usuario encontrado
*/
async function bd_usuario_buscar(usuario) {
    wlog.silly(`bd_usuario_buscar(${usuario})`);

    wlog.silly(`${JSON.stringify(usuario)}`);
    const c = await MONGO_U.connect(URL_MONGODB);
    const db = await c.db(BD_USUARIOS);

    const col_usuarios = await db.collection(COLECCION_USUARIOS);

    const query = {};
    query['username'] = usuario;
    wlog.silly(JSON.stringify(query));
    let result = await col_usuarios.findOne(query);
    
    return result;
}; // async bd_usuario_buscar

/*
  Función para crear un nuevo usuario cuyo username sea usuario.

  El usuario sólo se creará si no existia antes.

  Si existia devolverá un error.

  Parámetros:
  - usuario: nombre de usuario
  - hash: hash (bcrypt) de la contraseña de usuario
  - salt: salt usada en la creación del hash
  Devuelve:
  - El objeto usuario encontrado
*/
async function bd_usuario_nuevo(usuario, hash, salt, timestamp) {
    wlog.silly(`bd_usuario_nuevo(${usuario},...)`);

    const c = await MONGO_U.connect(URL_MONGODB);
    const db = await c.db(BD_USUARIOS);
    const col_usuarios = await db.collection(COLECCION_USUARIOS);
    
    const nuevo_usuario = {};
    // los username no deberían estar repetidos
    nuevo_usuario['_id'] = usuario;
    nuevo_usuario['username'] = usuario;
    nuevo_usuario['create_t'] = timestamp;
    nuevo_usuario['update_t'] = timestamp;
    nuevo_usuario['conf'] = {};
    nuevo_usuario['vot'] = {};
    nuevo_usuario['hash'] = hash;
    nuevo_usuario['salt'] = salt; // guardamos la sal para cocinar más :p ??
    wlog.silly(JSON.stringify(nuevo_usuario));
    let result = await col_usuarios.insertOne(nuevo_usuario, BD_WRITE_CONCERN);

    if (result) {
        delete result['hash'];
        delete result['salt'];
    }
    return result;
}; // async bd_usuario_nuevo

/*
  Función para salvar los datos del usuario 'username'

  Los datos se actualizarán, manteniendo los que no se cambien

  Parámetros:
  - usuario: nombre de usuario
  - conf: datos a salvar
  Devuelve:
  - El objeto usuario encontrado
*/
async function bd_usuario_salvar(usuario, conf) {
    wlog.silly(`bd_usuario_salvar(${usuario},${JSON.stringify(conf)})`);

    const usuDoc = await bd_usuario_buscar(usuario);

    if (usuDoc) {
        const c = await MONGO_U.connect(URL_MONGODB);
        const db = await c.db(BD_USUARIOS);
        const col_usuarios = await db.collection(COLECCION_USUARIOS);

        const res = await col_usuarios.updateOne({ "_id": usuario}, { $set: { "conf": conf } }, BD_WRITE_CONCERN );
        return res;
    } else {
        return null;
    }
}

const datos_sostenibilidad = {
    'en:sustainability_level': 2.5,  // media de los datos de sostenibilidad de un producto
    'en:suitable-packaging_ok': 0,
    'en:suitable-packaging_ns': 0,
    'en:suitable-packaging_nok': 0,
    'en:suitable-size_ok': 0,
    'en:suitable-size_ns': 0,
    'en:suitable-size_nok': 0,
    'en:palm-oil_ok': 0,
    'en:palm-oil_ns': 0,
    'en:palm-oil_nok': 0,
    'en:manufacturing_ok': 0,
    'en:manufacturing_ns': 0,
    'en:manufacturing_nok': 0,
    'en:transport_ok': 0,
    'en:transport_ns': 0,
    'en:transport_nok': 0,
    'en:storage_ok': 0,
    'en:storage_ns': 0,
    'en:storage_nok': 0 
}

// toma tres valores: false, true, null
const datos_sostenibilidad_usuario_producto = {
    'en:suitable-packaging': null,
    'en:suitable-size': null,
    'en:palm-oil': null,
    'en:manufacturing': null,
    'en:transport': null,
    'en:storage': null
}

/*
  Función para añadir (si no existen) datos sobre la sostenibilidad
  de un producto.

  Parámetros:
  - producto: un objeto (representación JSON) de un producto para el que se incluirán
  los datos
  Devuelve:
  - El mismo objeto si ya contiene datos de sostenibilidad o uno modificado que incluya los
  datos iniciales
*/
async function sostenibilidad_producto(producto) {
    wlog.silly(`sustainability_producto(${producto && producto._id})`);
    let res = {...producto};
    if (producto && producto.code) {
        if (!(producto.sustainability)) {
            res['sustainability'] = datos_sostenibilidad;
        }
    }
    
    return res;
}

exports.bd_buscar_regexp_barcode_product = bd_buscar_regexp_barcode_product;
exports.bd_get_valores_facets = bd_get_valores_facets;
exports.bd_buscar_category_products = bd_buscar_category_products;
exports.bd_buscar_codes = bd_buscar_codes;

exports.bd_usuario_buscar = bd_usuario_buscar;
exports.bd_usuario_nuevo = bd_usuario_nuevo;
exports.bd_usuario_salvar = bd_usuario_salvar;
