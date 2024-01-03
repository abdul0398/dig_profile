const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const {verify, isAuthenticated} = require("../middlewares/verify.js");
const {sendVerificationEmail} = require("../utils/mailHandler.js");
const passport = require("passport");


router
.get("/register", (req,res)=>{
    return res.render("register.ejs");
})
.post("/register", async (req, res)=>{
    try {

        const {email, password} = req.body;
        if(!email || !password){
            req.flash("error", "Email or password in invalid");
            return res.redirect("/register");
        }
        
        const [rows] = await __pool.query('SELECT * FROM users WHERE email = ? AND isVerified = ?', [email, true]);
        
        if(rows.length > 0){
            req.flash("error", "Email is Already present");
            return res.redirect("/register");
        }

        const salt = crypto.randomBytes(16);
        const insertUserQuery = `
            INSERT IGNORE INTO users (email, hashed_password, salt, verificationToken) VALUES (?, ?, ?, ?)
        `;
        const verificationToken = crypto.randomBytes(30).toString('hex');
        await __pool.query(insertUserQuery, [email, crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256'), salt, verificationToken]);
        await sendVerificationEmail(email, `${process.env.SERVER_URL}/verify?token=${verificationToken}`);
        res.render("verifyEmail.ejs");
    }catch(error){
        console.log(error);
        res.redirect("/error");
    }
})
.get("/login", (req,res)=>{
    res.render("login.ejs");
})
.post("/login", passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true
}), (req, res)=>{
    res.redirect("/dashboard");
})
.get("/verify", async (req, res)=>{
    const {token } = req.query;
    try {
        const [rows] = await __pool.query('UPDATE users SET isVerified = TRUE, verificationToken = NULL WHERE verificationToken = ?', [token]);
        res.render("verifySuccess.ejs");
    } catch (error) {
        console.log(error);
        res.redirect("/error");
    }
})
.get("/logout",verify, (req,res)=>{
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect("/login");
    });
})
.get("/forget", (req, res)=>{
    res.render("forget.ejs");
})
.post("/forgot_password", async (req, res)=>{
    const {email} = req.body
    try {
        const resetPasswordToken = crypto.randomBytes(30).toString('hex');
        const resetPasswordExpires = new Date().setHours(new Date().getHours() + 1);

        const checkifMailExistsQuery = `SELECT * FROM users 
        WHERE email = ?`
        const [userExists] = await __pool.query(checkifMailExistsQuery, [email]);
        if(userExists.length === 0){
            req.flash("error", "Email is not registered");
            return res.redirect("/forget");
        }

        const insertUserQuery = `
            UPDATE users 
            SET resetPasswordToken = ?, resetPasswordExpires = ? 
            WHERE email = ?
          `;
        await __pool.query(insertUserQuery, [resetPasswordToken, resetPasswordExpires, email]); 
        await sendVerificationEmail(email, `${process.env.SERVER_URL}/reset?token=${resetPasswordToken}`)
        req.flash("success","Please Check your Mail");
        res.redirect("/forget");
    } catch (error) {
        req.flash("error", error.message);
        res.redirect("/forget");
    }
})
.get("/reset", async (req,res)=>{
    const {token} = req.query;

    try {
        const tokenQuery = `
            SELECT email FROM users 
            WHERE resetPasswordToken = ? AND resetPasswordExpires > UNIX_TIMESTAMP()
        `;
        const [user] = await __pool.query(tokenQuery, [token]);
        console.log(user);
        if (user.length === 0) {
            return res.send('<h2> Password reset token is invalid or has expired.</h2>');
        }
        res.render("resetPassword.ejs", {token:token})
    } catch (error) {
        console.log(error);
        res.redirect("/error");
    }
})
.post("/reset_password", async (req,res)=>{
    const {token} = req.query;
    const {password} = req.body;
    try {
        const tokenQuery = `
            SELECT email FROM users 
            WHERE resetPasswordToken = ? AND resetPasswordExpires > UNIX_TIMESTAMP()
        `;
        const [user] = await __pool.query(tokenQuery, [token]);
        console.log(user);
        if (user.length === 0) {
            return res.send('Password reset token is invalid or has expired.');
        }
        const salt = crypto.randomBytes(16);
        const updatePasswordQuery = `
                UPDATE users 
                SET hashed_password = ?, salt = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL 
                WHERE email = ?
            `;
        await __pool.query(updatePasswordQuery, [crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256'), salt,  user[0].email]);
        req.flash("success", "Password Successfully Changed");
        res.redirect("/login");
    } catch (error) {
        console.log(error);
        res.render("/error");
    }

}).get("/test", (req,res)=>{
    res.render("temp1.ejs");
})
module.exports = router;