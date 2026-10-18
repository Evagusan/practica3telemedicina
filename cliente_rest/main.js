// 0) ESTADO / VARIABLES
var idGestorLogueado = null;
var categorias = [];
var modelos = [];
var ubicaciones = [];
var idRecursoActual = null; // null = nuevo (POST), número = editando (PUT)
//guardarrecurso() misma funcion para uno nuevo que para el mod
var sanitarios = {}; // { "1": "Miguel Lopez", "2": "Martina Garcia" }
//para no repetir  GET el id del mismo sanitario al pintar las reservas
var modogestor="registro";
//VARIABLES WS
var conexionAvisos = null;
var nombreUsuarioAvisos = "";

//VARIABLES TOKEN
var tokenGestor= null;

//LOGIN WB
function conectarAvisosGestor() {
  conexionAvisos= new WebSocket("ws://localhost:4444", "avisos");

  conexionAvisos.addEventListener("open", function() {
    conexionAvisos.send(JSON.stringify({
      operacion:"identificar",
      tipoUsuario: "gestor",
      idUsuario: idGestorLogueado,
      nombre:nombreUsuarioAvisos
    }));
  });

  conexionAvisos.addEventListener("message", function(evento){
    var aviso=JSON.parse(evento.data);
    console.log("Aviso recibido:", aviso);

    if (aviso.operacion === "recibirAviso") {
            crearAviso(aviso);
            cargarReservasPendientes();
            cargarReservasRealizadas();
        }
  });

  conexionAvisos.addEventListener("close", function() {
    console.log("WebSocket de avisos cerrado");
  });
}

// TABLA AVISOS
function crearAviso(aviso) {
    var tbody = document.getElementById("avisos");
    var fila = tbody.insertRow();

    fila.insertCell(0).textContent = aviso.fecha;
    fila.insertCell(1).textContent = aviso.origen;
    fila.insertCell(2).textContent = aviso.texto;

    if (aviso.color === "rojo") fila.style.color = "red";
    if (aviso.color === "azul") fila.style.color = "lightblue";
    if (aviso.color === "verde") fila.style.color = "lightgreen";
}




// 1) UTILIDADES
function nombreModelo(id) {
  for (var i = 0; i < modelos.length; i++) {
    if (modelos[i].id == id) return modelos[i].nombre;
  }
  return "";
}

function categoriaDeModelo(idModelo) {
  for (var i = 0; i < modelos.length; i++) {
    if (modelos[i].id == idModelo) return modelos[i].categoria;
  }
  return null;
}

function nombreCategoria(id) {
  for (var i = 0; i < categorias.length; i++) {
    if (categorias[i].id == id) return categorias[i].nombre;
  }
  return "";
}

function nombreUbicacion(id) {
  for (var i = 0; i < ubicaciones.length; i++) {
    if (ubicaciones[i].id == id) return ubicaciones[i].nombre;
  }
  return "";
}

function textoEstado(n) {
  if (n == 0) return "Operativo";
  if (n == 1) return "En Baja";
  if (n == 2) return "Defectuoso";
  if (n==3) return "Mantenimiento";
  return "Desconocido";
}

function formatearFecha(valor) { //convierte fecha (Date / string) a dd/mm/aa hh:mm:ss
  if (valor == null) return "";

  var d = new Date(valor);
  if (isNaN(d.getTime())) return ""; // por si viene raro

  var dia = String(d.getDate()).padStart(2, "0");
  var mes = String(d.getMonth() + 1).padStart(2, "0");
  var anio = String(d.getFullYear()).slice(2);

  var h = String(d.getHours()).padStart(2, "0");
  var m = String(d.getMinutes()).padStart(2, "0");
  var s = String(d.getSeconds()).padStart(2, "0"); // 01/02/26 en vez de 1/2/26

  return dia + "/" + mes + "/" + anio + " " + h + ":" + m + ":" + s;
}

