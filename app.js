require('dotenv').config()
const setMiddleWares = require("./middlewares/express.js");
const {authroute, profileroute} = require("./routes");
const setupDb = require("./services/dbHandler.js");
async function start() {
    const app = await setMiddleWares();
    await setupDb();
    app.use(authroute);
    app.use(profileroute);

    app.use((req,res)=>{
        res.render("error.ejs");
    })
    app.listen(3000, ()=>{
        console.log("##### Express Server Started at port 3000 #####");
    })
}
start();