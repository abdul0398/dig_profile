const router = require("express").Router();
const multer = require("multer");
const { verify, isAdmin } = require("../middlewares/verify");

const upload = multer({ dest: 'uploads/' })


router.get("/orders", verify, isAdmin, async (req, res, next) => {
    try {
        const [orders] = await __pool.query("SELECT * FROM orders");
        res.render("orders.ejs", { orders });
    } catch (error) {
        console.log(error);
        next();
    }
})
.get("/api/order/fetch/:id", verify, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [order] = await __pool.query("SELECT * FROM orders WHERE id = ?", [id]);
        res.status(200).json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
})
.get("/api/orders", verify, isAdmin, async (req, res) => {
    try {
        const [orders] = await __pool.query("SELECT * FROM orders");
        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }

})
.post("/api/orders/create", upload.array(), async (req, res) => {
    try {
        const {rawRequest} = req.body;
        const {
            fullName,
            email,
            phone,
            ceaNo,
            propertiesListings,
            propertyLinks,
            socials,
            socialLinks,
            aboutUs,
            feedback,
            images,
            addOn

        } = extractData(JSON.parse(rawRequest))
        const [order] = await __pool.query("INSERT INTO orders (name, email, phone, other, images) VALUES (?, ?, ?, ?, ?)",
        [fullName, email, phone, JSON.stringify({ ceaNo, propertiesListings, propertyLinks, socials, socialLinks, aboutUs, feedback }), JSON.stringify({images:images, addon:addOn})]);
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
        res.status(200).json("Order Status Updated Successfully");
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
})
.get("/api/orders/delete/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [order] = await __pool.query("DELETE FROM orders WHERE id = ?", [id]);
        res.status(200).json("Order Deleted Successfully");
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
    const propertyLinks = data.q7_longText_6;
    const socials = data.q16_whatAre;
    const socialLinks = data.q18_kindlyShare;
    const aboutUs = data.q8_longText_7;
    const feedback = data.q11_longText_10;

  
    // Extracting image links
    let images = [];
    let addOn = [];

    if (data.uploadYour && data.uploadYour.length > 0) {
        images.push(...data.uploadYour);
    }

    if (data.addOn && data.addOn.length > 0) {
        addOn.push(...data.addOn);
    }
  
  
    // Returning the extracted data
    return {
        fullName,
        email,
        phone,
        ceaNo,
        propertiesListings,
        propertyLinks,
        socials,
        socialLinks,
        aboutUs,
        feedback,
        images,
        addOn
    };
  }



module.exports = router;
