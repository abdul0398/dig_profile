const router = require("express").Router();
const multer = require("multer");
const { verify, isAdmin } = require("../middlewares/verify");

const upload = multer({ dest: 'uploads/' })


router.get("/orders", verify, isAdmin, async (req, res, next) => {
    try {
        const [orders] = await __pool.query("SELECT * FROM orders WHERE status = 'pending'");
        res.render("orders.ejs", { orders });
    } catch (error) {
        console.log(error);
        next();
    }
})
.post("/api/orders/create", upload.array(), async (req, res) => {
    try {
        const {rawRequest} = req.body;
        console.log(rawRequest);
        console.log(JSON.parse(rawRequest));
        const {
            q2_fullName_1:name,
            q3_mail_2 :email,
            q4_phone_3:phone,
            q20_typeA : cea_number,
            q13_whatProperty:propertiesPortal,
         } = JSON.parse(rawRequest);
         console.log(name, email, phone, cea_number, propertiesPortal);
        res.status(200).json("Order Saved Successfully");
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
})
.get("/api/orders/status/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [order] = await __pool.query("UPDATE orders SET status = ? WHERE id = ? ", ["closed", id]);
        res.status(200).json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
})
.get("/api/orders/delete/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [order] = await __pool.query("DELETE FROM orders WHERE id = ?", [id]);
        res.status(200).json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
})



module.exports = router;