// 2) LOGOUT
function logoutGestor() {
  idGestorLogueado = null;
  tokenGestor = null;
  document.getElementById("nombreGestor").textContent = "";
  nombreUsuarioAvisos="";
  limpiarLogin();
  limpiarAvisos();

  if (conexionAvisos != null) { //comprueba si hay conexion abierta
        conexionAvisos.close(); //cierra conexion con servidor
        conexionAvisos = null;
    }
}
function salir() {
    logoutGestor();          // <- main.js
    cambiarSeccion("login");
  }
  
// LIMPIAR FORMULARIOS
function limpiarLogin() { // porque al terminar el login o registro dejamos los inputs limpios
  document.getElementById("usuario").value = ""; // para no dejar contraseñas, ni valores anttiguos
  document.getElementById("password").value = "";
}

function limpiarRegistro() {
  document.getElementById("nombre").value = "";
  document.getElementById("apellidos").value = "";
  document.getElementById("usuarioRegistro").value = "";
  document.getElementById("passwordRegistro").value = "";
}

function limpiarAvisos() {
    var tbody = document.getElementById("avisos");
    if (tbody != null) {
        tbody.innerHTML = "";
    }
}

// 3) CARGA DATOS BASE (combos)
function cargarCategorias(callback) { //piden datos al servidor con REST y los guardan en arrays globales
  rest.get("/api/categorias", function (estado, datos) {
    if (estado === 200) {
      categorias = datos; //no podemos suponer que categorias esta lista nada mas llamarla
      if (callback) callback();
    } else {
      alert("Error al cargar categorías");
    }
  });
}

function cargarModelos(callback) {
  rest.get("/api/modelos", function (estado, datos) {
    if (estado === 200) {
      modelos = datos;
      if (callback) callback();
    } else {
      alert("Error al cargar modelos");
    }
  });
}

function cargarUbicaciones(callback) {
  rest.get("/api/ubicaciones", function (estado, datos) {
    if (estado === 200) {
      ubicaciones = datos;
      if (callback) callback();
    } else {
      alert("Error al cargar ubicaciones");
    }
  });
}

function filtrosRecursos() { //rellena 3 filtros con todos (no filtrar)
  var selCat = document.getElementById("categoriaFilter");
  var selMod = document.getElementById("modeloFilter");
  var selUb = document.getElementById("ubicacionFilter");
  // Limpiar y poner "Todos"
  selCat.innerHTML = '<option value="all">Todos</option>';
  selMod.innerHTML = '<option value="all">Todos</option>';
  selUb.innerHTML  = '<option value="all">Todos</option>';

  for (var i = 0; i < categorias.length; i++) {
    var opt = document.createElement("option");
    opt.value = categorias[i].id;
    opt.textContent = categorias[i].nombre;
    selCat.appendChild(opt);
  }

  for (var j = 0; j < modelos.length; j++) {
    var opt2 = document.createElement("option");
    opt2.value = modelos[j].id;
    opt2.textContent = modelos[j].nombre;
    selMod.appendChild(opt2);
  }

  for (var k = 0; k < ubicaciones.length; k++) {
    var opt3 = document.createElement("option");
    opt3.value = ubicaciones[k].id;
    opt3.textContent = ubicaciones[k].nombre;
    selUb.appendChild(opt3);
  } // NO estado -> no viene en el servidor, son valores fijos en el html, cat mod y ubi pueden cambian, crecer (dependen serv)
}


// 4) AUTENTICACIÓN

