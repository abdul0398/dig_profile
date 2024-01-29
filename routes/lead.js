const express = require("express");
const router = express.Router();
const {verify} = require("../middlewares/verify.js");
const {changeleadtoString} = require("../utils/tools.js")
const {bulkDiscordSender} = require("../utils/discord.js");
const {bulkMailSender} = require("../utils/mailHandler")

router.post("/api/submitLead/:profilId", async (req,res)=>{
    const {profilId} = req.params;
    const {Name, Email, Mobile, Message, Booking, form_id, ...questions} = req.body;
    console.log(req.body);
    try {
        const insertQuery = `INSERT INTO leads (name, email, phone, profileId, message, questions, booking) VALUES(?, ?, ?, ?, ?, ?, ?)`;
        const [row] = await __pool.query(insertQuery, [Name, Email, Mobile, profilId, Message, JSON.stringify([questions]), convertToMySQLDateTime(Booking)]);
        
        const lastIdQuery = 'SELECT * FROM leads WHERE id = ?';
        const [rows] = await __pool.query(lastIdQuery, [row.insertId]);

        const getFormQuery = `SELECT discords, emails FROM form WHERE id = ?`
        const [formRows] = await __pool.query(getFormQuery, [form_id]);
        if(formRows.length > 0 ){
            const leadStr  = changeleadtoString(rows[0]);
            await bulkDiscordSender(formRows[0].discords, leadStr);
            await bulkMailSender(formRows[0].emails, leadStr);
        }else if(form_id == "undefined"){
            const [defaultForm] = await __pool.query(`SELECT * from form WHERE name = ?`, ["Default"]);
            const leadStr  = changeleadtoString(rows[0]);
            await bulkDiscordSender(defaultForm[0].discords, leadStr);
            await bulkMailSender(defaultForm[0].emails, leadStr);
        }
        res.status(200).json("Sucessfully submitted Leads");
    } catch (error) {
        console.log(error.message);
        res.status(400).json("Something Went wrong please try again");
    }
})
.get("/leads", verify, async (req,res)=>{
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

})
.get("/api/getLeads", async (req,res)=>{
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
            if(profiles.length === 0){
                return res.status(200).json({ leads: [], profiles: []});
            }
            const [leads] = await __pool.query(getLeadsQuery, [profiles]);
            
            res.status(200).json({ leads, profiles: profilesResult});
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
})
function convertToMySQLDateTime(isoDateTime) {
    if(!isoDateTime)return null;
    const date = new Date(isoDateTime);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = router;