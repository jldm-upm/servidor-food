// *******************************************************************
// Fichero:     taxonomies.js
// -------------------------------------------------------------------
// Proyecto:     
// Autor:       José L. Domenech
// Descripción:
//              Librería para la lectura de datos estáticos de taxonomias
//
// -------------------------------------------------------------------
//   Historia: + 25 May 2020 - Primera Versión
// *******************************************************************
'use strict';

const wlog = require('./configuracion.logger.js');

// librería sistema de ficheros local
const fs = require('fs');

const DIR_STATIC = 'static';
const PATH_STATIC = `${__dirname}/${DIR_STATIC}`; // path de almacenamiento de ficheros estáticos
const PATH_TAXONOMIES = `${PATH_STATIC}/tax`;

exports.load_tax = async function (taxonomy) {
    wlog.silly(`load_tax(${taxonomy})`);
    return await JSON.parse(fs.readFile(`${PATH_TAXONOMIES}/${taxonomy}.json`, 'utf8'));
};