//LOGIN
function hacerLogin() {
  var usuario = document.getElementById("usuario").value.trim();
  var password = document.getElementById("password").value.trim();

  if (usuario === "" || password === "") {
    alert("Introduce usuario y contraseña.");
    return;
  }

  var credenciales = { login: usuario, password: password };

  rest.post("/api/gestores/login", credenciales, function (estado, respuesta) {
    if (estado === 200) {
      idGestorLogueado = respuesta.id;
      tokenGestor= respuesta.token;

      limpiarLogin();

      // pedir datos del gestor para Bienvenido
      rest.get("/api/gestores/" + idGestorLogueado, function (estado2, gestor) {
        if (estado2 === 200) {
          document.getElementById("nombreGestor").textContent =
            gestor.nombre + " " + gestor.apellidos;
            nombreUsuarioAvisos=gestor.nombre+ " " +gestor.apellidos;
            conectarAvisosGestor();
        }

        // cargar combos (categorias->modelos->ubicaciones) y entrar
        cargarCategorias(function () {
          cargarModelos(function () {
            cargarUbicaciones(function () {
              filtrosRecursos();
              tablaRecursos([]); // tabla vacía al entrar
              cambiarSeccion("menu-principal");
            });
          });
        });
      });
      return;
    }

    if (estado === 403) {
      alert("Usuario o contraseña incorrectos.");
      return;
    }

    alert("Error en login (estado " + estado + ")");
  });
}




//  REGISTRO (solo POST)
function hacerRegistro() {
  var datos = {
    nombre: document.getElementById("nombre").value.trim(),
    apellidos: document.getElementById("apellidos").value.trim(),
    usuario: document.getElementById("usuarioRegistro").value.trim(),
    password: document.getElementById("passwordRegistro").value.trim()
  };

  if (datos.nombre === "" || datos.apellidos === "" ||
      datos.usuario === "" || datos.password === "") {
    alert("Todos los campos son obligatorios.");
    return;
  }
  //REGISTRO POST
  if (modogestor==="registro") {
    rest.post("/api/gestores", datos, function (estado) {
    if (estado === 201) {
      alert("Registro correcto");
      limpiarRegistro();
      cambiarSeccion("login");
      return;
    }

    if (estado === 400) {
      alert("Usuario ya existente.");
      return;
    }

    alert("Error en registro (estado " + estado + ")");
    return;
  });
  } else {

  
  //REGISTRO PUT -> editar datos
  rest.put("/api/gestores/" + idGestorLogueado, datos, function (estado, res) {
    if (estado === 200) {
      alert("Datos actualizados");
      // refrescar el "Bienvenido"
      document.getElementById("nombreGestor").textContent = datos.nombre + " " + datos.apellidos;

      limpiarRegistro();
      cambiarSeccion("menu-principal");  // (mejor que volver a login)
      return;
    }
    if (estado === 400 || estado === 404) { alert(res); return; }
    alert("Error al editar (estado " + estado + ")");
  }) };
}



// 5) FORMAR TABLA -> LISTADO (tabla) + FILTROS, crea la tabla 
function tablaRecursos(recursos) {
  var tabla = document.getElementById("tablaRecursos").getElementsByTagName("tbody")[0];
  tabla.innerHTML = ""; // limpiar tabla

  for (var i = 0; i < recursos.length; i++) {
    var r = recursos[i];
    var fila = tabla.insertRow(); //crea fila

    fila.insertCell(0).textContent = r.numero_serie; //rellena celdas
    var idCat = categoriaDeModelo(r.modelo);
    fila.insertCell(1).textContent = nombreCategoria(idCat);
    fila.insertCell(2).textContent = nombreModelo(r.modelo);
    fila.insertCell(3).textContent = nombreUbicacion(r.ubicacion);
    fila.insertCell(4).textContent = textoEstado(r.estado);

    // --- Botón Abrir ---
    var celdaBotones = fila.insertCell(5);
    var btnAbrir = document.createElement("button"); //se crea el boton, necesita saber que recurso abrir (id)
    btnAbrir.textContent = "Abrir";
    btnAbrir.onclick = (function (id) { //boton raro por var, en el bucle hay que congelar el id
      return function () {
        abrirRecurso(id);//sino se podria acabar abriendo/borrando el rec equivocado
      };
    })(r.id);
    celdaBotones.appendChild(btnAbrir);

    // --- Botón Borrar (X) ---
    //var celdaBorrar = fila.insertCell(6);
    var btnBorrar = document.createElement("button");
    btnBorrar.textContent = "X";
    btnBorrar.onclick = (function (id) {
      return function () {
        borrarRecurso(id);
      };
    })(r.id);
    celdaBotones.appendChild(btnBorrar);
  }
}

