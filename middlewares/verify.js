const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require("multer");
const storage = (uploadPath) => {
    return multer.diskStorage({
        destination: async function (req, file, cb) {
            cb(null, uploadPath);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + file.originalname);
        }
    });
}
const verify = (req, res, next)=>{
    if(!req.isAuthenticated()){
        req.flash('error', "you need to login first");
        return res.redirect('/login');
    }
    next();
}
const isAuthenticated = (req, res, next)=>{
    if(!req.isAuthenticated()){
        return false;
    }
    return true;
}
const isAdmin = (req, res, next)=>{
    if(req.user.role !== "admin"){
        req.flash('error', "you are not authorized");
        return res.redirect('/admin/login');
    }
    next();
}


const isTokenValid = (req, res, next)=>{
    try {
        const token = req.headers.authorization.split(" ")[1];
        if(token !== process.env.TOKEN){
            return res.status(401).json({message:"Token is not valid or not present "});
        }
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({message:"Token is not valid or not present "});
    }
}


async function setUploadPath(req, res, next) {
    const randomString = uuidv4();
    const uploadPath = path.join('uploads', 'orders', randomString);
    await fs.mkdir(uploadPath, { recursive: true });
    const upload = multer({ storage: storage(uploadPath) });
    req.upload = upload;
    next();
}

module.exports = {verify, isAuthenticated, isAdmin, isTokenValid, setUploadPath}