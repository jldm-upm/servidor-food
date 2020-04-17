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
// *******************************************************************
'use strict';
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
// librería 'middleware' para express de logging
const morgan = require("morgan");
// librería sistema de ficheros local
const fs = require('fs');

const parse_qs = require('./search_querystring.js');
//console.log(parse_qs({}));
/* -------------------------------------------------------------------
   -------           PARÁMETROS DE CONFIGURACIÓN               ------- 
   ------------------------------------------------------------------- */
// parámetros de conexión a la base de datos de productos
const URL_MONGODB = "mongodb://localhost:27017/jldm";
const OPCIONES_MONGODB = { poolSize: 10 };

const BD_PRODUCTOS = 'jldm'; // nombre de la bd
const COLECCION_PRODUCTOS = 'productos'; // nombre de la colección de productos

// parámetros de escuchador del servicio web
const PUERTO_SERVIDOR = 8080;
const INTERFAZ_SERVIDOR = 'localhost';

// Definiciones de algunos valores estáticos para el servico:
const DIR_STATIC = 'static';
const PATH_STATIC = `${__dirname}/${DIR_STATIC}`; // path de almacenamiento de ficheros estáticos
const PATH_TAXONOMIES = `${PATH_STATIC}/tax`;

const JSON_NOT_FOUND = { status:0, status_verbose: "object not found" }; // JSON objeto no encontrado

const JSON_PRODUCT_TEMPLATE = JSON.parse(fs.readFileSync(`${PATH_STATIC}/json_templates/product.json`, 'utf8')); // JSON plantilla producto

const OPCIONES_BUSQUEDA_LIMITE_10 = [{limit: 10}];

const ARR_FILTRO_BUSQUEDA_IS_COMPLETE = [{complete: {$eq: 1}}, { complete: { $exists: true } }];
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
function componer_producto_json(producto_json) {
  console.log('componer_producto_json');
  let json_res = {};

  return Object.assign(json_res, JSON_PRODUCT_TEMPLATE, producto_json);
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
  console.log('object_not_found_json');
  let res = {};
  Object.assign(res, JSON_NOT_FOUND);
  
  res[objeto]=codigo;
  res['status_verbose'] = `${objeto} not found`;
  
  return res;
}; // object_not_found_json


/* -------------------------------------------------------------------
   -------                    FUNCIONES API                    ------- 
   ------------------------------------------------------------------- */

// -------------------------------------------------------------------
// Función del API del servidor:
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
function api_get_food_barcode_json(req, res, next) {
  console.log('api_get_food_barcode_json');
  let json_res = {};

  let barcode = req.params.barcode; // en OpenFoodFacts los códigos (en 'code') son strings
  let regexp_barcode = "^0*" + barcode.trim().replace(/^0+/,'') + "$";

  // buscar el producto con el código correspondiente y devolver el resultado:
  ClienteMongo.connect(URL_MONGODB, OPCIONES_MONGODB, function(err, cliente) {

    if (err) {
      //      next(err);
      console.log('database not found');
      Object.assign(json_res, JSON_NOT_FOUND, { status_verbose: "database not found" });
      res.send(json_res);
    } else {
      
      const bd_prod = cliente.db( BD_PRODUCTOS );
      const col_productos = bd_prod.collection( COLECCION_PRODUCTOS );

      let opciones_busqueda = {};
      Object.assign(opciones_busqueda, OPCIONES_BUSQUEDA_LIMITE_10);

      let query_busqueda = {};
      Object.assign(query_busqueda, FILTRO_BUSQUEDA_IS_COMPLETE, { code: { $regex: regexp_barcode, $options: "$i" } });

      col_productos.findOne(query_busqueda,
			    opciones_busqueda,
			    function (err2, producto) {
			      
			      // (enviar la respuesta como callback de la búsqueda de la BD):
			      // - tipo de respuesta MIME: application/json
			      //res.append('Content-Type', 'application/json');
			      // - contenido de la respuesta:
			      if (err2 || producto == null) {
				console.log('object not found: ' + barcode);
				json_res = object_not_found_json(barcode,'product');
			      }
			      else {
				json_res['code'] = producto.code;
				json_res['product'] = componer_producto_json(producto);
				json_res['status'] = 1;
				json_res['status_verbose'] = "product found";
			      };
			      res.send(json_res);
			      
			      return json_res;
			      
			    }); // find
    } // err else
    return cliente; // debería estar cerrado
  }); // connect
  
}; // api_get_food_barcode_json