function buscarRecursos() { // por los filtros
  var cat = document.getElementById("categoriaFilter").value;
  var mod = document.getElementById("modeloFilter").value;
  var ub  = document.getElementById("ubicacionFilter").value;
  var est = document.getElementById("estadoFilter").value;
  var params = [];
  var url = "/api/recursos";
  if (cat !== "all") params.push("categoria=" + cat);
  if (mod !== "all") params.push("modelo=" + mod);
  if (ub  !== "all") params.push("ubicacion=" + ub);
  if (est !== "all") params.push("estado=" + est);
  if (params.length > 0) url += "?" + params.join("&");

  rest.get(url, function (estado, recursos) {
    if (estado === 200) {
      tablaRecursos(recursos);
    } else {
      alert("Error al buscar recursos");
    }
  });
}

function borrarRecurso(id) {
  var ok = confirm("¿Seguro que quieres borrar este recurso?");
  if (!ok) return;  

  rest.delete("/api/recursos/" + id, function (estado, res) {
    if (estado === 200) {
      buscarRecursos(); // refresca la tabla con los filtros actuales
      return;
    }
  
    if (estado === 404) {
      alert(res);
      buscarRecursos(); // recargamos el listado tal cual estaba filtrado
      return;
    }
    alert("Error al borrar (estado " + estado + ")");
  });
}


// 6) FICHA RECURSO (nuevo/abrir/guardar)
function nuevoRecurso() {
  idRecursoActual = null;

  rellenarRecurso();

  document.getElementById("fichaSerie").value = "";
  document.getElementById("fichaEstado").value = "0";

  // vaciar tablas reservas y reseñas
  document.getElementById("tablaReservas").getElementsByTagName("tbody")[0].innerHTML = "";
  document.getElementById("tablaResenyas").getElementsByTagName("tbody")[0].innerHTML = "";

  cambiarSeccion("ficha-recurso");
}

function rellenarRecurso() {
  var selCat = document.getElementById("fichaCategoria");
  var selMod = document.getElementById("fichaModelo");
  var selUb  = document.getElementById("fichaUbicacion");

  selCat.innerHTML = "";
  selMod.innerHTML = "";
  selUb.innerHTML  = "";

  // categorías
  for (var i = 0; i < categorias.length; i++) {
    var opt = document.createElement("option");
    opt.value = categorias[i].id;
    opt.textContent = categorias[i].nombre;
    selCat.appendChild(opt);
  }

  // modelos (TODOS, independiente)
  for (var j = 0; j < modelos.length; j++) {
    var optM = document.createElement("option");
    optM.value = modelos[j].id;
    optM.textContent = modelos[j].nombre;
    selMod.appendChild(optM);
  }
  // ubicaciones
  for (var k = 0; k < ubicaciones.length; k++) {
    var opt3 = document.createElement("option");
    opt3.value = ubicaciones[k].id;
    opt3.textContent = ubicaciones[k].nombre;
    selUb.appendChild(opt3);
  }

}

function abrirRecurso(id) {
  idRecursoActual = id;

  rellenarRecurso();

  rest.get("/api/recursos/" + id, function (estado, recurso) {
    if (estado !== 200) {
      alert("No se pudo abrir el recurso (estado " + estado + ")");
      return;
    }

    document.getElementById("fichaSerie").value = recurso.numero_serie;
    document.getElementById("fichaUbicacion").value = recurso.ubicacion;
    document.getElementById("fichaEstado").value = recurso.estado;

    // categoría (se saca del modelo)
    var idCat = categoriaDeModelo(recurso.modelo);
    document.getElementById("fichaCategoria").value = idCat;
    document.getElementById("fichaModelo").value = recurso.modelo;

    cargarReservasDeRecurso(id);
    cargarResenyasDeRecurso(id);

    cambiarSeccion("ficha-recurso");
  });
}

