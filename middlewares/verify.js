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


module.exports = {verify, isAuthenticated}