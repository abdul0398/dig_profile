const router = require("express").Router();


router.post("/api/orders/create", async (req,res)=>{
    if (req.headers.authorization) {
        const token = req.headers.authorization.split(" ")[1];
        if(token !== process.env.TOKEN){
            return res.status(401).json({message:"Token is not valid or not present "});
        }
        console.log(req.body);
        console.log("Token:", token);
       res.status(200).json("Order Saved Successfully");
    } else {
        res.status(401).json({message:"Token is not valid or not present "});
    }
});
module.exports = router;