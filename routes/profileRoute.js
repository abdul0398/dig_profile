const express = require("express");
const router = express.Router();
const {verify , isAdmin, preUploadMiddleware} = require("../middlewares/verify.js");
const multer = require('multer');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const {sections} = require("../seed.js");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const {profile_id, dp, gallery_name} = req.body;
      if(dp == "false"){
        cb(null, `uploads/${profile_id}/gallery/${gallery_name}`)
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
    const { name, clientID } = req.body;

try {
    // Check if a profile already exists with the same name for the client
    const [existingProfiles] = await __pool.query(
        'SELECT * FROM profiles WHERE name = ? AND client_id = ?',
        [name, clientID]
    );
        console.log(existingProfiles);
    if (existingProfiles.length > 0) {
        return res.status(400).json({ message: 'Profile with this name already exists for the client.' });
    }

    const [rows] = await __pool.query(
        'INSERT INTO profiles (name, client_id, about_us) VALUES (?, ?, ?)',
        [name, clientID, JSON.stringify([])]
    );

    if (rows.insertId) {
        const baseProfilePath = path.join('uploads', String(rows.insertId));
        const galleryPath = path.join(baseProfilePath, 'gallery');
        const profileImgPath = path.join(baseProfilePath, 'profileImg');
        const awards = path.join(galleryPath, 'Awards');
        const testimonials = path.join(galleryPath, 'Testimonials');
        const about = path.join(galleryPath, 'About');

        // Create base profile folder and nested folders
        await Promise.all([
            fsPromises.mkdir(baseProfilePath, { recursive: true }),
            fsPromises.mkdir(galleryPath, { recursive: true }),
            fsPromises.mkdir(profileImgPath, { recursive: true }),
            fsPromises.mkdir(awards, { recursive: true }),
            fsPromises.mkdir(testimonials, { recursive: true }),
            fsPromises.mkdir(about, { recursive: true })
        ]);

        // Create Default Sections
        for (const section of sections) {
            const [insertedSection] = await __pool.query(
                'INSERT INTO sections (heading, type, isDynamic, profileId) VALUES (?, ?, ?, ?)',
                [section.heading, section.type, section.isDynamic, rows.insertId]
            );

            // Insert links for the section
            await Promise.all(
                section.links.map(link =>
                    __pool.query(
                        'INSERT INTO links (type, name, link, sectionId) VALUES (?, ?, ?, ?)',
                        [link.type, link.name, link.link, insertedSection.insertId]
                    )
                )
            );
        }

        // Create Default Form
        await __pool.query(
            'INSERT INTO form (name, profileId, discords, questions, emails) VALUES (?, ?, ?, ?, ?)',
            ['Default', rows.insertId, JSON.stringify([]), JSON.stringify([]), JSON.stringify([])]
        );

        return res.status(200).json({ message: 'Profile created successfully', id: rows.insertId });
    } else {
        return res.status(500).json({ message: 'Failed to create profile.' });
    }
} catch (error) {
    console.error('Error in creating profile', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
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
        
        const responseData = {};
    
        let [sections] = await __pool.query(`SELECT * FROM sections WHERE profileId = ? AND hidden = ?`, [profile[0].id, false]);
        // Sorting sections Based on Sording order stored in profile
        const sortOrder = profile[0].section_ordering;

        if(sortOrder && sortOrder.length == sections.length){            
            const sectionMap = new Map(sections.map(section => [section.id.toString(), section]));
            const sortedSections = sortOrder.map(id => sectionMap.get(id));

            sections =  sortedSections.filter(section => section !== undefined);
        }
        const sectionsIds = sections.map((section) => section.id);
    
        if(sectionsIds.length > 0){
            const [links] = await __pool.query(`SELECT * from links WHERE sectionId IN (?) AND hidden = ?`, [sectionsIds, false]);
            responseData.links = links;
        }else{
            responseData.links = [];
        }
    
        responseData.profile = profile[0];
        responseData.sections = sections || [];
        const sectionLinkMap = {};

        for (const section of responseData.sections) {
            const sectionId = section.id;
            const sectionType = section.type;
            if(sectionType === "socials"){
                continue;
            }
            const sectionHeading = section.heading;
            const sectionLinks = responseData.links.filter(link => link.sectionId === sectionId);
            sectionLinkMap[sectionHeading] = {
                links: sectionLinks,
                type: sectionType
              };
        };

        socialsections = sections.filter(section => section.type === "socials");
        const socialobj = {}
        if(socialsections.length > 0){
            const socialLinks = responseData.links.filter(link => link.sectionId === socialsections[0].id);
            socialLinks.forEach(link => {
                socialobj[link.name] = link.link;
           })
        }

        console.log(socialobj);
        return res.render(`temp${template}.ejs`, {sections:sectionLinkMap, profile:profile[0], social:socialobj});
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
    
        if (profile.length === 0) {
            return res.status(404).json({ message: "Profile not found" });
        }
        const responseData = {};
    
        let [sections] = await __pool.query(`SELECT * FROM sections WHERE profileId = ?`, [profile[0].id]);

        // Sorting sections Based on Sording order stored in profile
        const sortOrder = profile[0].section_ordering;

        if(sortOrder && sortOrder.length == sections.length){            
            const sectionMap = new Map(sections.map(section => [section.id.toString(), section]));
            const sortedSections = sortOrder.map(id => sectionMap.get(id));

            sections =  sortedSections.filter(section => section !== undefined);
        }
        const sectionsIds = sections.map((section) => section.id);
    
        if(sectionsIds.length > 0){
            const [links] = await __pool.query(`SELECT * from links WHERE sectionId IN (?)`, [sectionsIds]);
            responseData.links = links;
        }else{
            responseData.links = [];
        }
        const [forms] = await __pool.query(`SELECT * FROM form WHERE profileId = ?`, [profileId]);
    
        responseData.profile = profile[0];
        responseData.sections = sections || [];
        responseData.forms = forms || [];
    
        return res.status(200).json(responseData);
    } catch (error) {
        console.error("Error in fetching profile:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}).get("/api/linkcount/:linkId", async (req,res)=>{
    const {linkId} = req.params;
    try {
        const updateQuery = `UPDATE links SET click_count = click_count + 1 WHERE id = ?`;
        await __pool.query(updateQuery, [linkId]);
        res.status(200).json("Updated");
    } catch (error) {
        console.log("Error in updating link count", error.message);
        res.status(500).json({message:"Internal Server Error"});
    }
}).post("/upload/gallery/:id", upload.single('image'), (req,res)=>{
    res.status(200).json({message:"Image uploaded successfully", file:req.file.filename});
}).get("/api/get/gallery/:id/:galleryname", (req,res)=>{
    const {id, galleryname} = req.params;
    const galleryPath = path.join("uploads", id, "gallery", galleryname);

    fs.readdir(galleryPath, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Error reading gallery directory" });
        }

        res.status(200).json({images:files});
    });

}).delete(`/api/delete/gallery/:id/:galleryname`, (req, res) => {
    const { id, galleryname } = req.params;
    const { imagePath } = req.body;
    console.log(galleryname);
    if (fs.existsSync(`uploads/${id}/gallery/${galleryname}/${imagePath}`)) {
        // Delete the file
        fs.unlink(`uploads/${id}/gallery/${galleryname}/${imagePath}`, (err) => {
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

}).post("/api/section/changeName/:id", async (req,res)=>{
    const {heading} = req.body;
    const {id} = req.params;
    try {
        const updateQuery = `UPDATE sections SET heading = ? WHERE id = ?`;
        await __pool.query(updateQuery, [heading, id]);
        res.status(200).json({message:"Heading Changed Successfully"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Something Went Wrong"})
    }
}).post("/api/gallery/create", async (req,res)=>{
    const {id, galleryname} = req.body;
    console.log(req.body);

    try {
        const gallerypath = path.join("uploads", String(id), "gallery" , galleryname);
        if (fs.existsSync(gallerypath)) {
            return res.status(400).json({message:`Gallery with ${galleryname} is already present`});        
        }
        await fsPromises.mkdir(gallerypath, { recursive: true });
        res.status(200).json({message:`Gallery Named ${galleryname} Created Successfully`});        
    } catch (error) {
        console.log(error);
        return res.status(500).json({message:"Error in creating folders for gallery"});        
    }

}).post("/api/link/update/visibility", async (req,res)=>{
    const {id, hidden, type, profile_id} = req.body;
    try {
        if(type){
            await __pool.query(`UPDATE profiles SET ${type} = ? WHERE id = ?`, [hidden, profile_id]);
            return res.status(200).json({message:"Sucessfully Changed"});
        }
        await __pool.query(`UPDATE links SET hidden = ? WHERE id = ?`, [hidden, id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/link/update/value", async (req,res)=>{
    const {id, value} = req.body;
    try {
        await __pool.query(`UPDATE links SET link = ? WHERE id = ?`, [value, id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/profile/update/info", async (req,res)=>{
    const {name, id, value} = req.body;
    try {
        await __pool.query(`UPDATE profiles SET ${name} = ? WHERE id = ?`, [value, id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/link/create", async (req,res)=>{
    const {id, name, type, link} = req.body;
    try {
        const [row] = await __pool.query(`INSERT INTO links (name, type, link, sectionId, permanent) VALUES(?, ?, ?, ?, ?)`, [name, type, link, id, false]);
        res.status(200).json({message:"Sucessfully Created", id:row.insertId});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/link/delete", async (req,res)=>{
    const {id, profile_id} = req.body;
    try {
        //also delete the folder if it is a gallery
        const [link] = await __pool.query(`SELECT * FROM links WHERE id = ?`, [id]);
        if(link[0].type == "gallery"){
            const galleryPath = path.join("uploads", profile_id, "gallery", link[0].name);
            if (fs.existsSync(galleryPath)) {
                await fs.promises.rmdir(galleryPath, { recursive: true });
            }
        }else if (link[0].type == "form"){
            await __pool.query('DELETE FROM form WHERE name = ? AND profileId = ?', [link[0].name, profile_id]);
        }
        await __pool.query(`DELETE FROM links WHERE id = ?`, [id]);
        res.status(200).json({message:"Sucessfully Deleted a Link"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/section/create", async (req,res)=>{
    const {id, name} = req.body;
    try {
        //check if the section already exists
        const [section] = await __pool.query(`SELECT * FROM sections WHERE profileId = ? AND heading = ?`, [id, name]);
        if(section.length > 0){
            return res.status(400).json({message:"Section Already Exists with this name"});
        }
        const [row] = await __pool.query(`INSERT INTO sections (heading, profileId, permanent, isDynamic) VALUES(?, ?, ?, ?)`, [name, id, false, true]);
        res.status(200).json({message:"Sucessfully Created", id:row.insertId});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/section/delete", async (req,res)=>{
    const {id} = req.body;
    try {
        await __pool.query(`DELETE FROM sections WHERE id = ?`, [id]);
        res.status(200).json({message:"Sucessfully Deleted a Section"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/section/update/visibility", async (req,res)=>{
    const {id, hidden, type, profile_id} = req.body;
    try {
        if(type){
            await __pool.query(`UPDATE profiles SET ${type} = ? WHERE id = ?`, [hidden, profile_id]);
            return res.status(200).json({message:"Sucessfully Changed"});
        }
        await __pool.query(`UPDATE sections SET hidden = ? WHERE id = ?`, [hidden, id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/profile/sortOrder", async (req,res)=>{
    const {id, sort_order} = req.body;
    try {
        await __pool.query(`UPDATE profiles SET section_ordering = ? WHERE id = ?`, [JSON.stringify(sort_order), id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/profile/update/aboutUs", async (req,res)=>{
    const {id, aboutUs} = req.body;
    try {
        await __pool.query(`UPDATE profiles SET about_us = ? WHERE id = ?`, [JSON.stringify(aboutUs), id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).get("/api/profiles/:profileId/get/about_us", async (req,res)=>{
    const {profileId} = req.params;
    try {
        const [rows] = await __pool.query(`SELECT about_us from profiles WHERE id = ?`, [profileId]);
        res.status(200).json({about_us:rows[0].about_us});
    } catch (error) {
        console.log(error.message);
        res.redirect("/error");
    }
}).post("/api/profile/update/template", async (req,res)=>{
    const {id, template} = req.body;
    try {
        await __pool.query(`UPDATE profiles SET template_selected = ? WHERE id = ?`, [template, id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).get("/gallery/:profileId/:galleryname", async (req,res)=>{
    const {profileId, galleryname} = req.params;
    try {
        res.render("showgallery.ejs", {id:profileId, galleryname:galleryname});
    } catch (error) {
        console.log(error.message);
        res.redirect("/error");
    }


})


module.exports = router;