function guardarRecurso() {
  var datosRecurso = {
  modelo: parseInt(document.getElementById("fichaModelo").value, 10), // parseInt -> evitar que me quede un str en vez de numero (value me da str, pero parint num)
  ubicacion: parseInt(document.getElementById("fichaUbicacion").value, 10),// el 10 base decimal
  numero_serie: document.getElementById("fichaSerie").value.trim(),
  estado: parseInt(document.getElementById("fichaEstado").value, 10),
  origen: nombreUsuarioAvisos
  };

  if (datosRecurso.numero_serie === "") {
    alert("El número de serie es obligatorio.");
    return;
  }
  // comprobar que la categoría elegida coincide con la del modelo elegido
  var idCatElegida = parseInt(document.getElementById("fichaCategoria").value, 10);
  var catDelModelo = categoriaDeModelo(datosRecurso.modelo);

  if (catDelModelo != idCatElegida) {
    alert("La categoría no coincide con el modelo elegido. Cambia el modelo o la categoría.");
    return;
  }

  // NUEVO -> POST
  if (idRecursoActual == null) {
    rest.post("/api/recursos", datosRecurso, function (estado,respuesta) {
      if (estado === 201) {
        cambiarSeccion("menu-principal");
        buscarRecursos();
        return;
      }
      if (estado == 400) {
        alert(respuesta);
        return;
      }
      
      alert("Error al guardar (estado " + estado + ")");
    });
    return;
  }

  // EXISTENTE -> PUT
  rest.put("/api/recursos/" + idRecursoActual, datosRecurso, function (estado,respuesta) {
    if (estado === 200) {
      cambiarSeccion("menu-principal");
      buscarRecursos();
      return;
    }
    if (estado == 400) {
        alert(respuesta);
        return;
      }
      
    if (estado === 404) {
      alert(respuesta);
      cambiarSeccion("menu-principal");
      buscarRecursos();
      return;
    }

    alert("Error al guardar (estado " + estado + ")");
    return;
  });
}











// 7) RESERVAS / RESEÑAS
function cargarReservasDeRecurso(id) {
  rest.get("/api/recursos/" + id + "/reservas", function (estado, reservas) {
    if (estado === 200) {
      pintarReservas(reservas);
    } else {
      alert("Error al cargar reservas");
    }
  });
}

function cargarResenyasDeRecurso(id) {
  rest.get("/api/recursos/" + id + "/resenyas", function (estado, resenyas) {
    if (estado === 200) {
      pintarResenyas(resenyas);
    } else {
      alert("Error al cargar reseñas");
    }
  });
}

function pintarReservas(reservas) {
  var tbody = document.getElementById("tablaReservas").getElementsByTagName("tbody")[0];
  tbody.innerHTML = "";

  for (var i = 0; i < reservas.length; i++) {
    var r = reservas[i];
    var fila = tbody.insertRow();

    var inicio = r.fecha_inicio ? new Date(r.fecha_inicio) : null;
    var fin    = r.fecha_fin ? new Date(r.fecha_fin) : null;

    // 1) BLANCO: finalizada
    if (fin != null) {
      // no hacemos nada
    }
    // 2) VERDE: pendiente
    else if (inicio == null) {
      fila.className = "reserva-verde";
    }
    // 3) AZUL / ROJO: en uso
    else {
      var ahora = new Date();
      var msUsados = ahora.getTime() - inicio.getTime();
      var horasUsadas = msUsados / (1000 * 60 * 60);

      if (horasUsadas <= r.horas_estimadas) {
        fila.className = "reserva-azul";
      } else {
        fila.className = "reserva-roja";
      }
    }

    (function(celda, idSan){
      celda.textContent = "Cargando...";
      cargarNombreSanitario(idSan, function(nombre){
        celda.textContent = nombre;
      });
    })(fila.insertCell(0), r.sanitario);

    fila.insertCell(1).textContent = r.horas_estimadas;
    fila.insertCell(2).textContent = formatearFecha(r.fecha_peticion);
    fila.insertCell(3).textContent = formatearFecha(r.fecha_inicio);
    fila.insertCell(4).textContent = formatearFecha(r.fecha_fin);
  }
}

