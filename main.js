/* */
const http=require('http');
const url=require('url');
const fs=require('fs');
const querystring=require('querystring');
const mysql=require('mysql');
const formidable=require('formidable');
const path=require('path');
const AWS=require('aws-sdk');
const mime = {
   'html' : 'text/html',
   'css'  : 'text/css',
   'jpg'  : 'image/jpg',
   'ico'  : 'image/x-icon',
   'mp3'  : 'audio/mpeg3',
   'mp4'  : 'video/mp4',
   'png'  : 'image/png'
};


AWS.config.update({region:'us-east-1'});
s3=new AWS.S3({apiVersion:'2006-03-01'});
const bucket=process.env.bucket;

const connection=mysql.createConnection({
  host:process.env.dbhost,
  port:process.env.port,
  user:process.env.user,
  password:process.env.pass,
  database:process.env.dbname
});

connection.connect(function(error) {
        if(error){
        console.error('Connetion Problem '+error.stack);
        return;
      }
      console.log('connected as id '+connection.threadId);
});


const server=http.createServer(function(request,response){
  const objecturl=url.parse(request.url);
  var camino='public'+objecturl.pathname;
  if(camino=='public/')
  camino='public/index.html';
  encaminar(request,response,camino);
});

server.listen(3000)

function encaminar(request,response,camino) {

    switch (camino) {
      case 'public/listOb':{
      listOb(response);
        break;
      }
      case 'public/updateOb':{
        updateOb(request,response);
        break;
      }
      case 'public/uploadOb':{
        uploadOb(request,response);
        break;
      }
      case 'public/deleteOb':{
        deleteOb(request,response);
        break;
      }
      default:{
        fs.exists(camino,function(existe){
          if(existe){
            fs.readFile(camino,function(error,contenido){
              if(error){
                response.writeHead(500,{'Content-Type':'text/plain'});
                response.write('Internal ERROR');
                response.end();

              }
              else{
                var vec=camino.split('.');
                var extension=vec[vec.length-1];
                var mimearchivo=mime[extension];
                response.writeHead(200,{'Content-Type':mimearchivo});
                response.write(contenido);
                response.end();
              }
            });
          }
          else{
              response.writeHead(404,{'Content-Type':'text/plain'});
	      response.write('PAGE NOT FOUND');
              response.write('<!doctype html><html><head></head><body>Recurso inexistente</body></html>');
              response.end();

            }
       });
    }
  }
}

function listOb(response){
  connection.query('SELECT object,name,email,description,itemtype FROM bucket',function(error,filas) {
  if (error) {
    console.log('Error en el listado',error);
    return;
  }

  var readParams = {Bucket:bucket};
  s3.listObjects(readParams, function(err,data){
	if (err) {
		console.log("READ ERROR",err);
		return;
	}
	else {
		console.log("READ SUCCESS");
		infor=data;
		console.log(infor);

  var listob='';
  for (var g=0;g<data.length;g++){
	listob+='Key: '+infor[g].Key+'<br>';
	listob+='LastModified: '+infor[g].LastModified+'<br>';
	listob+='ETag: '+infor[g].ETag+'<br>';
	listob+='Size: '+infor[g].Size+'<br>';
	listob+='StorageClass: '+infor[g].StorageClass+'<br>';
	listob+='Owner: '+infor[g].Owner+'<hr>';
	}
	console.log(listob);
	response.writeHead(200,{'Content.Type':'text/html'});
	response.write('<!doctype html><html><head></head><body>');
	response.write(listob);
	response.write('<a href="index.html">Retornar</a>');
	response.write('</body></html>');
	response.end();
	}
});

/*  response.writeHead(200, {'Content-Type':'text/html'});
  var datos='';
  for(var f=0;f<filas.length;f++){
    datos+='Object: '+filas[f].object+'<br>';
    datos+='Name: '+filas[f].name+'<br>';
    datos+='E-mail: '+filas[f].email+'<br>';
    datos+='Description: '+filas[f].description+'<br>';
    datos+='Image Type: '+filas[f].itemtype+'<hr>';
  }
  response.write('<!doctype html><html><head></head><body>');
  response.write(datos);
  response.write('</body></html>');
/*  response.end();*/
});
}



function uploadOb(request,response){


  var entrada=new formidable.IncomingForm();
  entrada.uploadDir='temp';
  entrada.parse(request);

  var fields=[];
  entrada.on('field', function(field,value){
	fields[field]=value;
  });

  var ruta='';
  var obname='';
  entrada.on('fileBegin',function(field,file){
        file.path='./temp/'+file.name;
	ruta=file.path;
	obname=file.name;
  });

/*  var info='';
  entrada.on('data',function(datosparciales){
    info += datosparciales;
	console.log(info);
  });*/

  entrada.on('end',function(){
    var form = querystring.parse(fields);
    var vec = obname.split('.');
    var extension=vec[vec.length-1];
    var locat='';

    var registro={
      object:obname,
      name:fields.name,
      email:fields.email,
      description:fields.description,
      itemtype:extension
    };
	var file="./temp/"+registro.object;
    	var uploadParams={Bucket:bucket,Key:'',Body:''};
    	var fileStream=fs.createReadStream(ruta);
    	fileStream.on('FileStream Error',function(err){
		console.log("File Error",err);
    	});

    	uploadParams.Body=fileStream;
    	uploadParams.Key=path.basename(ruta);

    	s3.upload(uploadParams,function(err,data){
		if(err){
			console.log("UPLOAD ERROR",err);
			return;
		}
		if(data){
			console.log("Upload Success",data.Location);
			locat=data.location;
			console.log(locat);
			return;
		}
    	});

      connection.query('insert into bucket set ?',registro, function(error,resultado){
      if (error){
        console.log("INSERT ERROR",error);
        return;
      	}
      });

	response.writeHead(200,{'Content-Type':'text/html'});
	response.write('<!doctype html><html><head></head><body>');
	response.write("File upload successfully<br>");
	response.write(locat);
	response.write('<br><a href="index.html">Return</a></body></html>');
	response.end();

  });

}


function deleteOb(request,response){
  var info='';
  request.on('data',function(datosparciales){
    info += datosparciales;
  });

  request.on('end',function(){
    var form =querystring.parse(info);
    var registro=form["object"];


    var deleteParams = {Bucket:bucket,Key:registro};

    s3.deleteObject(deleteParams,function(err,data){
      if (err){
        console.log("Delete Object Error", err);
	return;
      }
      if (data){
        console.log("Delete FROM Bucket Success");
      }
    });



    connection.query( `DELETE FROM bucket WHERE object = ?`,registro, function(error,resultado){
      if (error){
        console.log("Delete DATA ERROR",error);
        return;
      }
    });
    response.writeHead(200, {'Content-Type':'text/html'});
    response.write(`<!doctype html><html><head></head><body>
      Object deleted successfully<br><a href="index.html">Return</a></body></html>`);
    response.end();
  });
}




console.log('Servidor Web Iniciado');
