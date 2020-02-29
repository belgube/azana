var mysql = require('mysql');
var express = require('express');
var session = require('express-session');
var nodemailer = require("nodemailer");
var flash = require('connect-flash');
var bodyParser = require('body-parser');
var path = require('path');

//Confid database
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'azana'
});
//Confid server socket.io
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
	app.use(flash());
//Config smtp
var transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // upgrade later with STARTTLS
  auth: {
    user: "jimmygube17@gmail.com",
    pass: "contact@belgube.com"
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  }
});
transporter.verify(function(err){
	if(err){
		console.log(err);
	}
})
app.use(express.static(__dirname + '/public'));
app.use(session({
	secret: 'belgube',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.post('/auth', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		connection.query('SELECT * FROM aza_register WHERE email = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) { //si tout est bon alors
				request.session.loggedin = true;
				request.session.username = username;
							//Enregistrement du login
				var verif = {
					'email' : request.body.username,
					'password' : request.body.password,
					'statut' : 'right'
				};
				connection.query("INSERT INTO login set ?", verif, function(error, results,fields){
					if(error){
						response.status(200).render('error.ejs');
					}
				});
				response.redirect('/main'); //Rédirection vers le menu principale
			}else{
				var verif = {
					'email' : request.body.username,
					'password' : request.body.password,
					'statut' : 'false'
				};
				connection.query("INSERT INTO login set ?", verif, function(error, results,fields){
					if(error){
						response.status(200).render('error.ejs');
					}
				});
				response.redirect('/connexion', false, request.flash('a', 1));
			}			
			response.end();
		});
	} else {
		response.render('error.ejs');
		response.end();
	}
});
app.post('/regazana', function(request, response){
	//Verification si l'é-mail existe déjà dans la base de données
	var email = request.body.email;
	var users = {
		'email' : request.body.email,
		'identite' : request.body.identite,
		'password' : request.body.pass,
		'phone' : request.body.phone
	};
	connection.query('SELECT * FROM aza_register WHERE email = ?', [email], function(error, results, fields){
		if (results.length > 0) { //si l'utilisateur existe déjà dans la base de données alors
			var userexist = results[0].email;
			response.redirect('/create-account', false, request.flash('i', userexist));//flash me ppermet à envoyer userexist
		}else{
			connection.query("INSERT INTO aza_register set ?", users, function(error, results,fields){
				//On envoie le mail à l'utilisateur enregistré
				var mailsOptions = {
					from : 'Azana assurance  <jimmygube17@gmail.com>',
					to : request.body.email,
					subject : "Bienvenue chez Azana",
					html : '<p> Bonjour, '+'<br>' + 'Vous venez de vous inscrire dans la première plateforme e-assurance d\'afrique, votre identifiant est : <strong>'+request.body.email+ '</strong> mot de passe : <strong>' +request.body.pass+'</strong></p>'
				};
				transporter.sendMail(mailsOptions, function(error, response){
					if(error){
						console.log("Erreur lors de l'envoie du mail!");
						console.log(error);
					}else{
						console.log("Mail envoyé avec succès!")
					}
					transporter.close();
				});
			});
			response.redirect('/connexion');
		}			
		response.end();
	});
});
app.get('/', function(request,response){
	response.sendFile(path.join(__dirname + '/index.html'));
});
app.get('/connexion/', function(request,response){
	response.status(200).render('connexion-flow.ejs', {a: request.flash('a')});
});
app.get('/create-account', function(request,response){
	//var userexist='';
	response.render('nouveau-compte.ejs', {i: request.flash('i')});
});
app.get('/log-out/', function(request,response){
	if (request.session.loggedin) {
		request.session.loggedin = request.session.destroy;
		response.redirect('/');
	} else {
		response.render('error.ejs');
	}
	response.end();
});
//routes user µ
app.get('/main/', function(request,response){
	if (request.session.loggedin == true) {
		response.status(200).render('main.ejs');
	} else {
		response.redirect('/');
	}
	response.end();
});
		//Formulaire devis auto
app.get('/devis/auto/', function(request,response){
	if (request.session.loggedin == true) {
		response.render('devisauto.ejs');
	} else {
		response.redirect('/');
	}
	response.end();
});
		//Traitement formulaire devis auto
app.post('/dazana', function(request, response){
	if(request.session.loggedin){
		var autodevis = {
			'sexe' : request.body.sexe,
			'email' : request.session.username,
			'username' : request.body.identite,
			'adresse' : request.body.adresse,
			'dateNaiss' : request.body.dateNaiss,
			'marque' : request.body.choix,
			'possession' : request.body.possession
		};
		connection.query("INSERT INTO autodevis set ?", autodevis, function(error, results,fields){
			if(error){
				response.status(200).render('error.ejs');
			}else{
			//On envoie le mail au demandeur de devis
			var mailsOptions = {
				from : 'Azana Assurance <jimmygube17@gmail.com>',
				to : request.body.email,
				subject : "Demande devis assurance",
				html : 'Bonjour, '+'<br>' + 'Bénéficiez des nos forfaits d\'assurance auto en toute simplicité: ',
				attachments: [
					{
					  filename: 'devisauto.pdf'
					}
				]	
			};
			transporter.sendMail(mailsOptions, function(error, response){
				if(error){
					console.log("Erreur lors de l'envoie du devis auto!");
					console.log(error);
				}else{
					console.log("Devis auto envoyé avec succès!")
				}
				transporter.close();
			});
				response.redirect('/main');
			}
		});
	}else{
		response.redirect('/');
	}
});
		//formulaire devis moto
