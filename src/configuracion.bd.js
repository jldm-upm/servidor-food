/* -------------------------------------------------------------------
   -------           PARÁMETROS DE CONFIGURACIÓN               ------- 
   ------------------------------------------------------------------- */
/*
{
  URL_MONGODB,
  OPCIONES_MONGODB,

  // nombre de la bd de productos OFF
  BD_PRODUCTOS,
  // nombre de la colección de productos
  COLECCION_PRODUCTOS,

  OPCIONES_BUSQUEDA_LIMITE_10,

  FILTRO_BUSQUEDA_IS_COMPLETE,
}
*/

const BD_PRODUCTOS = 'jldm'; // nombre de la bd
const COLECCION_PRODUCTOS = 'productos'; // nombre de la colección de productos

  // parámetros de conexión a la base de datos de productos
const URL_MONGODB = 'mongodb://localhost:27017/';
const OPCIONES_MONGODB = { poolSize: 10 };

const OPCIONES_BUSQUEDA_LIMITE_10 = [{ limit: 10 }];

const FILTRO_BUSQUEDA_IS_COMPLETE = { complete: 1 };

exports.BD_PRODUCTOS = BD_PRODUCTOS;
exports.COLECCION_PRODUCTOS = COLECCION_PRODUCTOS;
exports.URL_MONGODB = URL_MONGODB;
exports.OPCIONES_MONGODB = OPCIONES_MONGODB;
exports.OPCIONES_BUSQUEDA_LIMITE_10 = OPCIONES_BUSQUEDA_LIMITE_10;
exports.FILTRO_BUSQUEDA_IS_COMPLETE = FILTRO_BUSQUEDA_IS_COMPLETE;
