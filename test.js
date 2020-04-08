'use strict';

let ClienteMongo = require('mongodb').MongoClient;
const assert = require('assert');

const URL_MONGODB = "mongodb://localhost:27017/jldm";
const OPCIONES_MONGODB = { poolSize: 10 };

const BD_PRODUCTOS = 'jldm'; // nombre de la bd
const COLECCION_PRODUCTOS = 'productos'; // nombre de la colección de productos

ClienteMongo.connect(URL_MONGODB, OPCIONES_MONGODB, function(err, cliente) {
  const bd_prod = cliente.db( BD_PRODUCTOS );
  const col_productos = bd_prod.collection( COLECCION_PRODUCTOS );

  col_productos.distinct('additives', function (err, facets) {
    assert.equal(null, err);
    
    console.log(facets);
  });
});
