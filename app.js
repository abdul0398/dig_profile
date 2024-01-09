require('dotenv').config()
const setMiddleWares = require("./middlewares/express.js");
const {adminroute, profileroute, clientroute, FormRoute, LeadRoute} = require("./routes");
const setupDb = require("./services/dbHandler.js");
async function start() {
    const {app, express} = await setMiddleWares();
    await setupDb();
    app.use("/uploads", express.static("uploads"));
    app.use([adminroute, profileroute, clientroute, FormRoute, LeadRoute]);
    app.use((req,res)=>{
        res.render("error.ejs");
    })
    app.listen(3000, ()=>{
        console.log("##### Express Server Started at port 3000 #####");
    })
}
start();