function pintarResenyas(resenyas) {
  var tbody = document.getElementById("tablaResenyas").getElementsByTagName("tbody")[0];
  tbody.innerHTML = "";

  for (var i = 0; i < resenyas.length; i++) {
    var r = resenyas[i];
    var fila = tbody.insertRow();

    fila.insertCell(0).textContent = formatearFecha(r.fecha);

    (function(celda, idSan){
      celda.textContent = "Cargando...";
      cargarNombreSanitario(idSan, function(nombre){
        celda.textContent = nombre;
      });
    })(fila.insertCell(1), r.sanitario);

    fila.insertCell(2).textContent = r.valor;
    fila.insertCell(3).textContent = r.descripcion;
  }
}




// 8) SANITARIOS (cache + GET)
function cargarNombreSanitario(id, callback) {
  if (sanitarios[id]) {
    callback(sanitarios[id]);
    return;
  }

  rest.get("/api/sanitarios/" + id, function (estado, sanitario) {
    if (estado === 200) {
      var nombre = sanitario.nombre + " " + sanitario.apellidos;
      sanitarios[id] = nombre;
      callback(nombre);
      return;
    }

    callback("Desconocido");
  });
}



function enviarReservas(){
  var reservasFinalizadas= [];

  var pendientes =0;
  var error=false;
  var terminado= false;

  //obtener recursos
  rest.get("/api/recursos", function(estado, recursos){
    if (estado===200){

      if (recursos.length ===0) return; //no hay recursos
      pendientes = recursos.length;

      for (var i=0; i< recursos.length; i++){

        let recurso=recursos[i]; //cada iteracion conserve su propio valor
        let idCategoria= categoriaDeModelo(recurso.modelo);
        let nCategoria = nombreCategoria(idCategoria);

        rest.get("/api/recursos/"+recurso.id+"/reservas", function(estado, reservasRecurso){
          if (estado===200){
            for (var j=0; j < reservasRecurso.length; j++){

              let reservaR=reservasRecurso[j];

              if(reservaR.fecha_inicio !== null && reservaR.fecha_fin !== null){
                //RESERVAS FINALIZADAS
                pendientes++;

                rest.get("/api/sanitarios/"+reservaR.sanitario, function(estado, sanitario){
                  if (estado=== 200){
                    var datosReserva= {
                      "nombre": sanitario.nombre,
                      "apellidos": sanitario.apellidos,
                      "categoria": nCategoria,
                      "horas_estimadas": reservaR.horas_estimadas,
                      "fec_pet": reservaR.fecha_peticion,
                      "fec_ini": reservaR.fecha_inicio,
                      "fecha_fin":reservaR.fecha_fin
                    }

                    reservasFinalizadas.push(datosReserva);

                  } else{
                    error=true;
                    alert("Error al obtener sanitario");
                  }
                  //terminado GET de sanitario
                  pendientes--;
                  comprobarFin();
                });
              }
            }
          } else{
            error=true;
            alert("Error al obtener reservas de un recurso");
          }
          //terminado GET reservas
          pendientes--;
          comprobarFin();
        });
      }
    } else{
      error=true;
      alert("Error obteniendo recursos");
    }
  });


  function comprobarFin(){
    if (pendientes ===0 && terminado === false){
      terminado= true;
      if (error === true){
        alert("Error al obtener alguna reserva");
        return;
      }

      console.log("TODAS RESERVAS FINALIZADAS");
      console.log(reservasFinalizadas);
      console.log(reservasFinalizadas.length);

      var fechaHoy=new Date().toISOString().slice(0, 10);
      var datosEnvio={
        id_area: 10,
        fecha: fechaHoy,
        datos: reservasFinalizadas
      }

      console.log(JSON.stringify(datosEnvio, null, 2));

      fetch("https://undefined.ua.es/telemedicina/api/datos", { //peticion http a un servidor externo, antes teniamos rest.get (funcion del rest.js), esta es una funcion nativa de java
        method: "POST",
        headers: {
          "Content-Type": "application/json" //info adicional, datos del body en formato JSON
          }, body: JSON.stringify(datosEnvio) //envio de datos. Peticion debe enviarse como JSON
      })
      //fetch es asincorono, le esatmos diciendo que cuando haga la peticion HTTP
      .then(function(respuesta) { //cuando reciba la respuesta que ejecute esta funcion

          if (respuesta.ok) {//status 200
              alert("Reservas enviadas correctamente al Ministerio");
          } else {
              alert("Error al enviar reservas. Estado: " + respuesta.status);
          }

      })
      .catch(function(error) { //gestiona errores cuando la rpomesa falla(no conexion, URL o navegador de bloquea la peticon por CORS)
          console.error("Error al conectar con el Ministerio:", error);
          alert("No se ha podido conectar con el Ministerio");
      });
    }
  }

}


