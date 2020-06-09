// *******************************************************************
// Fichero:     search_querystring.js
// -------------------------------------------------------------------
// Proyecto:     
// Autor:       José L. Domenech
// Descripción:
//              Script de servidor web de acceso a la base da datos
//              MongoDB de OpenFoodFacts
//
// -------------------------------------------------------------------
//   Historia: + 13 Abr 2020 - Primera Versión
//             + 15 Abr 2020 - Finalizado test+correciones de func_tagtype
//             + 24 Abr 2020 - Corregido func_value
// *******************************************************************
'use strict';

const assert = require('assert');

const wlog = require('./configuracion.logger.js');

/* -------------------------------------------------------------------
   -------           PARÁMETROS DE CONFIGURACIÓN               ------- 
   ------------------------------------------------------------------- */
// los valores nutricionales más comunes
const nutricional_tipos = [
    'alcohol', // % alcohol
    'alpha-linolenic-acid',
    'arachidic-acid',
    'arachidonic-acid',
    'behenic-acid',
    'bicarbonate',
    'biotin',
    'butyric-acid',
    'caffeine',
    'calcium',
    'capric-acid',
    'caproic-acid',
    'caprylic-acid',
    'carbohydrates',
    'casein',
    'cerotic-acid',
    'chloride',
    'cholesterol',
    'chromium',
    'copper',
    'dihomo-gamma-linolenic-acid',
    'docosahexaenoic-acid',
    'eicosapentaenoic-acid',
    'elaidic-acid',
    'energy',
    'erucic-acid',
    'fat',
    'fiber',
    'fluoride',
    'fructose',
    'gamma-linolenic-acid',
    'glucose',
    'gondoic-acid',
    'iodine',
    'iron',
    'lactose',
    'lauric-acid',
    'lignoceric-acid',
    'linoleic-acid',
    'magnesium',
    'maltodextrins',
    'maltose',
    'manganese',
    'mead-acid',
    'melissic-acid',
    'molybdenum',
    'monounsaturated-fat',
    'montanic-acid',
    'myristic-acid',
    'nervonic-acid',
    'nucleotides',
    'oleic-acid',
    'omega-3-fat',
    'omega-6-fat',
    'omega-9-fat',
    'palmitic-acid',
    'pantothenic-acid',
    'phosphorus',
    'polyols',
    'polyunsaturated-fat',
    'potassium',
    'proteins',
    'saturated-fat',
    'selenium',
    'serum-proteins',
    'silica',
    'sodium',
    'starch',
    'stearic-acid',
    'sucrose',
    'sugars',
    'taurine',
    'trans-fat',
    'vitamin-a',
    'vitamin-b1',
    'vitamin-b12',
    'vitamin-b2',
    'vitamin-b6',
    'vitamin-b9',
    'vitamin-c',
    'vitamin-d',
    'vitamin-e',
    'vitamin-k',
    'vitamin-pp',
    'zinc',
];

// Función auxiliar que devuelve una función que siempre
// devuelve el parámetro con el que se ha creado.
//
// Parámetros:
//   - valor: valor que devolverá la función devuelta
// Devuelve:
//   Una función que siempre devuelve el parámetro con el que se creó.
function siempre(valor) {
    wlog.silly(`search_querystring.js:siempre(${valor})`);
    return (() => {
        // wlog.silly(`search_querystring.js:siempre(${valor}):()`);
        return valor;
    });
}; // siempre

// Función auxiliar que devuelve una función que comprueba si un valor
// se encuentra en el array con el que se contruyó.
//
// Parámetros:
//   - array: un array con el que se comprobará el valor pasado a la función devuelta
// Devuelve:
//   Una función al que se le pasa un valor y comprueba si se encontraba en el array parámetro.
function contiene(array) {
    wlog.silly(`search_querystring.js:contiene(${array})`);
    return (val) => {
        // wlog.silly(`search_querystring.js:contiene(${array}):(${val})`);
        return (array.indexOf(val) >= 0);
    };
};

