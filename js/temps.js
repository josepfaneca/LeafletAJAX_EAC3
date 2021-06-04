$(document).ready(function() {

    const center = [41.82045, 1.54907];
    const crs25831 = new L.Proj.CRS('EPSG:25831', '+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', {
        resolutions: [1100, 550, 275, 100, 50, 25, 10, 5, 2, 1.5, 1, 0.5, 0.25]
    });

    const serveiTopoCache = L.tileLayer.wms("https://geoserveis.icgc.cat/icc_mapesmultibase/utm/wms/service?", {
        layers: 'topo',
        format: 'image/jpeg',
        crs: crs25831,
        continuousWorld: true,
        attribution: 'Institut Cartogràfic i Geològic de Catalunya',
    });

    const serveiOrtoCache = L.tileLayer.wms("https://geoserveis.icgc.cat/icc_mapesmultibase/utm/wms/service?", {
        layers: 'orto',
        format: 'image/jpeg',
        crs: crs25831,
        continuousWorld: true,
        attribution: 'Institut Cartogràfic i Geològic de Catalunya',
    });

    const serveitopoGrisCache = L.tileLayer.wms("https://geoserveis.icgc.cat/icc_mapesmultibase/utm/wms/service?", {
        layers: 'topogris',
        format: 'image/jpeg',
        crs: crs25831,
        continuousWorld: true,
        attribution: 'Institut Cartogràfic i Geològic de Catalunya',
    });


    const wmsComarques = L.tileLayer.wms("https://geoserveis.icgc.cat/icgc_bm5m/wms/service?", {
        layers: '20_COMARCA_PC,70_NOMCOMARCA_TX',
        format: 'image/png',
        crs: crs25831,
        transparent: true,
        continuousWorld: true,
        attribution: 'Base Municipal 1:5.000 - ICGC',
    });

    let map = L.map('map', {
        layers: [serveiOrtoCache],
        crs: crs25831,
        continuousWorld: true,
        worldCopyJump: false,
        center: center,
        zoom: 1.4,
        maxBounds: [
            [38.86, -1.29],
            [44.58, 6.16]
        ]
    });

    let baseMaps = {
        "Topogràfic": serveiTopoCache,
        "Topogràfic gris": serveitopoGrisCache,
        "Ortofoto": serveiOrtoCache
    };
    let overlayMaps = {
        "Comarques": wmsComarques
    };

    var markerGroup = L.layerGroup().addTo(map);
    L.control.layers(baseMaps, overlayMaps).addTo(map);

    var urlMeteo = 'https://static-m.meteo.cat/content/opendata/ctermini_comarcal.xml';
    var diaD;
    var simbolHora;

    //Buscar capitals amb lletres El La Les
    var regExp = /(La|El|Les)/g;

    /*
    donar funcionalitat als botons
    */


    $("#avuiM").on("click", function() {
        removeMarkers();
        simbolHora = 'simbolmati';
        diaD = 0;
        pintarMapaDelTemps();
    });

    $("#avuiT").on("click", function() {
        removeMarkers();
        simbolHora = 'simboltarda';
        diaD = 0;
        pintarMapaDelTemps();
    });

    $("#demaM").on("click", function() {
        removeMarkers();
        simbolHora = 'simbolmati';
        diaD = 1;
        pintarMapaDelTemps();
    });

    $("#demaT").on("click", function() {
        removeMarkers();
        simbolHora = 'simboltarda';
        diaD = 1;
        pintarMapaDelTemps();
    });

    $('#refrescar').on('click', function() {
        location.reload();
    });


    function pintarMapaDelTemps() {
        var nomComarques = [];
        var prediccio = [];
        var tempMax = [];
        var tempMin = [];
        var long, lat;

        //llegir xml
        $.ajax({
            type: "GET",
            url: urlMeteo,
            dataType: "xml",
            success: processarResposta

        });

        function processarResposta(dades) {
            //per cada comarca obtenir la capital. 
            $(dades).find("comarca").each(function() {
                nomComarques.push($(this).attr("nomCAPITALCO"));
            })

            //predicció segons dia
            $(dades).find("prediccio").each(function() {
                prediccio.push($(this).children().eq(diaD).attr(simbolHora));
            })

            //temperatures máx
            $(dades).find("prediccio").each(function() {
                tempMax.push($(this).children().eq(diaD).attr('tempmax'));
            })

            //temperatures máx
            $(dades).find("prediccio").each(function() {
                tempMin.push($(this).children().eq(diaD).attr("tempmin"));
            })


            canviarArticles(nomComarques);

            /*
            aquí faig la petició ajax al json del municipis per obtenir les coordenades
            */
            cridarCoordenades(nomComarques);
        }

        /*
        Cridar les coordenades per cada capital de comarca i montar la imatge. Dibuixar el marcador i afegir al mapa
        */

        function cridarCoordenades(nomComarques) {
            for (let index = 0; index < nomComarques.length; index++) {
                const url = 'https://analisi.transparenciacatalunya.cat/resource/wpyq-we8x.json?municipi=' + encodeURIComponent(nomComarques[index]);
                const imatge = L.icon({
                    iconUrl: 'https://static-m.meteo.cat/assets-w3/images/meteors/estatcel-ombra/' + prediccio[index],
                    iconSize: [60, 60]

                });
                //obtenir les coordenades per cada capital de comarca amb ajax //https://api.jquery.com/jQuery.getJSON/
                $.ajax({
                    dataType: "json",
                    url: url,
                    success: success
                });

                function success(data) {
                    long = data[0].longitud;
                    lat = data[0].latitud;
                    L.marker([lat, long], {
                        icon: imatge
                    }).bindPopup("<strong>" + nomComarques[index] + "<br>Temp. Máx: " + tempMax[index] + "</strong><br/>" + "<strong> Temp. Mín: " + tempMin[index] + "</strong>").addTo(markerGroup);


                }

            }
        }

        function firstLetter(s) {
            return s.replace(/^.{1}/g, s[0].toLowerCase());
        }


        //reemplaçar els articles per minúscules
        function canviarArticles(nomComarques) {
            for (let index = 0; index < nomComarques.length; index++) {
                const element = nomComarques[index];
                if (regExp.test(element)) {
                    nomComarques[index] = firstLetter(element);
                } else if (element.includes('/')) {
                    const separa = element.split('/');
                    nomComarques[index] = separa[0];
                } else if (element.includes('El Pont de Suert')) {
                    nomComarques[index] = 'el Pont de Suert'; //no sé perquè no el modifica
                }
            }
        }


    }

    function removeMarkers() {

        $('.leaflet-pane.leaflet-marker-pane').empty()
    }





});