function obtenerDatosMinisterio(){
  fetch("https://undefined.ua.es/telemedicina/api/datos", { //peticion http a un servidor externo, antes teniamos rest.get (funcion del rest.js), esta es una funcion nativa de java
    method: "GET"
  })
  .then(function(respuesta){
    if (respuesta.ok){
      return respuesta.json();
    } else{
      throw new Error("Error al obtener datos. Estado: " + respuesta.status);//gestione catch
    }
  })
  .then(function(datos) {//se reciben los datos del ministerio

    var datosValidos=depurar(datos);
    console.log("DATOS DEPURADOS: ", datosValidos);
    var ranking = crearRanking(datosValidos);

    console.log("RANKING FINAL:", ranking);
    mostrarRanking(ranking);

  })
  .catch(function(error) {

    console.error("Error al obtener datos del Ministerio:", error);
    alert("No se han podido obtener los datos del Ministerio");

  });

}
    


function depurar(datos){
  var datosValidos=[]; 

  if (!Array.isArray(datos)){
    return datosValidos;
  }

  for (var i=0; i< datos.length; i++){
    var envio= datos[i];
    
    //comprobar que sea objeto
    if(envio === null || typeof envio !== "object" || Array.isArray(envio)){
      continue;
    }

    //comprobar idArea
    if (!Number.isInteger(envio.id_area) || envio.id_area <1 || envio.id_area > 18){
      continue;
    }

    // Comprobar fecha del envío
    if (!fechaValida(envio.fecha)) {
        continue;
    }

    //comprobar datos sea array
    if(!Array.isArray(envio.datos)){
      continue;
    }


    //COMPROBACION RESERVAS
    var reservasValidas=[];
    for (var j=0; j < envio.datos.length; j++ ){ //recorremos las reservas
      var reserva= envio.datos[j];
      if (reserva === null || typeof reserva != "object" || Array.isArray(reserva)){
        continue;
      }

      //nombre, apellidos, categoria
      if(typeof reserva.nombre !== "string" || reserva.nombre.trim() === ""){
        continue;
      }
      if(typeof reserva.apellidos !== "string" || reserva.apellidos.trim() === ""){
        continue;
      }
      if (typeof reserva.categoria !== "string" || reserva.categoria.trim() === ""){
        continue;
      }

      //horas estimadas
      if( typeof reserva.horas_estimadas !== "number" || !Number.isFinite(reserva.horas_estimadas) || reserva.horas_estimadas <= 0){
        continue;
      }

      // FECHA VALLIDAS
      if(!fechaValida(reserva.fec_pet) || !fechaValida(reserva.fec_ini) || !fechaValida(reserva.fecha_fin)){
        continue;
      }

      // Orden cronológico ->  peticion <= inicio <= fin
      if (new Date(reserva.fec_pet) > new Date(reserva.fec_ini) || new Date(reserva.fec_ini) > new Date(reserva.fecha_fin)) {
          continue;
      }
      //reserva finalizada
      if (reserva.fec_ini == null || reserva.fecha_fin == null){
        continue;
      }

      
      reservasValidas.push(reserva);
    }

    if(reservasValidas.length > 0){
      datosValidos.push({
        id_area: envio.id_area,
        fecha: envio.fecha,
        datos: reservasValidas
      });
    }

  }

  return datosValidos;

}