// estructura en la que para cada filtro se mantiene los datos necesarios para recuperar y comprobar los parámetros necesarios de cada filtro.
//
// - 'nombre_rx': expresión regular de coincidencia con un parámetro que hace saltar el filtro
// - 'func': función a la que se pasa la querystring como un objeto: {'key1':'value1',...} y el
//     valor de la propiedad (coincidente con 'nombre_rx') y devuelve el objeto que representa
//     el filtro mongodb
// - 'operador_': prefijo del parámetro que contendrá el operador
// - 'check_tipo': función que devuelve verdadero o falso si el valor (operando) a comparar es válido
// - 'operadores': valores válidos para el parámetro coincidente con 'operador_'+num
// - 'operando': prefijo del parámetro que contiene el operando
// - 'filtro': función que se utiliza para generar el filtro mongodb (this es esta estructura de filtro) es llamada por 'func'
const QUERY_VALIDAS =
    [
        // tags:
        {
            'nombre_rx': /^tagtype_[0-9]+$/,
            'func': func_operador,
            'operador_': 'tag_contains_',
            'check_tipo': contiene(['brands',
                'categories',
                'packaging',
                'labels',
                'origins',
                'manufacturing_places',
                'emb_codes',
                'purchase_places',
                'stores',
                'countries',
                'additives',
                'allergens',
                'traces',
                'nutrition_grades',
                'states']),
            'operadores': ['contains', 'does_not_contains'],
            'operando_': 'tag_',
            'filtro': filtro_contains,
        },
        // nutrientes:
        {
            'nombre_rx': /^nutriment_[0-9]+$/,
            'func': func_operador,
            'operador_': 'nutriment_compare_',
            'check_tipo': siempre(true),
            'operadores': ['lt', 'lte', 'gt', 'gte', 'eq'],
            'operando_': 'nutriment_value_',
            'filtro': filtro_comparar,
        },
        // ingredientes:
        {
            'nombre_rx': /additives/,
            'func': func_value,
            'operador_': null,
            'check_tipo': contiene(['without_additives',
                'with_additives',
                'indifferent_additives'
            ]),
            'operadores': null,
            'operando': null,
            'operando_': null,
            'filtro': gen_filtro_contiene('additives_tags'),
        },
        {
            'nombre_rx': /ingredients_from_palm_oil/,
            'func': func_value,
            'operador_': null,
            'check_tipo': contiene(['without',
                'with',
                'indifferent'
            ]),
            'operadores': null,
            'operando': null,
            'operando_': null,
            'filtro': gen_filtro_contiene('ingredients_from_palm_oil_tags'),
        },
        {
            'nombre_rx': /ingredients_from_or_that_may_be_from_palm_oil/,
            'func': func_value,
            'operador_': null,
            'check_tipo': contiene(['without',
                'with',
                'indifferent'
            ]),
            'operadores': null,
            'operando': null,
            'operando_': null,
            'filtro': gen_filtro_contiene('ingredients_from_or_that_may_be_from_palm_oil_tags'),
        },
    ];

function filtro_contains(tipo, op, val) {
    wlog.silly(`search_querystring.js:filtro_contains(${tipo},${op},${val})`);
    let res = {}; // nuevo objeto vacio
    tipo = tipo + "_tags";

    //  const rx_val = new RegExp(val,'i');
    const rx_val = val;

    if (op === 'contains') {
        res[tipo] = { $regex: rx_val, $options: 'i' };
    } else if (op === 'does_not_contains') {
        res[tipo] = { $not: { $regex: rx_val, $options: 'i' } };
    };
    // si no es 'contains'/'does_not_contains': res = {}

    return res;
} // filtro_contains

function filtro_comparar(tipo, op, val) {
    wlog.silly(`search_querystring.js:filtro_comparar(${tipo},${op},${val})`);
    let res = {};

    if (this['operadores'].indexOf(op) >= 0) {
        let op_symbol = Symbol(op);
        res[tipo] = {};
        res[tipo][op_symbol] = val;
    };

    return res;
} // filtro_comparar

