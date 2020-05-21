/* -------------------------------------------------------------------
   -------           PARÁMETROS DE CONFIGURACIÓN               ------- 
   ------------------------------------------------------------------- */
/*
{
  // parámetros de escuchador del servicio web
  PUERTO_SERVIDOR,
  INTERFAZ_SERVIDOR,
}
*/

const conf = {
    // parámetros de escuchador del servicio web
    PUERTO_SERVIDOR: 8080,
    INTERFAZ_SERVIDOR: 'localhost',

    OPCIONES_BUSQUEDA_LIMITE_10: [{ limit: 10 }],

    FILTRO_BUSQUEDA_IS_COMPLETE: { complete: 1 },

    ACCESO_SERVICIO_EXTERNO: true,
    URL_BASE_SERVICIO_EXTERNO: "https://world.openfoodfacts.org"
};

module.exports = conf;
