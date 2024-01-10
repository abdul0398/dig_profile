const express = require("express");
const router = express.Router();
const {verify} = require("../middlewares/verify.js");

router.post("/api/addform/:profileId", verify, async (req,res)=>{
    const {profileId} = req.params;
    const {name, discord, questions, emails} = req.body;
    try {
        //check if form with same name already exists
        const checkQuery = `SELECT * FROM form WHERE name = ? AND profileId = ?`;
        const [existingForms] = await __pool.query(checkQuery, [name, profileId]);
        if (existingForms.length > 0) {
            // Form already exists
            return res.status(400).json({ message: "Form with this name already exists for the profile." });
        }
        const insertQuery = `INSERT INTO form (name, profileId, discords, questions, emails) VALUES (?, ?, ?, ?, ?)`;
        await __pool.query(insertQuery, [name, profileId, JSON.stringify(discord),JSON.stringify(questions), JSON.stringify(emails)]);
        res.status(200).json({message: "Form added successfully"});
    } catch (error) {
        console.log("Error in adding form", error.message);
        res.status(400).json({message: "Error in adding form"});
    }

}).get("/api/getForm/:formId", async (req,res)=>{
    const {formId} = req.params;
    try {
        const getQuery = `SELECT * FROM form WHERE id = ?`;
        const [forms] = await __pool.query(getQuery, [formId]);
        if (forms.length === 0) {
            return res.status(400).json({ message: "Form not found" });
        }
        res.status(200).json({message: "Form fetched successfully", form: forms[0]});
    } catch (error) {
        console.log("Error in fetching form", error.message);
        res.status(400).json({message: "Error in fetching form"});
    }

}).post("/api/updateForm/:formId", verify, async (req,res)=>{
    const {formId} = req.params;
    const {name, discord, questions, emails} = req.body;
    console.log(req.body);
    try {
        const updateQuery = `UPDATE form SET name = ?, discords = ?, questions = ?, emails = ? WHERE id = ?`;
        await __pool.query(updateQuery, [name, JSON.stringify(discord), JSON.stringify(questions), JSON.stringify(emails), formId]);
        res.status(200).json({message: "Form updated successfully"});
    } catch (error) {
        console.log("Error in updating form", error.message);
        res.status(400).json({message: "Error in updating form"});
    }  
}).get("/api/deleteform/:formId", verify, async (req,res)=>{
    const {formId} = req.params;
    try {
        const deleteQuery = `DELETE FROM form WHERE id = ?`;
        await __pool.query(deleteQuery, [formId]);
        res.status(200).json({message: "Form deleted successfully"});
    } catch (error) {
        console.log("Error in deleting form", error.message);
        res.status(400).json({message: "Error in deleting form"});
    }
})

module.exports = router;