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

  // parámetros de escuchador del servicio web
  PUERTO_SERVIDOR,
  INTERFAZ_SERVIDOR,

  OPCIONES_BUSQUEDA_LIMITE_10,

  FILTRO_BUSQUEDA_IS_COMPLETE,
}
*/

const conf = {
  // parámetros de conexión a la base de datos de productos
  URL_MONGODB: "mongodb://localhost:27017/jldm",
  OPCIONES_MONGODB: { poolSize: 10 },

  BD_PRODUCTOS: 'jldm', // nombre de la bd
  COLECCION_PRODUCTOS: 'productos', // nombre de la colección de productos

// parámetros de escuchador del servicio web
  PUERTO_SERVIDOR: 8080,
  INTERFAZ_SERVIDOR: 'localhost',

  OPCIONES_BUSQUEDA_LIMITE_10: [{limit: 10}],

  FILTRO_BUSQUEDA_IS_COMPLETE: { complete: 1 },

};

module.exports = conf;
