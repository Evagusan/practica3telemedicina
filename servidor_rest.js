
var express = require("express");
var app = express();
var jwt = require("jwt-simple");
var clave = "miSecretoMasOscuro";


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
var conexion = require("./conexion_mysql.js");
var datos = require("./datos.js"); // trae ubicaciones, categorias, modelos, recursos
var servidor_ws=require("./servidor_ws.js");


app.use("/appCliente", express.static("cliente_rest"));
app.use("/api", function(req, res, next){
  if(req.method === "POST" && (req.path === "/gestores/login" || req.path ==="/gestores")) { //aqui accede sin token para el login y registros
    return next();
  }

  verificarToken(req, res, next);
});




// GET /api/ubicaciones
app.get("/api/ubicaciones", function (req, res) {

  var sql="SELECT * FROM ubicaciones";//selecionar todas las columnas de la tabla ubicaciones
  conexion.query(sql, function (err, ubicaciones) {//ejecuta consulta en sql a mysql -> cuando acabe hace la funcion
    if (err) {                      //busca las filas en esa tabla
      console.log("Error al realizar select", err);
      res.status(500).json("Error al realizar select");
    } else{
      console.log("Ubicaciones: ",ubicaciones);
      res.status(200).json(ubicaciones);
    }
  });
});


app.get("/api/categorias", function (req, res) {

  var sql="SELECT * FROM categorias";
  conexion.query(sql, function(err, categorias){
    if (err){
      console.log("Error al realizar select", err);
      res.status(500).json("Error al realizar select");
    } else{
        res.status(200).json(categorias);
    }
  });
});




// GET /api/modelos
app.get("/api/modelos", function (req, res) {
  var sql="SELECT * FROM modelos";
  conexion.query(sql, function(err, modelos){
    if (err){
      res.status(500).json("Error select modelos");
    } else{
      res.status(200).json(modelos);
    }
  });
});


// GET /api/recursos (sin filtros todavía)
app.get("/api/recursos", function(req, res) {

  var categoria= req.query.categoria; //posibles filtros
  var modelo = req.query.modelo;
  var ubicacion = req.query.ubicacion;
  var estado= req.query.estado;
  var num_serie=req.query.numero_serie;
           

          //devuelve                           WHERE donde lo busca
  var sql="SELECT recursos.* FROM recursos"; //inicial sin filtros

  //si hay filtro categoria hay que añadir la tabla de modelo al sql
  if (categoria!=undefined) {
    sql+=" INNER JOIN modelos ON recursos.modelo = modelos.id"; //añade tabla mdoelo y su relacion
  } //RELACIONA CUANDO EL CAMPO MODELO DEL RECURSO COINCIDE CON EL ID DEL MODELO

  //al no saber cuanto filtros hay y cual es el primero
  sql+= " WHERE 1=1"; //true y ya puedes poner los filtros añadidos con AND
  //CONDICION QUE FAVORECE A la dinamica de los filtros

  //filtros
  if (modelo!=undefined){
    sql+=" AND recursos.modelo = "+ modelo;
  }

  if (ubicacion!=undefined){
    sql+=" AND recursos.ubicacion = "+ubicacion;
  }

  if (estado !=undefined){
    sql+=" AND recursos.estado = "+estado;
  }

  if (categoria != undefined){
    sql+=" AND modelos.categoria = "+categoria;
  }

  conexion.query(sql, function(err, recursos){
    if (err){
      res.status(500).json("Error en select");
    } else{
      res.status(200).json(recursos);
    }
  });
});




app.get("/api/recursos/:id", function (req, res) {
  var id= req.params.id;

  var sql = "SELECT * FROM recursos WHERE recursos.id = "+id;//devuelve filas filas dentro de un array

  conexion.query(sql, function(err, recurso){
    if (err){
      res.status(500).json("Error en select idRecurso");
    } else{
        if (recurso.length==1){
          res.status(200).json(recurso[0]);
        } else{
          res.status(404).json("Recurso no encontrado");
        }
    }
  });
});


