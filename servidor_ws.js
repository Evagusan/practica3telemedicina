var conexion = require("./conexion_mysql.js");

// Crear un servidor HTTP
var http = require("http");
var httpServer = http.createServer();

// Crear servidor WS
// Necesita tener instalado el módulo websocket:
// npm install websocket
var WebSocketServer = require("websocket").server;
var wsServer = new WebSocketServer({
    httpServer: httpServer
});

// Iniciar el servidor HTTP en un puerto
var puerto = 4444;
httpServer.listen(puerto, function () {
    console.log("Servidor de WebSocket iniciado en puerto:", puerto);
});

var clientes = []; // array de los clientes que se conectan


function avisoReserva(idReserva, accion, origen) {
    console.log("Aviso de reserva recibido");

    //buscar reserva
    var sql="SELECT * FROM reservas WHERE id="+idReserva;
    conexion.query(sql, function(err, reservas){
        if (err) {
            console.log("Error al buscar reserva");
            return;
        }
        if (reservas.length==0){
            console.log("No existe la reserva del aviso");
            return;
        }

        var reserva=reservas[0];

        //buscar recurso
        var sqlRECURSO="SELECT * FROM recursos WHERE id="+reserva.recurso;
        conexion.query(sqlRECURSO, function(err, recursos){
            if (err || recursos.length==0){
                console.log("No existe el recurso del aviso");
                return;
            }

            var recurso=recursos[0];

            //buscar modelo
            var sqlMODELO="SELECT * FROM modelos WHERE id="+recurso.modelo;
            conexion.query(sqlMODELO, function(err, modelos){
                if (err || modelos.length==0){
                    console.log("No existe el modelo");
                    return;
                }

                var modelo=modelos[0];

                //buscar categoria del modelo
                var sqlCATEGORIA="SELECT * FROM categorias WHERE id="+modelo.categoria;
                conexion.query(sqlCATEGORIA, function(err, categorias){
                    if (err || categorias.length==0){
                        console.log("No existe la categoria");
                        return;
                    }

                    var categoria=categorias[0];

                    //Crear texto del aviso
                    var texto="";
                    if (accion === "iniciada") {
                        texto = "SE HA INICIADO LA RESERVA DEL " + categoria.nombre +
                            " MODELO " + modelo.nombre +
                            " CON CODIGO " + recurso.numero_serie + ".";
                    }

                    if (accion === "finalizada") {
                        texto = "SE HA FINALIZADO LA RESERVA DEL " + categoria.nombre +
                            " MODELO " + modelo.nombre +
                            " CON CODIGO " + recurso.numero_serie + ".";
                    }

                    console.log("Texto del aviso: ", texto);

                    //buscar reservas activas de ese recurso
                    var sqlRESERVAS="SELECT * FROM reservas WHERE recurso="+reserva.recurso+" AND fecha_fin IS NULL";
                    conexion.query(sqlRESERVAS, function(err, reservasActivas){
                        if (err){
                            console.log("Error al buscar reservas");
                            return;
                        }

                        //Destinatarios
                        var fecha = new Date().toLocaleString();

                        for (var c=0; c<clientes.length; c++){
                            var clienteDestino=clientes[c];

                            if (clienteDestino.tipoUsuario === "sanitario"){
                                var reservaActiva=false;

                                for (var r=0; r<reservasActivas.length; r++){
                                    if (
                                        reservasActivas[r].sanitario == clienteDestino.idUsuario &&
                                        reservasActivas[r].sanitario != reserva.sanitario
                                    ){
                                        reservaActiva=true;
                                        break;
                                    }
                                }

                                if (reservaActiva){
                                    clienteDestino.connection.sendUTF(JSON.stringify({
                                        operacion:"recibirAviso",
                                        fecha:fecha,
                                        origen:origen,
                                        texto:texto,
                                        color:"rojo"
                                    }));
                                }
                            }
                        }
                    });
                });
            });
        });
    });
}


