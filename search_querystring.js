// *******************************************************************
// Fichero:     search_query.js
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
// *******************************************************************
'use strict';

/* -------------------------------------------------------------------
   -------           PARÁMETROS DE CONFIGURACIÓN               ------- 
   ------------------------------------------------------------------- */
const MAX_NUM_GRUPOS = 10;

const QUERY_VALIDAS =
      [
	{
	  'nombre': 'tagtype_',
	  'func': func_tagtype,
	}
      ];

const CTE_TAGTYPES = [
  'brands',
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
  'states'
];
const CTE_TAGTYPE_CONTAINS = ['contains','does_not_contains'];

function func_tagtype(query,tag) {
  console.log(`func_tagtype(query,${tag})`);
  let [_, grupo] = tag.split('_');
  let tagtype = query[tag];
  let operador = query['tag_contains_'+grupo];
  let operando2 = query['tag_'+grupo];  

  console.log(`func_tagtype con grupo=${grupo}, tagtype=${tagtype}, operador=${operador}, operando2=${operando2}`);
  
  let res = {};
  // si se han encontrado todos los componentes del filtro...
  if (grupo && tagtype && operador && operando2) {
    let tags_field = tagtype + "_tags";
    if ((CTE_TAGTYPES.indexOf(tagtype) >= 0) && (CTE_TAGTYPE_CONTAINS.indexOf(operador) >= 0)) { // [1]
      if (operador === CTE_TAGTYPE_CONTAINS[0]) {
	res[tags_field] = operando2;
      } else if ( operador === CTE_TAGTYPE_CONTAINS[1] ) {
	res[tags_field] = { $nin: [operando2] };
      } else {
	console.log('Error el operador tagtype no es [does_not_]contains'); // nunca se llega aqui ya que antes se comprueba en [1]
      }
    } else {
      console.log('Error de operando1 u operador para el filtro tagtype');
    };
  } else {
    console.log('Error de operandos/operador del filtro tagtype');
  }

  console.log(`func_tagtype = (${tag})=${res}`);
  return res;
};

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
  let res = [];
  for (let key in query) {

    let obj_procesar = QUERY_VALIDAS.find((obj) => {

      return key.startsWith(obj['nombre']);
    });
    
    console.log(` ++ ${obj_procesar} o ${JSON.stringify(obj_procesar)}`);
    if (obj_procesar) res.push(obj_procesar['func'](query,key));
  }

  return res;
}; // parse_query

module.exports = query_search;

