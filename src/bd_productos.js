const {
  URL_MONGODB,
  OPCIONES_MONGODB,

  // nombre de la bd de productos OFF
  BD_PRODUCTOS,
  // nombre de la colección de productos
  COLECCION_PRODUCTOS,

  PAGE_SIZE,

  FILTRO_BUSQUEDA_IS_COMPLETE,
} = require('./configuracion.bd.js');

const MONGO = require('mongodb').MongoClient;

async function bd_buscar_regexp_barcode(regexp_barcode) {
  console.log(`bd_buscar_regexp_barcode(${regexp_barcode})`);
  const c = await MONGO.connect(URL_MONGODB);
  const db = await c.db(BD_PRODUCTOS);

  const col_productos = await db.collection(COLECCION_PRODUCTOS);

  const query_busqueda = { ...FILTRO_BUSQUEDA_IS_COMPLETE, code: { $regex: regexp_barcode, $options: "$i" } };
  const result = await col_productos.findOne(query_busqueda);

  return result;
}; // bd_buscar_regexp_barcode

async function bd_get_valores_facets(facet) {
  console.log('bd_get_valores_facets');

  const c = await MONGO.connect(URL_MONGODB);
  const db = await c.db(BD_PRODUCTOS);

  const col_productos = await db.collection(COLECCION_PRODUCTOS);

  const field = facet + "_tags";
  const field_count = field + "_n";
  let result = await col_productos.distinct(field);
  result = result.filter(val => !!val); // eliminar valores nulos
  
  return result;
}; // bd_get_valores_facets

async function bd_buscar_codes(query,query_page_size=PAGE_SIZE,skip=0) {
  console.log(`bd_buscar(${JSON.stringify(query)})`);
  
  const c = await MONGO.connect(URL_MONGODB);
  const db = await c.db(BD_PRODUCTOS);
  const col_productos = await db.collection(COLECCION_PRODUCTOS);

  let result = await col_productos.find(query).limit(query_page_size).toArray();
  result = result.filter(val => !!val); // eliminar valores nulos
  
  return result;
}; // bd_buscar

exports.bd_buscar_regexp_barcode = bd_buscar_regexp_barcode;
exports.bd_get_valores_facets = bd_get_valores_facets;
exports.bd_buscar_codes = bd_buscar_codes;
