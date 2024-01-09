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
}).get("/leads", verify, async (req,res)=>{
    const getLeadsQuery = `SELECT * FROM leads WHERE profileId IN (?)`;
    const getProfilesQuery = `SELECT * FROM profiles WHERE client_id IN (?)`;
    const getClientsQuery = `SELECT name, id FROM clients`;
    const userId = req.user.id;
    
    try {
        // First, get the clients for the given userId
        const [clientsResult] = await __pool.query(getClientsQuery);
        const clients = clientsResult.map(client => client.id);
    
        // If no clients found, return empty data
        if (clients.length === 0) {
            return res.render("lead/lead.ejs", { leads: [], profiles: [], clients: [] });
        }
    
        // Then, get the profiles for these clients
        const [profilesResult] = await __pool.query(getProfilesQuery, [clients]);
        const profiles = profilesResult.map(profile => profile.id);
    
        // Finally, get the leads for these profiles
        const [leads] = await __pool.query(getLeadsQuery, [profiles]);
    
        res.render("lead/lead.ejs", { leads, profiles: profilesResult, clients: clientsResult });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }

}).get("/api/getLeads", async (req,res)=>{
    const getLeadsQuery = `SELECT * FROM leads WHERE profileId IN (?)`;
    const getProfilesQuery = `SELECT * FROM profiles WHERE client_id IN (?)`;
    const getClientsQuery = `SELECT name, id FROM clients`;
    const userId = req.user.id;
    try {
        if(req.user.role == "admin"){
            const [clientsResult] = await __pool.query(getClientsQuery);
            const clientIds = clientsResult.map(client => client.id);
    
            if (clientIds.length === 0) {
                return res.status(200).json({ leads: [], profiles: [], clients: [] });
            }
    
            const [profilesResult] = await __pool.query(getProfilesQuery, [clientIds]);
            const profileIds = profilesResult.map(profile => profile.id);
    
            const [leadsResult] = await __pool.query(getLeadsQuery, [profileIds]);
    
            const leadsWithDetails = leadsResult.map(lead => {
                const profile = profilesResult.find(profile => profile.id === lead.profileId);
                const client = profile ? clientsResult.find(client => client.id === profile.client_id) : null;
                return {
                    ...lead,
                    clientId: client ? client.id : null
                };
            });
    
            res.status(200).json({ leads: leadsWithDetails, profiles: profilesResult, clients: clientsResult });
        }else{
            const [profilesResult] = await __pool.query(getProfilesQuery, [userId]);
            const profiles = profilesResult.map(profile => profile.id);
    
            const [leads] = await __pool.query(getLeadsQuery, [profiles]);
            
            res.status(200).json({ leads, profiles: profilesResult});
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
})
module.exports = router;