app.get('/devis/moto/', function(request,response){
	if (request.session.loggedin){
		response.render('devismoto.ejs');
	} else {
		response.redirect('/');
	}
	response.end();
});
		//Traitement formulaire devis moto
app.post('/dmazana/', function(request, response){
	if(request.session.loggedin){
		var motodevis = {
			'email' : request.session.username,
			'sexe' : request.body.sexe,
			'username' : request.body.identite,
			'dateNaiss' : request.body.dateNaiss,
			'adresse' : request.body.adresse,
			'marque' : request.body.choix,
			'possession' : request.body.possession
		};
		connection.query("INSERT INTO motodevis set ?", motodevis, function(error, results,fields){
			if(error){
				response.status(200).render('error.ejs');
			}else{
			//On envoie le mail au demandeur de devis
			var mailsOptions = {
				from : 'Azana Assurance <jimmygube17@gmail.com>',
				to : request.body.email,
				subject : "Demande devis assurance",
				html : 'Bonjour, '+'<br>' + 'Bénéficiez des nos forfaits d\'assurance moto en toute simplicité: ',
				attachments: [
					{
					  filePath: 'devismoto.pdf'
					},
				]	
			};
			transporter.sendMail(mailsOptions, function(error, response){
				if(error){
					console.log("Erreur lors de l'envoie du devis moto!");
					console.log(error);
				}else{
					console.log("Devis moto envoyé avec succès!")
				}
				transporter.close();
			});
				response.redirect('/main');
			}
		});
	}else{
		response.redirect('/');
	}
});
		//formulaire devis flat
app.get('/devis/logis/', function(request,response){
	if (request.session.loggedin) {
		response.redirect('/main');
	} else {
		response.redirect('/');
	}
	response.end();
});
		//Traitement formulaire devis flat
app.post('/dflat', function(request, response){
	if(request.session.loggedin){
		
	}else{
		response.redirect('/');
	}
});
app.get('/devis/sante/', function(request,response){
	if (request.session.loggedin) {
		response.redirect('/main');
	} else {
		response.redirect('/');
	}
	response.end();
});
app.get('/live/', function(request,response){
	if (request.session.loggedin) {
		var username = request.session.username;
		response.render('talking.ejs', {s: username});
	}else {
		response.redirect('/');
	}
	response.end();
});
app.post('/chat/', function(request,response){
	if (request.session.loggedin){
		var con_live = {
			username : request.session.username,
			'con_message' : request.body.message,
			'service' : request.body.choix
		};
		connection.query("INSERT INTO con_live set ?", con_live, function(error, results,fields){
			if(error){
				response.status(200).render('error.ejs');
			}else{
				response.render('talking.ejs');
			}
		});
		//post my form chat and redirect to chat's url
	}else{
		response.redirect('/');
	}
	response.end();
});
//routes admin
app.get('/bg-azana/', function(request, response) {
	response.sendFile(path.join(__dirname + '/azadminer.html'));
});
//menu principale admin dashboard
app.get('/bg-dashboard/', function(request, response){
	response.status(200).render('index_dashboard.ejs');
});
app.get('/bg-user/', function(request, response){
	response.status(200).render('user-admin.ejs')
});
app.get('/userlist/', function(request, response){
	response.status(200).render('user-list.ejs');
});
app.get('/list/devisauto/', function(request, response){
	response.status(200).render('listdevisauto.ejs');
});
app.get('/list/devismoto/', function(request, response){
	response.status(200).render('listdevismoto.ejs');
});
app.get('/list-devislogis/', function(request, response){
	response.status(200).render('error.ejs');
});
app.get('/souscription/auto/', function(request, response){
	response.status(200).render('sousauto.ejs');
});
app.get('/souscription/moto/', function(request, response){
	response.status(200).render('sousmoto.ejs');
});
app.get('/souscription/logis/', function(request, response){
	response.status(200).render('souslogis.ejs');
});
app.use(function(request, response, next) {
	response.setHeader('Content-Type', 'text/plain');
	response.redirect('/');
});
io.sockets.on('connection', function(socket){
	//Vérification de la session id console.log(socket.id);
	socket.on('message', function(username){
				//console.log(username);
		connection.query('SELECT * FROM con_live WHERE username = ? ORDER BY id_chat ASC', [username], function(error, results, fields) {	
				if(error){
					console.log(error);
					//response.status(200).render('error.ejs');
				}else{
					for (var i=0; i < results.length; i++){
						var s = results[i].con_message,
							personnel_admin = results[i].con_reponse;
							console.log(s, personnel_admin);
							socket.emit('message', '<strong> Moi :</strong>' +s + '<br>'+ '<strong>Léo :</strong>' +personnel_admin+ '<br>');
							s = '';
					}
				}
		});
	});
});

server.listen(3000, function(){
	console.log('server is running');
});