function fechaValida(fecha) {

    if (typeof fecha !== "string") {
        return false;
    }

    // Aceptar fechas YYYY-MM-DD
    // y fechas ISO con hora
    var formato = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/;
    if (!formato.test(fecha)) {
        return false;
    }

    //controlar horas, min, sec
    if (fecha.includes("T")) { 
      var hora = Number(fecha.substring(11, 13));
      var minutos = Number(fecha.substring(14, 16));
      var segundos = Number(fecha.substring(17, 19));

      if (hora > 23 || minutos > 59 || segundos > 59) {
          return false;
      }
  }

    var fechaConvertida = new Date(fecha);

    if (isNaN(fechaConvertida.getTime())) {
        return false;
    }

    // Comprobar también el día, mes y año del calendario
    var partes = fecha.substring(0, 10).split("-");
    var anio = Number(partes[0]);
    var mes = Number(partes[1]);
    var dia = Number(partes[2]);

    var fechaCalendario = new Date(Date.UTC(anio, mes - 1, dia));

    return fechaCalendario.getUTCFullYear() === anio &&
           fechaCalendario.getUTCMonth() === mes - 1 &&
           fechaCalendario.getUTCDate() === dia;
}



function crearRanking(datosValidos) {
  var contadores = [];

  // Inicializamos las 18 áreas a cero
  for (var i = 1; i <= 18; i++) {
    contadores.push({
    id_area: i,
    total: 0
    });
  }

  // Recorremos los envíos depurados
  for (var j = 0; j < datosValidos.length; j++) {
    var envio = datosValidos[j];

    // Buscamos el contador correspondiente a su área
    for (var k = 0; k < contadores.length; k++) {
      if (contadores[k].id_area === envio.id_area) {
        contadores[k].total += envio.datos.length;
        break;
      }
    }
  }

  // Ordenar de mayor a menor número de reservas
  contadores.sort(function(a, b) {
      return b.total - a.total;
  });
  console.log("RANKING ORDENADO:", contadores);
  return contadores;
}

function mostrarRanking(ranking) {

    var html = "<table border='1'>";
    html += "<tr><th>Posición</th><th>Especialidad</th><th>Reservas</th></tr>";

    var especialidades = [
        "Alergología",
        "Anestesiología",
        "Cardiología",
        "Cirugía General",
        "Dermatología",
        "Aparato Digestivo",
        "Endocrinología",
        "Ginecología",
        "Hematología",
        "Medicina Interna",
        "Neumología",
        "Neurología",
        "Oftalmología",
        "Oncología",
        "Pediatría",
        "Psiquiatría",
        "Traumatología",
        "Urología"
    ];

    for (var i = 0; i < ranking.length; i++) {

        var area = ranking[i];

        html += "<tr>";
        html += "<td>" + (i + 1) + "</td>";
        html += "<td>" + especialidades[area.id_area - 1] + "</td>";
        html += "<td>" + area.total + "</td>";
        html += "</tr>";
    }

    html += "</table>";

    document.getElementById("resultadoRanking").innerHTML = html;
}