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
        const [orders] = await __pool.query(`SELECT COUNT(*) FROM orders WHERE status = 'pending'`);
        res.render("dashboard.ejs", {clients: clients, profiles: profiles, orders:orders[0]["COUNT(*)"]});
    }else{
        const [profiles] = await __pool.query(`SELECT name, id FROM profiles WHERE client_id = ?`, [req.user.id]);
        res.render("dashboard.ejs", {clients: [], profiles: profiles});
    }
}).post("/api/profile/create",verify, isAdmin, async (req,res)=>{
    const { name, clientID } = req.body;

try {
    // Check if a profile already exists with the same name for the client
    const [existingProfiles] = await __pool.query(
        'SELECT * FROM profiles WHERE name = ? AND client_id = ?',
        [name, clientID]
    );
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

        // Create base profile folder and nested folders
        await Promise.all([
            fsPromises.mkdir(baseProfilePath, { recursive: true }),
            fsPromises.mkdir(galleryPath, { recursive: true }),
            fsPromises.mkdir(profileImgPath, { recursive: true }),
            fsPromises.mkdir(awards, { recursive: true }),
            fsPromises.mkdir(testimonials, { recursive: true }),
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

}).post("/api/profile/edit/profileName/:profileId", verify, isAdmin, async (req,res)=>{
    const {profileId} = req.params;
    const {name} = req.body;
    try {
        const updateQuery = `UPDATE profiles SET name = ? WHERE id = ?`;
        await __pool.query(updateQuery, [name, profileId]);
        res.status(200).json("Successfully Updated");
    } catch (error) {
        console.log("Error in updating profile", error.message);
    }
}).get("/api/profile/delete/:profileId", verify, isAdmin, async (req,res)=>{
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
}).get("/profile/:profileId/:profilename", async (req,res)=>{
    try {
    const {profileId, profilename} = req.params;

        const [rows] = await __pool.query(`SELECT * FROM profiles WHERE id = ? && name = ?`, [profileId, profilename.trim()]);
        if(rows.length === 0){
            console.log("Profile not found");
            return res.redirect("/error");
        }
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

        if(sortOrder){            
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

            const linksOrder = section.sortOrder;
            if (linksOrder && linksOrder.length == sectionLinks.length) {    
                // Sorting links based on the order specified in the section
                const linkMap = new Map(sectionLinks.map(link => [link.id.toString(), link]));
                const sortedLinks = linksOrder.map(id => linkMap.get(id));
    
                sectionLinkMap[sectionHeading] = {
                    links: sortedLinks,
                    type: sectionType
                  };

            }else{
                sectionLinkMap[sectionHeading] = {
                    links: sectionLinks,
                    type: sectionType
                  };
            }
        };

        socialsections = sections.filter(section => section.type === "socials");
        const socialobj = {}
        if(socialsections.length > 0){
            const socialLinks = responseData.links.filter(link => link.sectionId === socialsections[0].id);
            socialLinks.forEach(link => {
                socialobj[link.type] = {
                    name:link.name,
                    type: link.type,
                    link:link.link
                };
           })
        }

        let btnColor ;
        switch (template) {
            case 1:
                btnColor = "#0066C9";
                break;
            case 2:
                btnColor = "#B68E00";
                break;
            case 3:
                btnColor = "#ff1212";
                break;
            case 4:
                btnColor = "#896a50";
                break;
            case 5:
                btnColor = "#59a2bf";
                break;
            case 6:
                btnColor = "#b1a08d";
                break;
        }
        return res.render(`templates/temp${template}.ejs`, {sections:sectionLinkMap, profile:profile[0], social:socialobj, btnColor:btnColor});
    } catch (error) {
        console.error("Error in fetching profile", error.message);
        res.redirect("/error");
    }
}).post("/api/profile/uploadPhoto", verify,  upload.single('profile_image'), async (req,res)=>{
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
}).get("/api/profile/fetch/:profileId", verify, async (req,res)=>{
    const { profileId } = req.params;
try {
    const [profile] = await __pool.query(`SELECT * FROM profiles WHERE id = ?`, [profileId]);

    if (profile.length === 0) {
        return res.status(404).json({ message: "Profile not found" });
    }

    const responseData = {};

    let [sections] = await __pool.query(`SELECT * FROM sections WHERE profileId = ?`, [profile[0].id]);

    // Sorting sections Based on Sorting order stored in profile
    const sortOrder = profile[0].section_ordering;

    if (sortOrder && sortOrder.length === sections.length) {
        const sectionMap = new Map(sections.map(section => [section.id.toString(), section]));
        const sortedSections = sortOrder.map(id => sectionMap.get(id));

        sections = sortedSections.filter(section => section !== undefined);
    }

    for (const section of sections) {
        const sectionLinksOrder = section.sortOrder; // Assuming sortOrder is a JSON string
        const [links] = await __pool.query(`SELECT * FROM links WHERE sectionId = ?`, [section.id]);
        if (sectionLinksOrder && sectionLinksOrder.length > 0) {
            
            // Sorting links based on the order specified in the section
            const linkMap = new Map(links.map(link => [link.id.toString(), link]));
            const sortedLinks = sectionLinksOrder.map(id => linkMap.get(id));
            
            section.links = sortedLinks.filter(link => link !== undefined);
        } else {
            section.links = links;
        }
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
}).post("/upload/gallery/:id",verify, upload.single('image'), (req,res)=>{
    res.status(200).json({message:"Image uploaded successfully", file:req.file.filename});
}).get("/api/get/gallery/:id/:galleryname",verify, (req,res)=>{
    const {id, galleryname} = req.params;
    const galleryPath = path.join("uploads", id, "gallery", galleryname);

    fs.readdir(galleryPath, (err, files) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Error reading gallery directory" });
        }

        res.status(200).json({images:files});
    });

}).delete(`/api/delete/gallery/:id/:galleryname`,verify, (req, res) => {
    const { id, galleryname } = req.params;
    const { imagePath } = req.body;
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
        const [rows] = await __pool.query(`SELECT profile_img_path,about_us, template_selected from profiles WHERE id = ?`, [profileId]);
        res.render("aboutUs.ejs", {about_us:rows[0].about_us, img_link:rows[0].profile_img_path, id:profileId, temp:rows[0].template_selected});
    } catch (error) {
        console.log(error.message);
        res.redirect("/error");
    }

}).post("/api/section/changeName/:id",verify, async (req,res)=>{
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
}).post("/api/gallery/create",verify, async (req,res)=>{
    const {id, galleryname} = req.body;

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

}).post("/api/link/update/visibility",verify, async (req,res)=>{
    const {id, hidden, type, profile_id} = req.body;
    try {
        if(type){
            await __pool.query(`UPDATE sections SET ${type} = ? WHERE id = ?`, [hidden, profile_id]);
            return res.status(200).json({message:"Sucessfully Changed"});
        }
        await __pool.query(`UPDATE links SET hidden = ? WHERE id = ?`, [hidden, id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/link/update/valueAndname", verify, async (req,res)=>{
    const {id, value, name} = req.body;
    try {
        await __pool.query(`UPDATE links SET link = ?, name = ? WHERE id = ?`, [value, name, id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/link/update/link", verify, async (req,res)=>{
    const {id, newName} = req.body;
    try {
        await __pool.query(`UPDATE links SET name = ? WHERE id = ?`, [newName, id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/profile/update/info",verify, async (req,res)=>{
    const {name, id, value} = req.body;
    try {
        await __pool.query(`UPDATE profiles SET ${name} = ? WHERE id = ?`, [value, id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/link/create",verify, async (req,res)=>{
    const {id, name, type, link} = req.body;
    try {
        const [row] = await __pool.query(`INSERT INTO links (name, type, link, sectionId, permanent) VALUES(?, ?, ?, ?, ?)`, [name, type, link, id, false]);
        res.status(200).json({message:"Sucessfully Created", id:row.insertId});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/link/delete",verify, async (req,res)=>{
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
         // Remove the link id from the sortOrder in the associated section
    const [section] = await __pool.query(`SELECT * FROM sections WHERE id = ?`, [link[0].sectionId]);

    if (section.length > 0) {
        const sortOrder = section[0].sortOrder; // Assuming sortOrder is a JSON string

        if (sortOrder && sortOrder.includes(id.toString())) {
            // Remove the link id from the sortOrder
            const updatedSortOrder = sortOrder.filter(linkId => linkId !== id);

            // Update the sortOrder in the database
            await __pool.query(`UPDATE sections SET sortOrder = ? WHERE id = ?`, [JSON.stringify(updatedSortOrder), link[0].sectionId]);
        }
    }


        res.status(200).json({message:"Sucessfully Deleted a Link"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/section/create",verify, async (req,res)=>{
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
}).post("/api/section/sortOrder",verify, async (req,res)=>{
   const {sectionId, ids} = req.body;
    try {
        await __pool.query(`UPDATE sections SET sortOrder = ? WHERE id = ?`, [JSON.stringify(ids), sectionId]);
        res.status(200).json({message:"Sucessfully Changed"});
    }catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/section/delete",verify, async (req,res)=>{
    const {id} = req.body;
    try {
        const [section] = await __pool.query(`SELECT * FROM sections WHERE id = ?`, [id]);

        await __pool.query(`DELETE FROM sections WHERE id = ?`, [id]);

        const [profile] = await __pool.query(`SELECT * FROM profiles WHERE id = ?`, [section[0].profileId]);

        if (profile.length > 0) {
            const sortOrder = profile[0].section_ordering; // Assuming sortOrder is a JSON string
    
            if (sortOrder && sortOrder.includes(id.toString())) {
                // Remove the link id from the sortOrder
                const updatedSortOrder = sortOrder.filter(sectionId => sectionId !== id);
    
                // Update the sortOrder in the database
                await __pool.query(`UPDATE profiles SET section_ordering = ? WHERE id = ?`, [JSON.stringify(updatedSortOrder), section[0].profileId]);
            }
        }


        res.status(200).json({message:"Sucessfully Deleted a Section"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/section/update/visibility",verify, async (req,res)=>{
    const {id, hidden, type, profile_id} = req.body;
    try {
        await __pool.query(`UPDATE sections SET hidden = ? WHERE id = ?`, [hidden, id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/profile/sortOrder",verify, async (req,res)=>{
    const {id, sort_order} = req.body;
    try {
        await __pool.query(`UPDATE profiles SET section_ordering = ? WHERE id = ?`, [JSON.stringify(sort_order), id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/profile/update/aboutUs",verify, async (req,res)=>{
    const {id, aboutUs} = req.body;
    try {
        const fieldName = aboutUs[0];
        const trimAboutus = aboutUs.slice(1);
        await __pool.query(`UPDATE profiles SET about_us = ? WHERE id = ?`, [JSON.stringify(trimAboutus), id]);
        await __pool.query(`UPDATE links SET name = ? WHERE type = "about_us" AND sectionId IN (SELECT id from sections WHERE profileId = ?)`, [fieldName, id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).get("/api/profiles/:profileId/get/about_us",verify, async (req,res)=>{
    const {profileId} = req.params;
    try {
        const [rows] = await __pool.query(`SELECT about_us from profiles WHERE id = ?`, [profileId]);
        const [about_us] = await __pool.query('SELECT * from links where type = "about_us" AND sectionId IN (SELECT id from sections WHERE profileId = ?)', [profileId]);
        const fieldName = about_us[0].name;
        res.status(200).json({about_us:rows[0].about_us, fieldName:fieldName});
    } catch (error) {
        console.log(error.message);
        res.redirect("/error");
    }
}).post("/api/profile/update/template",verify, async (req,res)=>{
    const {id, template} = req.body;
    try {
        await __pool.query(`UPDATE profiles SET template_selected = ? WHERE id = ?`, [template, id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/profile/update/sectionsOrder",verify, async (req,res)=>{
    const {id, sectionsIds} = req.body;
    try {
        await __pool.query(`UPDATE profiles SET section_ordering = ? WHERE id = ?`, [JSON.stringify(sectionsIds), id]);
        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }

}).get("/gallery/:profileId/:galleryname", async (req,res)=>{
    const {profileId, galleryname} = req.params;
    try {
        res.render("showgallery.ejs", {id:profileId, galleryname:galleryname.trim()});
    } catch (error) {
        console.log(error.message);
        res.redirect("/error");
    }
}).post("/api/gallery/changeName/:oldName",verify, async (req,res)=>{
    const {oldName} = req.params;
    const {id, newName, profileId} = req.body;
    try {
        const gallerypath = path.join("uploads", String(profileId), "gallery" , oldName);
        // check if the gallery already exists with that name

        const newgallerypath = path.join("uploads", String(profileId), "gallery" , newName);
        if (fs.existsSync(newgallerypath)) {
            return res.status(400).json({message:`Gallery with ${newName} is already present`});
        }
        if (fs.existsSync(gallerypath)) {
            await fsPromises.rename(gallerypath, newgallerypath);
        }

        //Also change name of link 
        await __pool.query(`UPDATE links SET name = ? WHERE id = ?`, [newName, id]);

        res.status(200).json({message:"Sucessfully Changed"});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Server Error"});
    }
}).post("/api/form/update/name",verify, async (req,res)=>{
    const {id, name, type, newName} = req.body;
    try {
        if(type == "leadform" || type == "bookform"){
            await __pool.query(`UPDATE links SET name = ? WHERE id = ?`, [newName, id]);
            res.status(200).json({message:"Sucessfully Changed"});
        }else{
            const [forms] = await __pool.query(`SELECT * FROM form WHERE name = ?`, [newName]);
            if(forms.length > 0){
                return res.status(400).json({message:"Form with this name already exists"});
            }
            await __pool.query(`UPDATE form SET name = ? WHERE name = ?`, [newName, name]);
            await __pool.query(`UPDATE links SET name = ? WHERE id = ?`, [newName, id]);
            res.status(200).json({message:"Sucessfully Changed"});
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Something Went Wrong"});
    }

}).get("/api/profile/fetch/analytics/:profileId", verify, async (req,res)=>{
    const {profileId} = req.params;
    try {
        const [rows] = await __pool.query(`SELECT * FROM profiles WHERE id = ?`, [profileId]);
        const [sections] = await __pool.query(`SELECT * FROM sections WHERE profileId = ?`, [profileId]);
        const [links] = await __pool.query(`SELECT * FROM links WHERE sectionId IN (?)`, [sections.map(section => section.id)]);
        res.status(200).json({profile:rows[0], links:links});
    } catch (error) {
        console.log(error.message);
        res.redirect("/error");
    }
})



module.exports = router;