app.post("/api/recursos", function(req, res) {
  var nuevo= {
    modelo: Number(req.body.modelo),
    ubicacion: Number(req.body.ubicacion),
    numero_serie: req.body.numero_serie,
    estado: Number(req.body.estado)
  };
  
  var sql= "INSERT INTO recursos (modelo, ubicacion, numero_serie, estado) VALUES ("
        +nuevo.modelo +", " 
        +nuevo.ubicacion+", '" 
        +nuevo.numero_serie+"', "   //'' al ser string el numeroserie
        +nuevo.estado+")";
  
  conexion.query(sql, function(err, resultado){
    if (err){
      res.status(500).json("Error en INSERT")
    } else{
      servidor_ws.avisoRecurso(resultado.insertId, req.body.origen);// INSERTAR UN RECURSO
      res.status(201).json("Recurso creado");
    }
  })
});

//cuando se prueba este post en postman, se carga el nuevo recurso en memoria, pero no en 
// memoria RAM, en el archivo (no aparece en datos.js)

app.put("/api/recursos/:id", function(req, res) {
  var id=req.params.id;
  var sql = "UPDATE recursos SET modelo = "
  +Number(req.body.modelo) + ", ubicacion = "
  +Number(req.body.ubicacion)+", numero_serie = '"
  +req.body.numero_serie+"' ,estado = "
  +Number(req.body.estado) 
  + " WHERE recursos.id = "+ id;

  conexion.query(sql, function(err, resultado) {

    if (err) {
      res.status(500).json("Error en UPDATE");
    } else {
      res.status(200).json("Recurso actualizado");
    }

  });

});

app.delete("/api/recursos/:id", function(req, res) {

  var id = req.params.id;

  var sql = "DELETE FROM recursos WHERE id = " + id;

  conexion.query(sql, function(err, resultado) {

    if (err) {
      res.status(500).json("Error en DELETE");
    } else {
      if (resultado.affectedRows == 0) {
        res.status(404).json("Recurso no encontrado");
      } else {
        res.status(200).json("Recurso borrado");
      }
    }

  });

});

//GESTORES
//LOGIN (contraseña)
app.post("/api/gestores/login", function (req, res) {
  var login = req.body.login;// provienen del cliente (request)
  var password = req.body.password;

  var sql=" SELECT * FROM gestores WHERE usuario = ? AND password = ?";
  conexion.query(sql, [login, password], function(err, gestor){
    if (err){
      res.status(500).json("Error en SELECT login");
    } else{
      if (gestor.length==1){
        //crear token para gestor autentificado
        var contenido= {
          usuario: gestor[0].id,
          expira: Date.now() + 60 * 60 * 1000
        }
        var token= jwt.encode(contenido, clave);
        //Devolver identificador y token
        res.status(200).json({
          id:gestor[0].id,
          token: token
        });
      
      } else{
        res.status(403).json("login incorrecto")
      }
    }
  });

});


//REGISTRO (crea gestores)
app.post("/api/gestores", function (req, res) {
  var usuario = req.body.usuario;
  //comporbar que no existe el ususario
  var sql=" SELECT * FROM gestores WHERE usuario ='"+usuario+"'";

  conexion.query(sql, function(err, gestores){
    if (err){
      res.status(500).json("Error en SELECT");
    } else{
      if (gestores.length==0){
        var nuevo = {
          nombre: req.body.nombre,
          apellidos: req.body.apellidos,
          usuario:req.body.usuario,
          password: req.body.password
        }
        var sqlINSERT="INSERT INTO gestores (nombre, apellidos, usuario, password) VALUES ('"
        +nuevo.nombre+"', '"
        +nuevo.apellidos+"', '"
        +nuevo.usuario+"', '"
        +nuevo.password+"')";

        conexion.query(sqlINSERT, function(err, resultado){
          if (err){
            res.status(500).json("error en INSERT");
          } else{
            res.status(201).json("gestor creado");
          }
        });
      } else {
      res.status(400).json("Usuario ya existente");
    }
    }
    
  });

})



