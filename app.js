const express = require('express');
const app = express();
const dotenv = require('dotenv').config();
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const randToken = require('rand-token');
const nodemailer = require('nodemailer');


const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');



// IMPORT MODELS
const User = require('./models/user');
const Reset = require('./models/reset');
const Receipe = require('./models/receipe');
const Favourite = require('./models/favourite');
const Ingredient = require('./models/ingredient');
const Schedule = require('./models/schedule');

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:false}));



// SESSION
app.use(session({
    secret : "mysecret",
    resave : false,
    saveUninitialized : false
}));



app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://jldev:jldev51@cluster0.wd4ds.mongodb.net/cooking?retryWrites=true&w=majority",{
                    useNewUrlParser: true, useUnifiedTopology: true
                });

// STRATEGY
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(flash());
app.use(methodOverride('_method'));
app.use((req,res,next) => {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();

});


app.get("/", (req,res) => {
    
    res.render("index");
});

app.get("/signup", (req,res) => {
    res.render("signup");
});


app.post("/signup", (req,res) => {
    const newUser = new User({
        username : req.body.username
    });
    User.register(newUser, req.body.password, (err,user) => {
        if(err){
            console.log(err);
            res.render("signup");
        }else{
            passport.authenticate("local")(req,res, ()  => {
                res.redirect("signup");
            });
        }
    });
});



    /*const saltRounds = 10;
    bcrypt.hash(req.body.password,saltRounds, (err, hash) => {
        const user = {
                username : req.body.username,
                password : hash
            }
            User.create(user, (err) => {
                if(err){
                    console.log(err);
                }else{
                    res.render('index');
                }
            });
    });*/
   

app.get("/login", (req,res) => {
    res.render("login");
});

app.get("/dashboard",isLoggedIn, (req,res) => {
    console.log(req.user);
    res.render("dashboard");
});

app.post("/login", function (req,res) {
    
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.logIn(user, function(err) {
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res, function(){
                req.flash("success","Bienvenue");
                res.redirect("/dashboard");
            });
        }
    });
    

    
}); 

/*User.findOne({username : req.body.username}, (err,foundUser) => {
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                bcrypt.compare(req.body.password,foundUser.password, (err,result) => {
                    if(result==true){
                        console.log("PWD OK");
                        res.render("index");
                    }else{
                        console.log("PWD Mauvais");
                        res.render("index");
                    }
                });
            }else{
                console.log("User inconnue");
            }
            
        }
    });*/

app.get("/logout", (req,res) => {
    req.logout();
    req.flash("success","Merci !, Vous êtes deconnectés");
    res.redirect("/login");
});

app.get("/forgot", (req,res) => {
    res.render("forgot");
});

app.post("/forgot", (req,res) => {
    User.findOne({username : req.body.username}, (err,userFound) => {
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            const token = randToken.generate(16);
            Reset.create({
                username: userFound.username,
                resetPasswordToken: token,
                resetPasswordExpires: Date.now() + 3600000

            });
            const transporter =  nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'jerome.devinfotest@gmail.com',
                    pass: 'process.env.PWD'
                }
            });
            const mailOptions = {
                from: 'jerome.devinfotest@gmail.com',
                to: req.body.username,
                subject: 'Lien RAZ password',
                text: 'Click on the link to reset your password: http://localhost:3000/reset/'+token
            }
        
        console.log("Le mail est pret !!!");
            transporter.sendMail(mailOptions, function(err,response) {
                if(err){
                    console.log(err);
                }else{
                    res.redirect('/login');
                }
            });
        }
    });
});

app.get("/reset/:token", (req,res) => {
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {$gt: Date.now()}
    },function(err,obj){
        if(err){
            console.log("Token expired");
            req.flash("error","token expired");
            res.redirect("/login");
        }else{
            res.render("reset", {
                token: req.params.token
            });

        }
    
    });
});



app.post("/reset/:token", (req,res) => {
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {$gt: Date.now()}
    },function(err,obj){
        if(err){
            console.log("Token expired");
            res.redirect("/login");
        }else{
            
            if(req.body.password==req.body.password2){ 
                console.log("recup token");
                User.findOne({username: obj.username}, function(err,user) {
                    if(err){
                        console.log(err);
                    }else{
                        console.log("err");
                        user.setPassword(req.body.password, (err) => {
                            if(err){
                                console.log(err);
                            }else{
                                user.save();
                                const updatedReset = {
                                    resetPasswordToken: null,
                                    resetPasswordExpires: null
                                }
                                Reset.findOneAndUpdate({resetPasswordToken: req.params.token},
                                updatedReset, (err,obj) => {
                                    if(err){
                                        console.log(err);
                                    }else{
                                        res.redirect("/login");
                                    }
                                
                            
                            });
                            }
                        });
                    }
                });
            }

        }

    });
});

// receipe route
app.get("/dashboard/myreceipes", isLoggedIn, (req,res) => {
    Receipe.find({
        user: req.user.id
    }, (err,receipe) => {
        if(err) {
            console.log(err);

        }else{
            res.render("receipe",{receipe: receipe});
        }
    
    });
    
});

app.get("/dashboard/newreceipe", isLoggedIn, (req,res) => {
    res.render("newreceipe");       
});

app.post("/dashboard/newreceipe", (req,res) => {
    const newReceipe = {
        name: req.body.receipe,
        image: req.body.logo,
        user: req.user.id
    }
    Receipe.create(newReceipe, (err,newReceipe) => {
        if(err){
            console.log(err);
        }else{
            req.flash("success","Recette ajoutee");
            res.redirect("/dashboard/myreceipes");
        }
    });
});