function gen_filtro_contiene(prop_array) {
    wlog.silly(`search_querystring.js:gen_filtro_contiene(${prop_array})`);
    return (tipo) => {
        // wlog.silly(`search_querystring.js:gen_filtro_contiene(${prop_array}):${tipo}`);
        let res = {};

        if (tipo.startsWith('indifferent')) {
            res = {}; // redundante
        } else if (tipo.startsWith('without')) {
            res[prop_array] = { $exists: true, $eq: [] };
        } else if (tipo.startsWith('with')) {
            res[prop_array] = { $exists: true, $ne: [] };
        };

        return res;
    };
};

// Función que busca los parámetros necesarios para componer un filtro por tag
// en una query string.
//
// procesa: tagtype_ y nutriment_
//
// Parámetros:
//  - query: un objeto con los pares de la querystring {'key':'value',...}
//  - prop: valor del parámetro encontrado que activa esta función (ej: tagtype_0)
//  [this: el objeto que contiene restricciones de datos del filtro ]
// Devuelve:
//  - un objeto-filtro de MongoDB.
//
//  Ejemplo:
//
//     tagtype_0=categories      // una de las categorias
//     tag_contains_0=contains
//     tag_0=cereals             // una palabra entera
function func_operador(query, prop) {
    wlog.silly(`search_querystring.js:func_tagtype(${query},${prop})`);
    let [_, grupo] = prop.split('_');
    // obtener el valor (tipo) del parámetro...
    let tipo = query[prop];
    // ...y comprobar si es válido.
    assert(this['check_tipo'](tipo));
    // obtener el operador de este filtro...
    let operador = query[this['operador_'] + grupo];
    // ...y comprobar si es válido
    assert(this['operadores'].indexOf(operador) >= 0);
    // por último obtener el valor del operando...
    let operando = query[this['operando_'] + grupo];

    // wlog.silly(`func_tagtype con grupo=${grupo}, tipo=${tipo}, operador=${operador}`);

    let res = this['filtro'](tipo, operador, operando);

    // wlog.silly(`func_tagtype = (${prop})=${res}`);
    return res;
};

// Función que busca los parámetros necesarios para componer un filtro por valor.
//
// Parámetros:
//  - query: un objeto con los pares de la querystring {'key':'value',...}
//  - prop: valor del parámetro encontrado que activa esta función (ej: )
//  [this: el objeto que contiene restricciones de datos del filtro ]
// Devuelve:
//  - un objeto-filtro de MongoDB.
function func_value(query, prop) {
    wlog.silly(`search_querystring.js:func_value(${query},${prop})`);
    let res = this['filtro'](tipo, operador, operando);

    // wlog.silly(`func_value = (${prop})=${res}`);
    return res;
}

/* -------------------------------------------------------------------
   -------               FUNCIONES AUXILIARES                  ------- 
   ------------------------------------------------------------------- */

/* -------------------------------------------------------------------
   -------                         API                         ------- 
   ------------------------------------------------------------------- */
// Función que recibe un objeto con los pares clave/valor que se han pasado
// como query string en una petición http y devuelve un array cuyos elementos
// son objetos en el formato que se pasa al driver de MongoDB y que representan
// un filtro indicado por la querystring
//
// NOTA: el array de filtros debería añadirse a un objeto superior para hacer
// la operación lógica AND {$and: [array_resultado]}
//
// Parámetros:
//  - query: un objeto con los pares de la querystring {'key':'value',...}
// Devuelve:
//  - array de objetos, cada uno un filtro de MongoDB.
function query_search(query) {
    wlog.silly(`search_querystring.js:query_search(${query})`);
    let res = [];
    for (let key in query) {

        let obj_procesar = QUERY_VALIDAS.find((obj) => {
            return key.match(obj['nombre_rx']);
        });

        //    wlog.silly(` ++ ${obj_procesar} o ${JSON.stringify(obj_procesar)}`);
        if (obj_procesar)
            res.push(obj_procesar['func'](query, key));
    }

    return res;
}; // query_search

module.exports = query_search;

