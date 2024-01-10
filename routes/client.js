const express = require("express");
const router = express.Router();
const {verify, isAuthenticated, isAdmin} = require("../middlewares/verify.js");
const {sendVerificationEmail} = require("../utils/mailHandler.js");

const crypto = require("crypto");
const passport = require("passport");


router.get("/clients", async (req,res)=>{
   const id = req.user.id;
   const role = req.user.role;
    if(role == "admin"){
        const [clients] = await __pool.query(`SELECT * FROM clients ORDER BY created_at DESC`);
        return res.render("client/clients.ejs", {clients:clients});
    }else{
        return res.render("client/clients.ejs", {clients:[]});   
    }
})
.get("/api/getClient/:clientid", verify, async (req, res) => {
    const { clientid } = req.params;
    try {
        const [clients] = await __pool.query(`SELECT name, id, email FROM clients WHERE id = ?`, [clientid]);
        if (clients.length === 0) {
            return res.status(404).json({ message: "Client not found" });
        }

        const [profiles] = await __pool.query(`SELECT * FROM profiles WHERE client_id = ?`, [clients[0].id]);
        if (profiles.length === 0) {
            return res.status(200).json({ client: clients[0], message: "No profiles found for this client" });
        }
        const profileId = profiles.map(profile => profile.id);
        console.log(profileId);
        const [links] = await __pool.query(`SELECT * FROM links WHERE profilesId IN (?)`, [profileId]);
        console.log(links);
        if (links.length === 0) {
            return res.status(200).json({ client: clients[0], profiles });
        }
        res.status(200).json({ client: clients[0], profiles, links });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred" });
    }
    console.log("Hello", clientid);
})
.post("/editclient/:clientId", verify, async (req, res)=>{
    const {clientId} = req.params;
    const {name, email, password} = req.body;
    const userId = req.user.id;
    const selectQuery = 'SELECT COUNT(*) AS count FROM clients WHERE name = ? AND id != ?;';

    try {
        const [result] = await __pool.query(selectQuery, [name, clientId, userId ]);
        if(result[0].count == 0){
        const salt = crypto.randomBytes(16);
            
            await __pool.query(`UPDATE clients SET name = ?, email = ?, hashed_password = ?, salt = ? WHERE id = ?;`, [name, email == ""?null:email, password == ""?null:crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256'), password == ""?null:salt,  clientId]);
            res.status(200).json("Successfully Updated");
        }else{
            res.status(400).json("Something wrong");
        }
    } catch (error) {
        console.log("Error in editing the client", error.message);
    }
})
.get("/api/deleteclient/:clientID", isAdmin, async (req, res)=>{
    const {clientID} = req.params;
    try {
        const deleteQuery = `DELETE FROM clients WHERE id=?`
        await __pool.query(deleteQuery, [clientID]);
        res.status(200).json({message:"Client Sucessfully deleted "});
    } catch (error) {
        console.log("Error in deleting Client", error.message);
        res.status(401).json({message:"Client Sucessfully deleted"});
    }
})
.get("/login", (req,res)=>{
    res.render("client/login.ejs");
})
.post("/api/client/register",isAdmin, async (req,res)=>{
    const {name, email, password} = req.body;
    try {
        if(email == "" || password == ""){
            const insertUserQuery = `
            INSERT IGNORE INTO clients (name, isVerified) VALUES (?, ?)
            `;
            const [result] = await __pool.query(insertUserQuery, [name, true]);
            return res.status(200).json({message:"Client Registered Successfully", id: result.insertId});
        }
        const [result] = await __pool.query("SELECT COUNT(*) AS count FROM clients WHERE email = ?", [email]);
        if (result[0].count > 0) {
            return res.status(400).json({message:"Email is already in use by another Client"});
        }
        const salt = crypto.randomBytes(16);
        const insertUserQuery = `
            INSERT IGNORE INTO clients (name, email, hashed_password, salt, isVerified) VALUES (?, ?, ?, ?, ?)
        `;
        await __pool.query(insertUserQuery, [name, email, crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256'), salt, true]);
        res.status(200).json({message:"Client Registered Successfully"});
    } catch (error) {
        console.log("Error is registering the Client =>" ,error.message);
        res.status(500).json({message:"An error occurred"});
        
    }

})
.post("/api/client/login", passport.authenticate('client', {
    failureRedirect: '/login',
    failureFlash: true
}), (req,res)=>{
    res.redirect("/");
})
.get("/register", (req,res)=>{
    return res.render("client/register.ejs");
})
.post("/register", async (req, res)=>{
    try {

        const {name, email, password} = req.body;
        if(!email || !password){
            req.flash("error", "Email or password in invalid");
            return res.redirect("/register");
        }

        // Checking if any user exists with the same email with is Verified
        const [rows] = await __pool.query('SELECT * FROM clients WHERE email = ? AND isVerified = ?', [email, true]);
        if(rows.length > 0){
            req.flash("error", "Email is Already present");
            return res.redirect("/register");
        }

        
        // Checking if any user exists with the same email with is not Verified
        const [rows1] = await __pool.query('SELECT * FROM clients WHERE email = ? AND isVerified = ?', [email, false]);
        const verificationToken = crypto.randomBytes(30).toString('hex');
        const salt = crypto.randomBytes(16);
        if(rows1.length == 0){
            const insertUserQuery = `
                INSERT IGNORE INTO clients (name, email, hashed_password, salt, verificationToken) VALUES (?, ?, ?, ?, ?)
                `;
            await __pool.query(insertUserQuery, [name, email, crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256'), salt, verificationToken]);
        }else{
            const updateUserQuery = `
                UPDATE clients SET name = ?, hashed_password = ?, salt = ?, verificationToken = ? WHERE email = ?
            `;
            await __pool.query(updateUserQuery, [name, crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256'), salt, verificationToken, email]);
        }
        
        await sendVerificationEmail(email, `${process.env.SERVER_URL}/verify?token=${verificationToken}`);
        return res.render("verifyEmail.ejs");
    }catch(error){
        console.log(error);
        res.redirect("/error");
    }
})
.get("/verify", async (req, res)=>{
    const {token } = req.query;
    try {
        const [rows] = await __pool.query('UPDATE clients SET isVerified = TRUE, verificationToken = NULL WHERE verificationToken = ?', [token]);
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

        const checkifMailExistsQuery = `SELECT * FROM clients 
        WHERE email = ?`
        const [clientExists] = await __pool.query(checkifMailExistsQuery, [email]);
        if(clientExists.length === 0){
            req.flash("error", "Email is not registered");
            return res.redirect("/forget");
        }

        const insertUserQuery = `
            UPDATE clients 
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
            SELECT email FROM clients 
            WHERE resetPasswordToken = ? AND resetPasswordExpires > UNIX_TIMESTAMP()
        `;
        const [user] = await __pool.query(tokenQuery, [token]);
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
            SELECT email FROM clients 
            WHERE resetPasswordToken = ? AND resetPasswordExpires > UNIX_TIMESTAMP()
        `;
        const [user] = await __pool.query(tokenQuery, [token]);
        if (user.length === 0) {
            return res.send('Password reset token is invalid or has expired.');
        }
        const salt = crypto.randomBytes(16);
        const updatePasswordQuery = `
                UPDATE clients 
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

})
module.exports = router;