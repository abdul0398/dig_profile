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


module.exports = {verify, isAuthenticated, isAdmin}