app.get("/dashboard/myreceipes/:id", (req,res) =>{
    Receipe.findOne({user:req.user.id,_id:req.params.id}, (err,receipFound) => {
        if(err){
            console.log(err);

        }else{
            Ingredient.find({
                user: req.user.id,
                receipe: req.params.id
            }, (err,ingredientFound) =>{
                if(err){
                    console.log(err);

                }else{
                    res.render("ingredients",{
                        ingredient: ingredientFound,
                        receipe: receipFound
                    });
                }
            
            });
        }
    });
});

app.delete("/dashboard/myreceipes/:id",isLoggedIn, (req,res) =>{
    Receipe.deleteOne({
        _id: req.params.id}, (err) => {
            if(err){
                console.log(err);
            }else{
                req.flash("success","recette supprimee !!!");
                res.redirect("/dashboard/myreceipes");
            }
        
    });
});

// Ingredient
app.get("/dashboard/myreceipes/:id/newingredient", (req,res) => {
    Receipe.findById({_id: req.params.id}, (err,found) =>{
        if(err){
            console.log(err)

        }else{
            res.render("newingredient",{receipe: found});
        }
    });

});

app.post("/dashboard/myreceipes/:id", (req,res) =>{
    const newIngredient = {
        name: req.body.name,
        bestdish: req.body.dish,
        user: req.user.id,
        quantity: req.body.quantity,
        receipe: req.params.id
    }
    Ingredient.create(newIngredient, (err,newIngredient) => {
        if(err){
            console.log(err);
        }else{
            req.flash("success","Ingredient ajoute !!!");
            res.redirect("/dashboard/myreceipes/"+req.params.id);
        }
    });
});


app.delete("/dashboard/myreceipes/:id/:ingredientid",isLoggedIn, (req,res) =>{
    Ingredient.deleteOne({_id: req.params.ingredientid}, (err) =>{
        if(err){
            console.log(err);

        }else{
            req.flash("success","Ingredient supprime !!!");
            res.redirect('/dashboard/myreceipes/'+req.params.id);
        }
    });
});

app.post("/dashboard/myreceipes/:id/:ingredientid/edit",isLoggedIn, (req,res) =>{
    Receipe.findOne({user: req.user.id,_id: req.params.id},(err,receipeFound) =>{
        if(err){
            console.log(err);

        }else{
            Ingredient.findOne({
                _id: req.params.ingredientid,
                receipe: req.params.id,
            }, (err,ingredientFound) => {
                if(err){
                    console.log(err);
                }else{
                    res.render("edit",{
                        ingredient: ingredientFound,
                        receipe: receipeFound
                    });
                }
            });
        }
    });
});

app.put("/dashboard/myreceipes/:id/:ingredientid",isLoggedIn, (req,res) =>{
    const ingredient_updated = {
        name : req.body.name,
        bestdish: req.body.dish,
        user : req.user.id,
        quantity: req.body.quantity,
        receipe: req.params.id
    }
    Ingredient.findByIdAndUpdate({
        _id: req.params.ingredientid},ingredient_updated, (err,updateIngredient) => {
            if(err){
                console.log(err);
            }else{
                req.flash("success","Ingredient mis a jour");
                res.redirect("/dashboard/myreceipes/"+req.params.id);
            }
        
    });
});

// Favourite
app.get("/dashboard/favourites", isLoggedIn, (req,res) => {
    Favourite.find({user: req.user.id}, (err,favourite) =>{
        if(err){
            console.log(err);
        }else{
            res.render("favourites",{favourite: favourite});
        }
    });  
    
});

app.get("/dashboard/favourites/newfavourite", isLoggedIn, (req,res) => {
    res.render("newfavourite");  
    
});

app.post("/dashboard/favourites", isLoggedIn, (req,res) => {
    const newFavourite = {
        image : req.body.image,
        title: req.body.title,
        description: req.body.description,
        user : req.user.id
    }
    Favourite.create(newFavourite, (err,newFavourite) => {
        if(err){
            console.log(err);
        }else{
            req.flash("success","Favori ajoute !!!");
            res.redirect("/dashboard/favourites");
        }
    });
    
});

app.delete("/dashboard/favourites/:id", isLoggedIn, (req,res) => {
    Favourite.deleteOne({_id: req.params.id}, (err) => {
        if(err){
            console.log(err);
        }else{
            req.flash("success","Favori supprime !!!");
            res.redirect("/dashboard/favourites");
        }
    });
});

// schedule
app.get("/dashboard/schedule", isLoggedIn, (req,res) => {
   Schedule.find({user: req.user.id}, (err,schedule) => {
       if(err){
           console.log(err);
       }else{
           res.render("schedule",{schedule: schedule});
       }
   });
    
});

app.get("/dashboard/schedule/newSchedule", isLoggedIn, (req,res) => {
    res.render("newSchedule");
     
 });

 app.post("/dashboard/schedule", isLoggedIn, (req,res) => {
    const newSchedule = {
        receipeName: req.body.receipename,
        scheduleDate: req.body.scheduleDate,
        user : req.user.id,
        time: req.body.time
    }
    Schedule.create(newSchedule, (err,newSchedule) => {
        if(err){
            console.log(err);
        }else{
            req.flash("success"," progamation ajoutee !!!");
            res.redirect("/dashboard/schedule");
        }
    });
    
});


app.delete("/dashboard/schedule/:id", isLoggedIn, (req,res) => {
    Schedule.deleteOne({_id: req.params.id}, (err) => {
        if(err){
            console.log(err);
        }else{
            req.flash("success","programation supprime !!!");
            res.redirect("/dashboard/schedule");
        }
    });
});


// Autorisation
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
         return next();
    }else{
        req.flash("error","Il faut se connecter");
        res.redirect("/login");
    }
}

app.listen(3000, (req,res) => {
    console.log("Connecté à localhost:3000");
});
