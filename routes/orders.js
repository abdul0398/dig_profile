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
        const data = extractData(JSON.parse(rawRequest))
        console.log(data);
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



function extractData(data) {
    // Extracting specific fields
    const fullName = `${data.q2_fullName_1.first} ${data.q2_fullName_1.last}`;
    const email = data.q3_mail_2;
    const phone = data.q4_phone_3.full;
    const ceaNo = data.q20_typeA;
    const propertiesListings = data.q13_whatProperty;
    const propertyLinks = q7_longText_6;
    const socials = data.q16_whatAre;
    const socialLinks = data.q18_kindlyShare;
    const aboutUs = data.q8_longText_7;
    const feedback = data.q11_longText_10;

  
    // Extracting image links
    const imageLinks = [
      ...data.uploadYour,
      ...data.addOn
    ];
  
    // Returning the extracted data
    return {
      fullName,
      email,
      phone,
      typeA,
      imageLinks
    };
  }



module.exports = router;
