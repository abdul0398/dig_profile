const express = require("express");
const router = express.Router();
const passport = require("passport");


router
.get("/admin/login", (req,res)=>{
    res.render("login.ejs");
})
.post("/admin/login", passport.authenticate('user', {
    failureRedirect: '/admin/login',
    failureFlash: true
}), (req, res)=>{
    res.redirect("/");
})

module.exports = router;