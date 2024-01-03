const express = require("express");
const router = express.Router();
const {verify} = require("../middlewares/verify.js");
const multer = require('multer');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/profiles')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix + file.originalname);
    }
  })  
  const upload = multer({ storage: storage })

router.get("/dashboard", verify, (req,res)=>{
    res.render("dashboard.ejs");
}).post("/addprofile", verify, async (req,res)=>{
    const {name, clientID} = req.body;
    try {
        // Check if a profile already exists with the same name for the client
        const checkQuery = `SELECT * FROM profiles WHERE name = ? AND client_id = ?`;
        const [existingProfiles] = await __pool.query(checkQuery, [name, clientID]);

        if (existingProfiles.length > 0) {
            // Profile already exists
            return res.status(400).json({ message: "Profile with this name already exists for the client." });
        }
        const insertQuery = `INSERT INTO profiles (name, client_id) VALUES (?, ?)`
        await __pool.query(insertQuery, [name, clientID]);
        res.status(200).json("Profile created Successfully");
    } catch (error) {
        console.log('Error in creating profile', error.message)        
    }
}).post("/api/edit/profilename/:profileId", verify, async (req,res)=>{
    const {profileId} = req.params;
    const {name} = req.body;
    try {
        const updateQuery = `UPDATE profiles SET name = ? WHERE id = ?`;
        await __pool.query(updateQuery, [name, profileId]);
        res.status(200).json("Successfully Updated");
    } catch (error) {
        console.log("Error in updating profile", error.message);
    }
}).get("/api/delete/profile/:profileId", verify, async (req,res)=>{
    const {profileId} = req.params;
    try { 
        const selectQuery = `SELECT profile_img_path FROM profiles WHERE id = ?`;
        const [rows] = await __pool.query(selectQuery, [profileId]);
        const currentImagePath = rows.length > 0 ? rows[0].profile_img_path : null;
        // Delete the existing file if it exists
        if (currentImagePath && fs.existsSync(currentImagePath)) {
            await fs.promises.unlink(currentImagePath);
        }

        const deleteQuery = `DELETE FROM profiles WHERE id = ?`;
        await __pool.query(deleteQuery, [profileId]);
        res.redirect("/clients");
    } catch (error) {
        console.log("Error in deleting profile", error.message);
        res.redirect("/error");
    }
}).get("/profile/:profileId", async (req,res)=>{
    const {profileId} = req.params;
    try {
        const [profile] = await __pool.query(`SELECT * FROM profiles WHERE id = ?`, [profileId]);
        if(profile.length === 0){
            return res.status(404).json({message: "Profile not found"});
        }
        const template = profile[0].template_selected;
        const [links] = await __pool.query(`SELECT * FROM links WHERE profilesId = ?`, [profile[0].id]);
        if(links.length === 0){
            return res.render(`temp${template}.ejs`, {profile: profile[0], links: []});
        }

        const [form] = await __pool.query(`SELECT * FROM form WHERE profileId = ?`, [profileId]);
        if(form.length === 0){
            return res.render(`temp${template}.ejs`, {profile: profile[0], links: links, forms: []});
        }
        return res.render(`temp${template}.ejs`, {profile: profile[0], links: links, forms: form});
    } catch (error) {
        console.error("Error in fetching profile", error.message);
        res.redirect("/error");
    }
}).post("/api/profileupload", verify,  upload.single('profile_image'), async (req,res)=>{
    const { profile_id } = req.body;
    try {
        // Fetch current profile image path
        const selectQuery = `SELECT profile_img_path FROM profiles WHERE id = ?`;
        const [rows] = await __pool.query(selectQuery, [profile_id]);
        const currentImagePath = rows.length > 0 ? rows[0].profile_img_path : null;
        // Delete the existing file if it exists
        if (currentImagePath && fs.existsSync(currentImagePath)) {
            await fs.promises.unlink(currentImagePath);
        }

        // Proceed to upload the new image
        const profile_image_path = req.file.path;
        const updateQuery = `UPDATE profiles SET profile_img_path = ? WHERE id = ?`;
        await __pool.query(updateQuery, [profile_image_path, profile_id]);

        res.status(200).json("Profile Image Uploaded Successfully");
    } catch (error) {
        console.error("Error in uploading profile image", error.message);
        res.status(500).json({ message: "Error in uploading profile image" });
    }
}).get("/api/getprofile/:profileId", verify, async (req,res)=>{
    const {profileId} = req.params;
    try {
        const [profile] = await __pool.query(`SELECT * FROM profiles WHERE id = ?`, [profileId]);
        if(profile.length === 0){
            return res.status(404).json({message: "Profile not found"});
        }
        
        const [links] = await __pool.query(`SELECT * FROM links WHERE profilesId = ?`, [profile[0].id]);
        const [forms] = await __pool.query(`SELECT * FROM form WHERE profileId = ?`, [profileId]);
                
        const responseData = { profile: profile[0] };
        
        if (links.length === 0) {
            responseData.links = [];
        } else {
            responseData.links = links;
        }
        
        if (forms.length === 0) {
            responseData.forms = [];
        } else {
            responseData.forms = forms;
        }
        
        return res.status(200).json(responseData);
    } catch (error) {
        console.error("Error in fetching profile", error.message);
        res.redirect("/error");
    }
}).post('/updateLinks', verify, async (req, res) => {
    const { profile_id, data, templateSelected, phone, appointment_link, fb_link, insta_link, linkedin_link} = req.body;
    const connection = await __pool.getConnection();
    console.log(req.body);
        try {
            // Start a transaction
            await connection.beginTransaction();

            // Delete all existing links for the profile
            const deleteQuery = 'DELETE FROM links WHERE profilesId = ?';
            await connection.query(deleteQuery, [profile_id]);
            
            // Changing the template 
            await connection.query('UPDATE profiles SET personal_link = ?, template_selected = ?, phone = ?, fb_link = ?, insta_link = ?, linkedin_link = ? WHERE id = ?', [appointment_link, templateSelected, phone, fb_link, insta_link, linkedin_link, profile_id]);
            // Insert new link data
            for (const item of data) {
                const query = 'INSERT INTO links (profilesId, type, link, name, heading, sort_order) VALUES (?, ?, ?, ?, ?, ?)';
                const values = [
                    profile_id,
                    item.type,
                    item.type !== undefined ? item.link : null,
                    item.type !== undefined ? item.name : null,
                    item.type === 'heading' ? item.heading : null,
                    item.order
                ];
                await connection.query(query, values);
            }

            // Commit the transaction
            await connection.commit();
            connection.release();

            res.status(200).json({ message: 'Links updated successfully' });
        } catch (error) {
            // Rollback the transaction in case of error
            await connection.rollback();
            connection.release();
            console.error("Error in transaction:", error);
            res.status(500).json({ message: 'Error updating links' });
        }
   
});


module.exports = router;