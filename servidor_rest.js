
var express = require("express");
var app = express();
var jwt = require("jwt-simple");
var clave = "miSecretoMasOscuro";
//conexion con supabase
const{createClient}= require("@supabase/supabase-js");

const supabaseUrl = "https://vdqxcsfeogsijajtibbj.supabase.co";
const supabaseKey ="sb_publishable_imZz9KPEdhIlP-7hxxAAsA_fknTxGuQ";

const supabase = createClient(supabaseUrl, supabaseKey);

function verificarToken(req, res, next){
  //obtener token  de la URL
  var token= req.query.token; 

  //comrpobacion se ha enviado el token
  if (!token) {
    res.status(301).json("Nose ha encontrado token");
    return;
  }
  //Decodificar token 
  try{
    //verificar que el token sea valido
    var contenidoToken = jwt.decode(token, clave);

  } catch(error){
    return res.status(301).json("Token incorrecto");
  }

  console.log("El contenido del token es: ", contenidoToken);
  // Validar contenido del token
  if (!contenidoToken || !contenidoToken.expira || !contenidoToken.usuario) {
    res.status(301).json("El formato del token no es adecuado");
    return;
  }

  // Comprobar caducidad
  if (contenidoToken.expira < Date.now()) {
    res.status(301).json("El token ha expirado");
    return;
  }

  // Continuar con la petición
  next();
}


app.use(express.json());
// super importante!!! cuando nos llega una request, ya sea del cliente, o probando en el POSTMAN, ponemos por ejmeplo
//para post, un gestor en el body, pues esta linea convierte ese json en un objeto JS, sino no sería legible
//dentro de req tenemos: 
// req.body -> datos enviado en POST/PUT
// req.query -> filtros de la url (?estado=0)
// req.params -> parametros de la ruta (/recursos/:id)
// headers -> info técnica

//var conexion = require("./conexion_mysql.js");
//var datos = require("./datos.js"); // trae ubicaciones, categorias, modelos, recursos
//var servidor_ws=require("./servidor_ws.js");


app.use("/appCliente", express.static("cliente_rest"));
app.use("/api", function(req, res, next){
  if(req.method === "POST" && (req.path === "/gestores/login" || req.path ==="/gestores")) { //aqui accede sin token para el login y registros
    return next();
  }

  verificarToken(req, res, next);
});




