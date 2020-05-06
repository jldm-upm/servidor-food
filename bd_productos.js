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

async function get_valores_facets(facet) {
  console.log('get_valores_facets');

  const c = await MONGO.connect(URL_MONGODB);
  const db = await c.db(BD_PRODUCTOS);

  const col_productos = await db.collection(COLECCION_PRODUCTOS);

  const field = facet + "_tags";
  const field_count = field + "_n";
  const result = await col_productos.distinct(field);

  return result;
}; // get_valores_facets

exports.buscar_regexp_barcode = buscar_regexp_barcode;
exports.get_valores_facets = get_valores_facets;
