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

async function bd_buscar_regexp_barcode_product(regexp_barcode) {
    console.log(`bd_buscar_regexp_barcode_product(${regexp_barcode})`);
    const c = await MONGO.connect(URL_MONGODB);
    const db = await c.db(BD_PRODUCTOS);

    const col_productos = await db.collection(COLECCION_PRODUCTOS);

    const query_busqueda = { ...FILTRO_BUSQUEDA_IS_COMPLETE, code: { $regex: regexp_barcode, $options: "$i" } };
    const result = await col_productos.findOne(query_busqueda);

    return result;
}; // bd_buscar_regexp_barcode_product

async function bd_get_valores_facets(facet, skip = 0, page_size = PAGE_SIZE) {
    console.log(`bd_get_valores_facets(${facet},${skip},${page_size})`);

    let result = [];

    if (!arr_facets.includes(facet)) {
        return result;
    };

    const c = await MONGO.connect(URL_MONGODB);
    const db = await c.db(BD_PRODUCTOS);

    const col_productos = await db.collection(COLECCION_PRODUCTOS);

    const field = facet + "_tags";

    // 1 - con disting:
    result = await col_productos.distinct(field, FILTRO_BUSQUEDA_IS_COMPLETE);

    // 2 - con agregaciones:
    // let query = [{ $group: {} }];
    // query[0]['$group']['id_'] = field;
    // console.log(query);
    // result = await col_productos.aggregate(query).skip(skip).limit(page_size);
    // result = result.filter(val => !!val); // eliminar valores nulos

    return result;
}; // bd_get_valores_facets

async function bd_buscar_category_products(facet, category, skip = 0, page_size = PAGE_SIZE) {
    console.log(`bd_buscar_category_products(${facet},${category},${skip},${page_size})`);

    let result = null;

    if (arr_facets.includes(category)) { // seguridad: sólo acceder a datos predefinidos
        const c = await MONGO.connect(URL_MONGODB);
        const db = await c.db(BD_PRODUCTOS);
        const col_productos = await db.collection(COLECCION_PRODUCTOS);

        const facet_tags = facet + '_tags';

        const query_busqueda = { ...FILTRO_BUSQUEDA_IS_COMPLETE, facet_tags: category };
        console.log(`QUERY: ${query_busqueda}`);
        result = await col_productos.find(query_busqueda).skip(skip).limit(page_size);

        result = result.filter(val => !!val); // eliminar valores nulos
    } else {
        result = null;
    };

    return result;
} // bd_buscar_category_products

async function bd_buscar_codes(query, skip = 0, page_size = PAGE_SIZE) {
    console.log(`bd_buscar(${JSON.stringify(query)}, ${skip}, ${page_size}})`);

    const c = await MONGO.connect(URL_MONGODB);
    const db = await c.db(BD_PRODUCTOS);
    const col_productos = await db.collection(COLECCION_PRODUCTOS);

    let result = await col_productos.find(query).skip(skip).limit(page_size).toArray();
    result = result.filter(val => !!val); // eliminar valores nulos

    return result;
}; // bd_buscar

exports.bd_buscar_regexp_barcode_product = bd_buscar_regexp_barcode_product;
exports.bd_get_valores_facets = bd_get_valores_facets;
exports.bd_buscar_category_products = bd_buscar_category_products;
exports.bd_buscar_codes = bd_buscar_codes;
