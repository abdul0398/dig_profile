const express = require("express");
const router = express.Router();
const {verify} = require("../middlewares/verify.js");

router.post("/api/submitLead/:profilId", async (req,res)=>{
    const {profilId} = req.params;
    const {Name, Email, Mobile, Message, ...questions} = req.body;
    try {
        const insertQuery = `INSERT INTO leads (name, email, phone, profileId, message, questions) VALUES(?, ?, ?, ?, ?, ?)`;
        await __pool.query(insertQuery, [Name, Email, Mobile, profilId, Message, JSON.stringify(questions)]);
        res.status(200).json("Sucessfully submitted Leads");
    } catch (error) {
        console.log(error.message);
        res.status(400).json("Something Went wrong please try again");
    }
}).get("/leads", verify, (req,res, next)=>{
    next();
}).get("api/getLeads", verify, async (req,res)=>{
    const getLeadsQuery = `SELECT * FROM leads`;
    try {
        const [leads] = await __pool.query(getLeadsQuery);
        console.log(leads);
    } catch (error) {
        
    }
})
module.exports = router;