function avisoRecurso(idRecurso, origen) {
    console.log("aviso de recurso creado recibido");

    //buscar recurso
    var sql="SELECT * FROM recursos WHERE id="+idRecurso;
    conexion.query(sql, function(err, recursos){
        if (err || recursos.length==0){
            console.log("No existe el recurso del aviso");
            return;
        }

        var recurso=recursos[0];

        //buscar modelo
        var sqlMODELO="SELECT * FROM modelos WHERE id="+recurso.modelo;
        conexion.query(sqlMODELO, function(err, modelos){
            if (err || modelos.length==0){
                console.log("No existe el modelo");
                return;
            }

            var modelo=modelos[0];

            //buscar categoria
            var sqlCATEGORIA="SELECT * FROM categorias WHERE id="+modelo.categoria;
            conexion.query(sqlCATEGORIA, function(err, categorias){
                if (err || categorias.length==0){
                    console.log("No existe la categoria");
                    return;
                }

                var categoria=categorias[0];

                var texto = "SE HA CREADO UN NUEVO RECURSO " + categoria.nombre +
                    " MODELO " + modelo.nombre +
                    " CON CODIGO " + recurso.numero_serie + ".";

                var fecha=new Date().toLocaleString();

                for (var c=0; c<clientes.length; c++){
                    var clienteDestino=clientes[c];

                    if (clienteDestino.tipoUsuario === "sanitario"){
                        clienteDestino.connection.sendUTF(JSON.stringify({
                            operacion:"recibirAviso",
                            fecha:fecha,
                            origen:origen,
                            texto:texto,
                            color:"azul"
                        }));
                    }
                }
            });
        });
    });
}


function avisoResenya(idResenya, origen) {
    console.log("Aviso de reseña recibido");

    //buscar reseña
    var sql="SELECT * FROM resenyas WHERE id="+idResenya;
    conexion.query(sql, function(err, resenyas){
        if (err || resenyas.length==0){
            console.log("No existe la reseña del aviso");
            return;
        }

        var resenya=resenyas[0];

        //buscar recurso
        var sqlRECURSO="SELECT * FROM recursos WHERE id="+resenya.recurso;
        conexion.query(sqlRECURSO, function(err, recursos){
            if (err || recursos.length==0){
                console.log("No existe el recurso");
                return;
            }

            var recurso=recursos[0];

            //buscar modelo
            var sqlMODELO="SELECT * FROM modelos WHERE id="+recurso.modelo;
            conexion.query(sqlMODELO, function(err, modelos){
                if (err || modelos.length==0){
                    console.log("No existe el modelo");
                    return;
                }

                var modelo=modelos[0];

                //buscar categoria
                var sqlCATEGORIA="SELECT * FROM categorias WHERE id="+modelo.categoria;
                conexion.query(sqlCATEGORIA, function(err, categorias){
                    if (err || categorias.length==0){
                        console.log("No existe la categoria");
                        return;
                    }

                    var categoria=categorias[0];

                    var texto = "SE HA CREADO UNA RESEÑA PARA EL " + categoria.nombre +
                        " MODELO " + modelo.nombre +
                        " CON CÓDIGO " + recurso.numero_serie +
                        " Y PUNTUACION " + resenya.valor + ".";

                    var fecha=new Date().toLocaleString();

                    for (var c=0; c<clientes.length; c++){
                        var clienteDestino=clientes[c];

                        if (clienteDestino.tipoUsuario === "gestor"){
                            clienteDestino.connection.sendUTF(JSON.stringify({
                                operacion:"recibirAviso",
                                fecha:fecha,
                                origen:origen,
                                texto:texto,
                                color:"verde"
                            }));
                        }
                    }
                });
            });
        });
    });
}


// Esperar a clientes...
wsServer.on("request", function (request) {
    var connection = request.accept("avisos", request.origin);
    var cliente = {
        connection: connection,
        tipoUsuario:null,
        idUsuario:null,
        nombre:null
    };

    clientes.push(cliente);
    console.log("Cliente conectado. Ahora son:", clientes.length);

    connection.on("message", function (message) {
        if (message.type === "utf8") {
            console.log("Mensaje recibido de cliente: " + message.utf8Data);
            var msg=JSON.parse(message.utf8Data);

            switch (msg.operacion) {
                case "identificar":
                    cliente.tipoUsuario=msg.tipoUsuario;
                    cliente.idUsuario=msg.idUsuario;
                    cliente.nombre=msg.nombre;

                    console.log("Cliente Identificado: ",
                        cliente.tipoUsuario,
                        cliente.idUsuario,
                        cliente.nombre);
                    break;
            }
        }
    });

    connection.on("close", function () {
        console.log("Cliente desconectado");

        for (var i=0; i<clientes.length; i++){
            if (clientes[i] === cliente){
                clientes.splice(i,1);
                break;
            }
        }

        console.log("Clientes conectados: ", clientes.length);
    });
});


module.exports = {
    avisoReserva,
    avisoRecurso,
    avisoResenya
};