// GET /api/ubicaciones
app.get("/api/ubicaciones", async function (req, res) {
  try {
    const{ data: ubicaciones, error } =await supabase.from("ubicaciones").select("*");
    if (error){
      console.log("Error al realizar select", error);
      return res.status(500).json("Error al realizar select");
    }
    console.log("Ubicaciones: ", ubicaciones);
    res.status(200).json(ubicaciones);
  } catch(error){
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});


app.get("/api/categorias", async function (req, res) {
  try{
    const {data: categorias, error} = await supabase.from("categorias").select("*");
    if (error){
      console.log("Error al realizar select", error);
      return res.status(500).json("Error al realizar select");
    }
    res. status(200).json(categorias);
  } catch(error){
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion son supabase");
  }
});




 // GET /api/modelos
app.get("/api/modelos", async function (req, res) {
  try {
    const { data: modelos, error } = await supabase.from("modelos").select("*");

    if (error) {
      console.log("Error select modelos", error);
      return res.status(500).json("Error select modelos");
    }

    res.status(200).json(modelos);

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});


// GET /api/recursos (sin filtros todavía)
app.get("/api/recursos", async function(req, res) {

  var categoria = req.query.categoria; //posibles filtros
  var modelo = req.query.modelo;
  var ubicacion = req.query.ubicacion;
  var estado = req.query.estado;
  var num_serie = req.query.numero_serie;

  try {

    //devuelve                           WHERE donde lo busca
    var consulta = supabase.from("recursos").select("*"); //inicial sin filtros

    //si hay filtro categoria hay que añadir la tabla de modelo al sql
    //RELACIONA CUANDO EL CAMPO MODELO DEL RECURSO COINCIDE CON EL ID DEL MODELO

    if (categoria != undefined) {

      // Obtenemos los modelos que pertenecen a esa categoria
      const { data: modelosCategoria, error: errorModelos } = await supabase
        .from("modelos")
        .select("id")
        .eq("categoria", categoria);

      if (errorModelos) {
        console.log("Error obteniendo modelos", errorModelos);
        return res.status(500).json("Error en select");
      }

      var idsModelos = modelosCategoria.map(function(m) {
        return m.id;
      });

      // Si no hay modelos de esa categoria, no hay recursos
      if (idsModelos.length === 0) {
        return res.status(200).json([]);
      }

      consulta = consulta.in("modelo", idsModelos);
    }

    //al no saber cuanto filtros hay y cual es el primero
    //En Supabase podemos encadenar filtros directamente,
    //sin necesitar WHERE 1=1
    //CONDICION QUE FAVORECE A la dinamica de los filtros

    //filtros
    if (modelo != undefined) {
      consulta = consulta.eq("modelo", modelo);
    }

    if (ubicacion != undefined) {
      consulta = consulta.eq("ubicacion", ubicacion);
    }

    if (estado != undefined) {
      consulta = consulta.eq("estado", estado);
    }

    //El filtro categoria ya se ha aplicado utilizando los modelos

    const { data: recursos, error } = await consulta;

    if (error) {
      console.log("Error en select", error);
      return res.status(500).json("Error en select");
    }

    res.status(200).json(recursos);

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});




app.get("/api/recursos/:id", async function (req, res) {
  var id = req.params.id;

  try {

    //devuelve filas filas dentro de un array
    const { data: recurso, error } = await supabase
      .from("recursos")
      .select("*")
      .eq("id", id);

    if (error) {
      console.log("Error en select idRecurso", error);
      return res.status(500).json("Error en select idRecurso");
    }

    if (recurso.length == 1) {
      res.status(200).json(recurso[0]);
    } else {
      res.status(404).json("Recurso no encontrado");
    }

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});




app.post("/api/recursos", async function(req, res) {
  var nuevo = {
    modelo: Number(req.body.modelo),
    ubicacion: Number(req.body.ubicacion),
    numero_serie: req.body.numero_serie,
    estado: Number(req.body.estado)
  };

  try {

    //INSERTAR UN RECURSO
    //Antes se construia una sentencia SQL con VALUES
    //'' al ser string el numeroserie
    //Ahora Supabase recibe directamente el objeto nuevo

    const { data: resultado, error } = await supabase
      .from("recursos")
      .insert(nuevo)
      .select("id")
      .single();

    if (error) {
      console.log("Error en INSERT", error);
      return res.status(500).json("Error en INSERT");
    }

    //servidor_ws.avisoRecurso(resultado.id, req.body.origen);// INSERTAR UN RECURSO
    res.status(201).json("Recurso creado");

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});

//cuando se prueba este post en postman, se carga el nuevo recurso en memoria, pero no en
// memoria RAM, en el archivo (no aparece en datos.js)




app.put("/api/recursos/:id", async function(req, res) {
  var id = req.params.id;

  var cambios = {
    modelo: Number(req.body.modelo),
    ubicacion: Number(req.body.ubicacion),
    numero_serie: req.body.numero_serie,
    estado: Number(req.body.estado)
  };

  try {

    const { data: resultado, error } = await supabase
      .from("recursos")
      .update(cambios)
      .eq("id", id)
      .select("id");

    if (error) {
      console.log("Error en UPDATE", error);
      return res.status(500).json("Error en UPDATE");
    }

    res.status(200).json("Recurso actualizado");

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});




app.delete("/api/recursos/:id", async function(req, res) {

  var id = req.params.id;

  try {

    const { data: resultado, error } = await supabase
      .from("recursos")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      console.log("Error en DELETE", error);
      return res.status(500).json("Error en DELETE");
    }

    if (resultado.length == 0) {
      res.status(404).json("Recurso no encontrado");
    } else {
      res.status(200).json("Recurso borrado");
    }

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});


 //GESTORES
//LOGIN (contraseña)
app.post("/api/gestores/login", async function (req, res) {
  var login = req.body.login; // provienen del cliente (request)
  var password = req.body.password;

  try {
    const { data: gestor, error } = await supabase
      .from("gestores")
      .select("*")
      .eq("usuario", login)
      .eq("password", password);

    if (error) {
      console.log("Error en SELECT login", error);
      return res.status(500).json("Error en SELECT login");
    }

    if (gestor.length == 1) {
      //crear token para gestor autentificado
      var contenido = {
        usuario: gestor[0].id,
        expira: Date.now() + 60 * 60 * 1000
      };

      var token = jwt.encode(contenido, clave);

      //Devolver identificador y token
      res.status(200).json({
        id: gestor[0].id,
        token: token
      });

    } else {
      res.status(403).json("login incorrecto");
    }

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});


//REGISTRO (crea gestores)
app.post("/api/gestores", async function (req, res) {
  var usuario = req.body.usuario;

  try {
    //comporbar que no existe el ususario
    const { data: gestores, error } = await supabase
      .from("gestores")
      .select("*")
      .eq("usuario", usuario);

    if (error) {
      console.log("Error en SELECT", error);
      return res.status(500).json("Error en SELECT");
    }

    if (gestores.length == 0) {

      var nuevo = {
        nombre: req.body.nombre,
        apellidos: req.body.apellidos,
        usuario: req.body.usuario,
        password: req.body.password
      };

      const { error: errorInsert } = await supabase
        .from("gestores")
        .insert(nuevo);

      if (errorInsert) {
        console.log("Error en INSERT", errorInsert);
        return res.status(500).json("error en INSERT");
      }

      res.status(201).json("gestor creado");

    } else {
      res.status(400).json("Usuario ya existente");
    }

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});



//obtener datos de gestor
app.get("/api/gestores/:id", async function(req, res) {
  var id = req.params.id; // se usa params y no body, porque es un GET, y este indetifica el recurso

  try {
    const { data: gestores, error } = await supabase
      .from("gestores")
      .select("id, nombre, apellidos, usuario")
      .eq("id", id);

    if (error) {
      console.log("Error en SELECT", error);
      return res.status(500).json("Error en SELECT");
    }

    if (gestores.length == 1) {
      res.status(200).json(gestores[0]);

    } else {
      res.status(404).json("Gestor no existente");
    }

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});


// actualizar gestor
app.put("/api/gestores/:id", async function(req, res) {
  var id = req.params.id; // ver si existe
  var usuario = req.body.usuario;

  try {
    const { data: gestores, error } = await supabase
      .from("gestores")
      .select("id, usuario")
      .eq("id", id);

    if (error) {
      console.log("Error en SELECT", error);
      return res.status(500).json("Error en SELECT");
    }

    if (gestores.length == 0) {
      return res.status(404).json("Gestor no existente");
    }

    // Comprobar si otro gestor ya utiliza ese usuario
    const { data: otrosGestores, error: errorSelect } = await supabase
      .from("gestores")
      .select("*")
      .eq("usuario", usuario)
      .neq("id", id);

    if (errorSelect) {
      console.log("Error en SELECT", errorSelect);
      return res.status(500).json("Error en SELECT");
    }

    if (otrosGestores.length >= 1) {
      return res.status(400).json("Usuario ya existente");
    }

    var cambios = {
      nombre: req.body.nombre,
      apellidos: req.body.apellidos,
      usuario: req.body.usuario,
      password: req.body.password
    };

    const { error: errorUpdate } = await supabase
      .from("gestores")
      .update(cambios)
      .eq("id", id);

    if (errorUpdate) {
      console.log("Error en UPDATE", errorUpdate);
      return res.status(500).json("Error en UPDATE");
    }

    res.status(200).json("Gestor actualizado");

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});


//Buscar sanitario de la reserva
app.get("/api/sanitarios/:id", async function(req, res) {
  var id = req.params.id;

  try {
    const { data: sanitarios, error } = await supabase
      .from("sanitarios")
      .select("id, nombre, apellidos, usuario")
      .eq("id", id);

    if (error) {
      console.log("Error en SELECT", error);
      return res.status(500).json("Error en SELECT");
    }

    if (sanitarios.length == 1) {
      res.status(200).json(sanitarios[0]);
    } else {
      res.status(404).json("Sanitario no existente");
    }

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});


// GET /api/recursos/:id/reservas
// puede haber varias reservas de un mismo recurso, por eso hay que filtrar
app.get("/api/recursos/:id/reservas", async function (req, res) {

  var id = req.params.id; // id del recurso , queremos ver la reserva

  try {
    // Primero comprobamos si existe el recurso
    const { data: recursos, error } = await supabase
      .from("recursos")
      .select("id")
      .eq("id", id);

    if (error) {
      console.log("Error en SELECT", error);
      return res.status(500).json("Error en SELECT");
    }

    if (recursos.length == 1) {

      // Obtener las reservas de ese recurso
      const { data: reservas, error: errorReservas } = await supabase
        .from("reservas")
        .select("*")
        .eq("recurso", id);

      if (errorReservas) {
        console.log("Error en SELECT", errorReservas);
        return res.status(500).json("Error en SELECT");
      }

      res.status(200).json(reservas);

    } else {
      res.status(404).json("Recurso no encotrado");
    }

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});



// GET /api/recursos/:id/resenyas
app.get("/api/recursos/:id/resenyas", async function (req, res) {
  var id = req.params.id;

  try {
    const { data: recursos, error } = await supabase
      .from("recursos")
      .select("id")
      .eq("id", id);

    if (error) {
      console.log("Error en SELECT", error);
      return res.status(500).json("Error en SELECT");
    }

    if (recursos.length == 1) {
      // obtener todas las reseñas de ese recurso
      const { data: resenyas, error: errorResenyas } = await supabase
        .from("resenyas")
        .select("*")
        .eq("recurso", id);

      if (errorResenyas) {
        console.log("Error en SELECT", errorResenyas);
        return res.status(500).json("Error en SELECT");
      }

      res.status(200).json(resenyas);

    } else {
      res.status(404).json("Recurso no encontrado");
    }

  } catch(error) {
    console.log("Error de conexion con supabase", error);
    res.status(500).json("Error de conexion con supabase");
  }
});


app.listen(3001);