// -------------------------------------------------------------------
// Función del API del servidor.
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
function api_get_taxonomia_json(req, res, next) {
  console.log('api_get_taxonomia_json');
  
  const arr_taxonomias = [
    'additives',
    'additives_classes',
    'allergens',
    'brands',
    'countries',
    'ingredients',
    'ingredients_analysis',
    'languages',
    'nova_groups',
    'nutrient_levels',
    'states'];

  let json_path = {};
  

  let taxonomia = req.params.taxonomia;
  let exp_taxonomia = taxonomia.trim();

  // - tipo de respuesta MIME: application/json
  //    res.append('Content-Type', 'application/json');
  // - contenido de la respuesta:
  if (arr_taxonomias.indexOf(exp_taxonomia) >= 0) { // seguridad: sólo acceder a datos predefinidos
    json_path = `${exp_taxonomia}.json`;
    res.sendFile(path, {root: PATH_TAXONOMIES});
  } else {
    res.send(object_not_found_json(exp_taxonomia, 'taxonomy'));
  }
  
}; // api_get_taxonomia_json

// -------------------------------------------------------------------
// Función del API del servidor.
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
function api_get_facet_json(req, res, next) {
  console.log('api_get_facet_json');
  
  const arr_facets = [
    'additives',
    'allergens',
    'brands',
    'categories',
    'countries',
    'contributors',
    'code',
    'entry_dates',
    'ingredients',
    'label',
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

  let json_res = {};
  
  
  let facet = req.params.facet;
  let exp_category = facet.trim();

  // - tipo de respuesta MIME: application/json
  //    res.append('Content-Type', 'application/json');
  // - contenido de la respuesta:
  if (arr_facets.indexOf(exp_category) >= 0) { // seguridad: sólo acceder a datos predefinidos
    ClienteMongo.connect(URL_MONGODB, OPCIONES_MONGODB, function(err, cliente) {

      if (err) {
	console.log('database not found');
	Object.assign(json_res, JSON_NOT_FOUND, { status_verbose: "database not found" });
	res.send(json_res);
      } else {
	
	const bd_prod = cliente.db( BD_PRODUCTOS );
	const col_productos = bd_prod.collection( COLECCION_PRODUCTOS );

	col_productos.distinct(exp_category  + "_tags", function (err2, facets_of) {
	  if (err2) {
	    console.log('facet not found');
	    json.send(object_not_found_json('not found', 'facet'));
	  } else {
	    
	    json_res['count'] = facets_of.length;
	    json_res['tags'] = facets_of;
	  }; // err2 else
	});
      }; // err else
    }); 
  } else {
    res.send(object_not_found_json(exp_category, 'facet'));
  };

}; // api_get_facet_json

// -------------------------------------------------------------------
// Función del API del servidor.
//
// CATEGORY: Todos los valores introducidos por los usuarios en la propiedad 'categories_tags'.
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
function api_get_products_json(req, res, next) {
  console.log('api_get_products_json');
  
  let json_res = {};
  
  
  let valor = req.params.valor;
  let exp_valor = facet.trim();

  let opciones_busqueda = {};
  Object.assign(opciones_busqueda, OPCIONES_BUSQUEDA_LIMITE_10);

  let query_busqueda = {'categories_tags': exp_valor};
  Object.assign(query_busqueda, FILTRO_BUSQUEDA_IS_COMPLETE);
  
  // - tipo de respuesta MIME: application/json
  //    res.append('Content-Type', 'application/json');
  // - contenido de la respuesta:
  if (arr_facets.indexOf(exp_category) >= 0) { // seguridad: sólo acceder a datos predefinidos
    ClienteMongo.connect(URL_MONGODB, OPCIONES_MONGODB, function(err, cliente) {

      if (err) {
	console.log(`exp_category = ${exp_category}`);
	res.send(object_not_found_json(exp_category, 'facet'));

      } else {
	
	const bd_prod = cliente.db( BD_PRODUCTOS );
	const col_productos = bd_prod.collection( COLECCION_PRODUCTOS );

	col_productos.find(query_busqueda,
			   opciones_busqueda,
			   function (err, productos) {
			     if (err2) {
			       console.log('products not found');
			       send.res(object_not_found('products',JSON.stringify(req.query)));
			     } else {			    
			       send.res(productos);
			     } // else err2
			   });
      } 

    }); 
  } else {
    console.log(`exp_category = ${exp_category}`);
    res.send(object_not_found_json(exp_category, 'facet'));
  };

}; // api_get_products_json

function parse_check_search_syntax(query) {
  console.log('parse_check_search_syntax: ' + query);

  
}; // parse_check_search_syntax

// -------------------------------------------------------------------
// Función del API del servidor.
//
// Al servidor se le pasa en la URL como parámetros las opciones de filtro de búsqueda
// de productos que se le quieren pasar.
//
// Devuelve JSON con los productos filtrados
// o un documento JSON indicando el error.
//
// 
//
// Parámetros:
//  - req: petición del cliente
//  - res: respuesta del servidor
//  - next: callback después de tratar esta petición
function api_search_products_json(req, res, next) {
  console.log('api_search_products_json');

  return parse_qs(req.query);
} // api_search_products_json

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
  console.log('configurar');
  // -------------------
  // --- MIDDLEWARE: ---
  // -------------------

  // middleware de log usando la librería morgan (formato Apache)
  aplicacion.use(morgan('combined'));
  
  // // Ejemplo para instalar un middleware:
  // aplicacion.use(function (req, res, next) {
  //   console.log('Time:', Date.now());
  //   req.nowTime = Date.now();
  //   next();
  // });

  // todas las respuestas deberían ser documentos JSON
  aplicacion.use((req,res,next) => {
    console.log('poner_json');
    res.set('Content-Type','application/json');
    next();
  });
  
  // middleware para la 'autentificación'...
  aplicacion.use((req,res,next) => {
    console.log('authentication');
    if (!(req.get('User-Agent') === 'TFG Sostenibilidad v1.0')) {
      //res.status(401).send({status: 401, url: req.url, description: "no authorized"});
      next();
    } else {
      next();
    }
  });

  // --------------
  // --- RUTAS: ---
  // --------------
  
  // URL API de información de producto através de su `barcode'.
  aplicacion.get("/api/v0/product/:barcode.json", api_get_food_barcode_json);

  // URL API de valores de "taxonomías".
  aplicacion.get("/data/taxonomies/:taxonomia.json", api_get_taxonomia_json);
  // otra forma (creo que peor por que tiene menos comprobaciones) de hacerlo:
  //  aplicacion.use("/data/taxonomies", express.static(`${PATH_ESTATICO}/tax`));

  // URL API de valores de "facets".
  aplicacion.get("/:facet.json", api_get_facet_json);

  aplicacion.get("/cgi/search.pl", api_search_products_json);
  
  // Se devuelve un documento JSON si no se encuentra una ruta coincidente.
  app.use(function(req, res, next){
    console.log('resource_not_found_json');
    res.set('Content-Type', 'application/json');  
    res.status(404).send({ status: 404, url: req.url, description: "resource not found" });
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
app.listen(PUERTO_SERVIDOR, INTERFAZ_SERVIDOR, function() {  
  console.log("Configuarando servidor...");

  configurar(app, ClienteMongo);

  // print a message when the server starts listening
  console.log("Iniciando servidor en " + PUERTO_SERVIDOR);
});
