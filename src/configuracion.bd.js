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

  PAGE_SIZE,

  FILTRO_BUSQUEDA_ADICIONAL,

  BD_USUARIOS,
  COLECCION_USUARIOS,

  BD_WRITE_CONCERN,

  CTE_ESCALADO
}
*/
// Indica si al realizar una votación se almacenará el voto en la cuenta de usuario
const ALMACENAR_INFORMACION_INDIVIDUAL_VOTACIONES = false;

const BD_PRODUCTOS = 'jldm'; // nombre de la bd de productos
const COLECCION_PRODUCTOS = 'productos'; // nombre de la colección de productos

// parámetros de conexión a la base de datos 
const URL_MONGODB = 'mongodb://localhost:27017/jldm?retryWrites=true&w=majority&j=true';
const OPCIONES_MONGODB = { poolSize: 10 };

// máximo número de elementos que (por defecto) se devolverán al realizar una búsqueda
const PAGE_SIZE = 10;

// filtros adicionales de búsqueda
const FILTRO_BUSQUEDA_ADICIONAL = { };

const BD_USUARIOS = "jldm"; // nombre de la bd de usuarios
const COLECCION_USUARIOS = "usuarios"; // nombre de la colección de usuarios

const BD_WRITE_CONCERN = { j: true }; // Write Concern

const CTE_ESCALADO = 5; // Constante de escalado del valor de sostenibilidad del producto

exports.BD_PRODUCTOS = BD_PRODUCTOS;
exports.COLECCION_PRODUCTOS = COLECCION_PRODUCTOS;
exports.URL_MONGODB = URL_MONGODB;
exports.OPCIONES_MONGODB = OPCIONES_MONGODB;
exports.PAGE_SIZE = PAGE_SIZE;
exports.FILTRO_BUSQUEDA_ADICIONAL = FILTRO_BUSQUEDA_ADICIONAL;
exports.COLECCION_USUARIOS = COLECCION_USUARIOS;
exports.BD_WRITE_CONCERN = BD_WRITE_CONCERN;
exports.CTE_ESCALADO = CTE_ESCALADO;