//obtener datos de gestor
app.get("/api/gestores/:id", function(req, res) {
  var id = req.params.id; // se usa params y no body, porque es un GET, y este indetifica el recurso

  var sql="SELECT id, nombre, apellidos, usuario FROM gestores WHERE id="+id;
  conexion.query(sql, function(err, gestores){
    if (err){
      res.status(500).json("Error en SELECT");
    } else{
      if (gestores.length==1){
        res.status(200).json(gestores[0])

      } else{
        res.status(404).json("Gestor no existente");
      }

    }
  });
})


// actualizar gestor
app.put("/api/gestores/:id", function(req,res) {
  var id = req.params.id; // ver si existe
  var usuario= req.body.usuario;

  var sql="SELECT id, usuario FROM gestores WHERE id="+id;
  conexion.query(sql, function(err, gestores){
    if(err){
      res.status(500).json("Error en SELECT");
    } else{
      if (gestores.length==0){
        res.status(404).json("Gestor no existente");
      } else{
        var sqlSELECT = "SELECT * FROM gestores WHERE usuario ='"+usuario+"' AND id != "+id;
        conexion.query(sqlSELECT, function(err, gestores){
          if (err){
            res.status(500).json("Error en SELECT");
          } else {
            if ( gestores.length >= 1){
              res.status(400).json("Usuario ya existente");
            } else{
                var sqlUPDATE="UPDATE gestores SET nombre='"
                +req.body.nombre+"', apellidos= '"
                +req.body.apellidos+"', usuario ='"
                +req.body.usuario+"',password='"
                +req.body.password+"' WHERE id="+id;

                conexion.query(sqlUPDATE, function(err, resultado){
                  if (err) {
                    res.status(500).json("Error en UPDATE");
                  } else{
                    res.status(200).json("Gestor actualizado");
                  }
                })
            }
          }
        })

        

        
      }
    }
  })

});

//Buscar sanitario de la reserva
app.get("/api/sanitarios/:id", function(req, res) {
  var id=req.params.id;

  var sql="SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id="+id;
  conexion.query(sql, function(err, sanitarios){
    if (err) res.status(500).json("Error en SELECT");
    else {
      if (sanitarios.length==1){
        res.status(200).json(sanitarios[0]);
      } else{
        res.status(404).json("Sanitario no existente");
      }
    }
  })
});

// GET /api/recursos/:id/reservas
// puede haber varias reservas de un mismo recurso, por eso hay que filtrar
app.get("/api/recursos/:id/reservas", function (req, res) {

  var id = req.params.id; // id del recurso , queremos ver la reserva
  var sql = "SELECT * FROM recursos WHERE id="+id;

  conexion.query(sql, function(err, recursos){
    if (err) res.status(500).json("Error en SELECT")
    else{
      if (recursos.length==1){
        var sqlSELECT="SELECT * FROM reservas WHERE recurso="+id;
        conexion.query(sqlSELECT, function(err, recursos){
          if (err) res.status(500).json("Error en SELECT")
          else{
            res.status(200).json(recursos);
        }
        })
      } else res.status(404).json("Recurso no encotrado");
    }
  })
});



// GET /api/recursos/:id/resenyas
app.get("/api/recursos/:id/resenyas", function (req, res) {
  var id = req.params.id;

  var sql = "SELECT * FROM recursos WHERE id=" + id;

  conexion.query(sql, function(err, recursos){
    if (err) {
      res.status(500).json("Error en SELECT");
    } else {
      if (recursos.length == 1){
        // obtener todas las reseñas de ese recurso
        var sqlSELECT = "SELECT * FROM resenyas WHERE recurso=" + id;
        conexion.query(sqlSELECT, function(err, resenyas){
          if (err) {
            res.status(500).json("Error en SELECT");
          } else {
            res.status(200).json(resenyas);
          }
        });

      } else {
        res.status(404).json("Recurso no encontrado");
      }
    }

  });

});


app.listen(3001)
