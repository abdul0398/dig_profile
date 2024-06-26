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
    // await addTiktok();
}







start();