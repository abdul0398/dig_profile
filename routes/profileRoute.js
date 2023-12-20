const express = require("express");
const router = express.Router();
const verify = require("../middlewares/verify.js");
router.get("/dashboard", verify, (req,res)=>{
    res.render("dashboard.ejs");
})


module.exports = router;