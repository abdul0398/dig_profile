const express = require("express");
const router = express.Router();
const {verify} = require("../middlewares/verify.js");

router.post("/api/form/create", verify, async (req,res)=>{
    const {name, id} = req.body;
    try {
        //check if form with same name already exists
        const checkQuery = `SELECT * FROM form WHERE name = ? AND profileId = ?`;
        const [existingForms] = await __pool.query(checkQuery, [name, id]);
        if (existingForms.length > 0) {
            // Form already exists
            return res.status(400).json({ message: "Form with this name already exists for the profile." });
        }

        const insertQuery = `INSERT INTO form (name, profileId, discords, questions, emails) VALUES (?, ?, ?, ?, ?)`;
        await __pool.query(insertQuery, [name, id, JSON.stringify([]),JSON.stringify([]), JSON.stringify([])]);
        res.status(200).json({message: "Form added successfully"});
    } catch (error) {
        console.log("Error in adding form", error.message);
        res.status(400).json({message: "Error in adding form"});
    }

}).get("/api/form/get/:name/:id", async (req,res)=>{
    const {name, id} = req.params;
    try {
        console.log(name);
        const getQuery = `SELECT * FROM form WHERE name = ? AND profileId = ?`;
        const [forms] = await __pool.query(getQuery, [name, id]);
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
    const {discord, questions, emails} = req.body;
    try {
        const updateQuery = `UPDATE form SET discords = ?, questions = ?, emails = ? WHERE id = ?`;
        await __pool.query(updateQuery, [JSON.stringify(discord), JSON.stringify(questions), JSON.stringify(emails), formId]);
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