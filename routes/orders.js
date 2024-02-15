var admz = require("adm-zip");
const multer = require('multer');
const router = require("express").Router();
const path = require('path');
const fs = require('fs/promises');
const { verify, isAdmin, setUploadPath } = require("../middlewares/verify");


router.get("/orders", verify, isAdmin, async (req, res, next) => {
    try {
        const [orders] = await __pool.query("SELECT * FROM orders WHERE status = 'pending'");
        res.render("orders.ejs", { orders });
    } catch (error) {
        console.log(error);
        next();
    }
})
.post("/api/orders/create", setUploadPath, async (req, res) => {
    try {
        // req.upload.array('images')(req, res, async function (err) {
        //     if (err instanceof multer.MulterError) {
        //         return res.status(500).json(err);
        //     } else if (err) {
        //         return res.status(500).json(err);
        //     }
            
        //     console.log(req.body);
        //     // const directory = typeof req.file == Array ? req.files[0].destination : null;
        //     // const { name, email, phone, other } = req.body;
        //     // const insertQuery = "INSERT INTO orders (name, email, phone, other, path) VALUES (?, ?, ?, ?, ?)";
        //     // await __pool.query(insertQuery, [name, email, phone, JSON.stringify(other), directory]);
        // });
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
        const [path] = await __pool.query("SELECT path FROM orders WHERE id = ?", [id]);
        await fs.rmdir(path, { recursive: true });
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
        const [path] = await __pool.query("SELECT path FROM orders WHERE id = ?", [id]);
        await fs.rmdir(path, { recursive: true });
        const [order] = await __pool.query("DELETE FROM orders WHERE id = ?", [id]);
        res.status(200).json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}).get("/api/orders/download", verify, isAdmin, async (req, res) => {
    const { id } = req.query;
    try {
        var to_zip = await fs.readdir(id);
        var zip = new admz();
        
        to_zip.forEach(function (path) {
            zip.addLocalFile(id + "/" + path);
        });

        const file_after_download = 'assets.zip';
        const data = zip.toBuffer();
        res.set('Content-Type', 'application/octet-stream');
        res.set('Content-Disposition', `attachment; filename=${file_after_download}`);
        res.set('Content-Length', data.length);
        res.send(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
})



module.exports = router;
