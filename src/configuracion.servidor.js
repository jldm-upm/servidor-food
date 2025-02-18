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
    PUERTO_SERVIDOR: 8000,
    INTERFAZ_SERVIDOR: '0.0.0.0',

    TAMANO_PAGINA: 10,
    
    // 'flag' que indica si en caso de no encontrar el producto si entonces se debe
    // acceder al servicio
    ACCESO_SERVICIO_EXTERNO: true,
    // url (protocolo+ip/direccion+puerto) al servicio externo
    URL_BASE_SERVICIO_EXTERNO: "https://world.openfoodfacts.org",
    // configuración 'axios', p.e. timeout o cabecera de identificación 'User-Agent',
    // que el servicio axios requiere.
    AXIOS_CONF: {
        timeout: 5000,
        headers: {
            'User-Agent': 'TFG SDG12RCAP - Server - Version 0.9'
        }
    }
};

module.exports = conf;
