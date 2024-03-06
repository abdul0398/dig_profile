require('dotenv').config()
const setMiddleWares = require("./middlewares/express.js");
const {adminroute, profileroute, clientroute, FormRoute, LeadRoute, orderRoute} = require("./routes");
const crypto = require("crypto");
const setupDb = require("./services/dbHandler.js");
async function start() {
    const {app, express} = await setMiddleWares();
    await setupDb();
    app.use("/uploads", express.static("uploads"));
    app.use([adminroute, profileroute, clientroute, FormRoute, LeadRoute, orderRoute]);
    app.use((req,res)=>{
        res.render("error.ejs");
    })
    app.listen(3000, async ()=>{
        console.log("##### Express Server Started at port 3000 #####");
    })
    await addTiktok();
}

async function addTiktok() {
    try {
        const [rows] = await __pool.query("SELECT * FROM profiles");
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const [sections] = await __pool.query("SELECT * FROM sections WHERE profileId = ?", [row.id]);
            const socialSections = sections.filter(section => section.type == "socials");
            for (let j = 0; j < socialSections.length; j++) {
                const socialSection = socialSections[j];
                const tiktok = {
                    type: "tiktok",
                    name: "Tiktok",
                    link: ""
                };

                const [tiktoks] = await __pool.query("SELECT * FROM links WHERE sectionId = ? AND type = ?", [socialSection.id, tiktok.type ]);
                if (tiktoks.length > 0) continue;
                await __pool.query("INSERT INTO links (type, name, link, sectionId) VALUES (?, ?, ?, ?)", [tiktok.type, tiktok.name, tiktok.link, socialSection.id]);
            }
        }
    } catch (error) {
        console.error("Error adding TikTok links:", error);
    }
}






start();