const {
  URL_MONGODB,
  OPCIONES_MONGODB,

  // nombre de la bd de productos OFF
  BD_PRODUCTOS,
  // nombre de la colección de productos
  COLECCION_PRODUCTOS,

  OPCIONES_BUSQUEDA_LIMITE_10,

  FILTRO_BUSQUEDA_IS_COMPLETE,
} = require('./configuracion.bd.js');

const MONGO = require('mongodb').MongoClient;

async function buscar_regexp_barcode(regexp_barcode) {
  console.log(`buscar_regexp_barcode(${regexp_barcode})`);
  const c = await MONGO.connect(URL_MONGODB);
  const db = await c.db(BD_PRODUCTOS);

  const col_productos = await db.collection(COLECCION_PRODUCTOS);

  const query_busqueda = { ...FILTRO_BUSQUEDA_IS_COMPLETE, code: { $regex: regexp_barcode, $options: "$i" } };
  const result = await col_productos.findOne(query_busqueda);

  return result;
}; // buscar_regexp_barcode

exports.buscar_regexp_barcode = buscar_regexp_barcode;
