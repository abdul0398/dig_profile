const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const ejsMate = require("ejs-mate");
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const MySQLStore = require('express-mysql-session')(session);
const {verifyForUser, verifyForClient, serializeUser, deserializeUser} = require("./passport.js");


async function setMiddleWares() {
    const app = express();
    app.use(express.static('public'));
    app.engine('ejs', ejsMate);
    app.set('view engine', 'ejs');
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    app.use(cors());
    const sessionConfig = {
        secret: process.env.secret || "RANDOMSECRET",
        resave: false,
        saveUninitialized: true,
        cookie: {
            httpOnly: true,
            maxAge: (7 * 24 * 60 * 60 * 1000)
        },
        store: new MySQLStore({
            host: process.env.db_HOST,
            user: process.env.db_USER,
            password: process.env.db_PASS,
            database: process.env.DB
        })
    }
    app.use(session(sessionConfig));
    app.use(flash());
    app.use(passport.session());
    app.use(passport.authenticate('session'));

    passport.use("user", new LocalStrategy({usernameField : 'email'},verifyForUser));
    passport.use("client", new LocalStrategy({usernameField : 'email'},verifyForClient));
    passport.serializeUser(serializeUser);
    passport.deserializeUser(deserializeUser)


    app.use((req, res, next) => {
        res.locals.currentUser = req.user;
        res.locals.success = req.flash("success");
        res.locals.error = req.flash("error");
        next();
    });

    return {app, express};

}



module.exports = setMiddleWares;