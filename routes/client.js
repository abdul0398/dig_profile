const express = require("express");
const router = express.Router();
const {verify} = require("../middlewares/verify.js");



router.get("/clients", verify, async (req,res)=>{
   const id = req.user.id;
   const [clients] = await __pool.query(`SELECT * FROM clients WHERE userId = ? ORDER BY created_at DESC`, [id]);


    res.render("client/clients.ejs", {clients:clients});
}).post("/addclient", verify, async (req, res) => {
    const { name } = req.body;
    const userId = req.user.id;
    try {
        const [result] = await __pool.query("SELECT COUNT(*) AS count FROM clients WHERE name = ? AND userId = ? ", [name, userId]);
        if (result[0].count == 0) {
            const [result] = await __pool.query("INSERT INTO clients (name, userId) VALUES (?, ?)", [name, userId]);
            res.status(200).json({message:"Client created Successfully", id: result.insertId});
        } else {
            res.status(400).json({ message: "Client with this name is already present" });
        }
    } catch (error) {
        console.log("Error is creating client", error)
    }
}).get("/client/:clientid", verify, async (req, res) => {
    const { clientid } = req.params;
    try {
        const [clients] = await __pool.query(`SELECT * FROM clients WHERE id = ?`, [clientid]);
        if (clients.length === 0) {
            return res.status(404).json({ message: "Client not found" });
        }

        const [profiles] = await __pool.query(`SELECT * FROM profiles WHERE client_id = ?`, [clients[0].id]);
        if (profiles.length === 0) {
            return res.status(200).json({ client: clients[0], message: "No profiles found for this client" });
        }

        const [links] = await __pool.query(`SELECT * FROM links WHERE profilesId = ?`, [profiles[0].id]);
        if (links.length === 0) {
            return res.status(200).json({ client: clients[0], profiles });
        }
        res.status(200).json({ client: clients[0], profiles, links });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred" });
    }
    console.log("Hello", clientid);
}).post("/editclient/:clientId", verify, async (req, res)=>{
    const {clientId} = req.params;
    const {name} = req.body;
    const userId = req.user.id;
    const updateQuery = `UPDATE clients SET name = ? WHERE id = ?;`;
    const selectQuery = 'SELECT COUNT(*) AS count FROM clients WHERE name = ? AND id != ? AND userId = ?;';

    try {
        const [result] = await __pool.query(selectQuery, [name, clientId, userId ]);
        if(result[0].count == 0){
            await __pool.query(updateQuery, [name, clientId]);
            res.status(200).json("Successfully Updated");
        }else{
            res.status(400).json("Something wrong");
        }
    } catch (error) {
        console.log("Error in editing the client", error.message);
    }
}).get("/api/deleteclient/:clientID", verify, async (req, res)=>{
    const {clientID} = req.params;
    try {
        const deleteQuery = `DELETE FROM clients WHERE id=?`
        await __pool.query(deleteQuery, [clientID]);
        res.status(200).json({message:"Client Sucessfully deleted "});
    } catch (error) {
        console.log("Error in deleting Client", error.message);
        res.status(401).json({message:"Client Sucessfully deleted"});
    }
});


module.exports = router;