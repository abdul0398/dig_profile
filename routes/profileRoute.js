const express = require("express");
const router = express.Router();
const {verify , isAdmin, preUploadMiddleware} = require("../middlewares/verify.js");
const multer = require('multer');
const fs = require('fs');
const fsPromises = fs.promises
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const {profile_id, dp} = req.body;
      if(dp == "false"){
        cb(null, `uploads/${profile_id}/gallery`)
      }else{
        cb(null, `uploads/${profile_id}/profileImg`)

      }
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix + file.originalname);
    }
  })  
  const upload = multer({ storage: storage })

router.get("/", verify, async(req,res)=>{
    if(req.user.role == "admin"){
        const [profiles] = await __pool.query(`SELECT name, id FROM profiles`);
        const [clients] = await __pool.query(`SELECT name, id FROM clients`);
        res.render("dashboard.ejs", {clients: clients, profiles: profiles});
    }else{
        const [profiles] = await __pool.query(`SELECT name, id FROM profiles WHERE client_id = ?`, [req.user.id]);
        res.render("dashboard.ejs", {clients: [], profiles: profiles});
    }
}).post("/addprofile",verify, isAdmin, async (req,res)=>{
    const {name, clientID} = req.body;
    try {
        
        // Check if a profile already exists with the same name for the client
        const checkQuery = `SELECT * FROM profiles WHERE name = ? AND client_id = ?`;
        const [existingProfiles] = await __pool.query(checkQuery, [name, clientID]);

        if (existingProfiles.length > 0){
            return res.status(400).json({ message: "Profile with this name already exists for the client." });
        }
        const insertQuery = `INSERT INTO profiles (name, client_id) VALUES (?, ?)`
        const [rows] = await __pool.query(insertQuery, [name, clientID]);
        if (rows.insertId) {
            const baseProfilePath = path.join("uploads", String(rows.insertId));
            const galleryPath = path.join(baseProfilePath, "gallery");
            const profileImgPath = path.join(baseProfilePath, "profileImg");

            // Create base profile folder
            await fsPromises.mkdir(baseProfilePath, { recursive: true });

            // Create nested folders
            await fsPromises.mkdir(galleryPath, { recursive: true });
            await fsPromises.mkdir(profileImgPath, { recursive: true });

            // ... remaining code for insertQueryForm ...
            const insertQueryForm = `INSERT INTO form (name, profileId, discords, questions, emails) VALUES (?, ?, ?, ?, ?)`;
            await __pool.query(insertQueryForm, ["Default", rows.insertId, JSON.stringify([]),JSON.stringify([]), JSON.stringify([])]);

            res.status(200).json({ message: "Profile created Successfully", id: rows.insertId });
        }else{
            res.status(500).json({ message: "Failed to create profile." });
        }
    } catch (error) {
        console.log('Error in creating profile', error.message);
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
        const profileFolderPath = path.join("uploads", profileId);

        // Delete the profile folder and its contents
        if (fs.existsSync(profileFolderPath)) {
            await fs.promises.rmdir(profileFolderPath, { recursive: true });
        }

        const deleteQuery = `DELETE FROM profiles WHERE id = ?`;
        await __pool.query(deleteQuery, [profileId]);
        res.redirect("/clients");
    } catch (error) {
        console.log("Error in deleting profile", error.message);
        res.redirect("/error");
    }
}).get("/profile/:profileId", async (req,res)=>{
    const profile_base64 = req.params.profileId;
    const decodedString = Buffer.from(profile_base64, 'base64').toString('ascii');
    const delimiter = "--";
    const parts = decodedString.split(delimiter);
    const profileId = parts[0];
    try {
        // update the view count
        const updateQuery = `UPDATE profiles SET views = views + 1 WHERE id = ?`;
        await __pool.query(updateQuery, [profileId]);

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
    const {name, profile_id, data, templateSelected, phone, fb_link, insta_link, linkedin_link, about_us, description} = req.body;
    const connection = await __pool.getConnection();
        try {
            // Start a transaction
            await connection.beginTransaction();

            // Delete all existing links for the profile
            const deleteQuery = 'DELETE FROM links WHERE profilesId = ?';
            await connection.query(deleteQuery, [profile_id]);
            
            // Changing the template 
            await connection.query('UPDATE profiles SET name = ?, description = ?, about_us  = ?, template_selected = ?, phone = ?, fb_link = ?, insta_link = ?, linkedin_link = ? WHERE id = ?', [name, description, JSON.stringify(about_us), templateSelected, phone == ""?null:phone, fb_link ==""? null:fb_link, insta_link == ""?null:insta_link, linkedin_link == ""?null:linkedin_link, profile_id]);
            
            // Insert new link data
            for (const item of data) {
                const query = 'INSERT INTO links (profilesId, type, link, name, heading, sort_order) VALUES (?, ?, ?, ?, ?, ?)';
                const values = [
                    profile_id,
                    item.type,
                    item.type !== undefined ? item.link : null,
                    item.type !== undefined ? item.name : null,
                    item.type === 'heading' ? item.heading : null,
                    item.order,
                    
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
   
}).get("/api/linkcount/:linkId", (req,res)=>{
    const {linkId} = req.params;
    console.log(linkId);
    const updateQuery = `UPDATE links SET click_count = click_count + 1 WHERE id = ?`;
    __pool.query(updateQuery, [linkId]);
    res.status(200).json("Updated");
}).post("/upload/gallery/:id", upload.single('image'), (req,res)=>{
    res.status(200).json({message:"Image uploaded successfully", file:req.file.filename});
}).get("/api/get/gallery/:id", (req,res)=>{
    const {id} = req.params;
    const galleryPath = path.join("uploads", id, "gallery");

    fs.readdir(galleryPath, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Error reading gallery directory" });
        }

        res.status(200).json({images:files});
    });

}).delete(`/api/delete/gallery/:id`, (req, res) => {
    const { id } = req.params;
    const { imagePath } = req.body;
    if (fs.existsSync(`uploads/${id}/gallery/${imagePath}`)) {
        // Delete the file
        fs.unlink(`uploads/${id}/gallery/${imagePath}`, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Error deleting the image" });
            }
            res.status(200).json({ message: "Image deleted successfully" });
        });
    } else {
        res.status(404).json({ message: "Image not found" });
    } 
}).get("/aboutus/:profileId", async (req,res)=>{
    const {profileId} = req.params;
    try {
        const [rows] = await __pool.query(`SELECT profile_img_path,about_us from profiles WHERE id = ?`, [profileId]);
        res.render("aboutUs.ejs", {about_us:rows[0].about_us, img_link:rows[0].profile_img_path, id:profileId});
    } catch (error) {
        console.log(error.message);
        res.redirect("/error");
    }

})


module.exports = router;