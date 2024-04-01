var express = require('express');
var router = express.Router();
const userModel = require("./users");
const postModel = require("./posts");
const passport = require('passport');
const upload = require('./multer');

const localStrategy = require("passport-local");
passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function(req, res, next) {
  res.render('login');
});

router.get('/login',function(req,res,next){
  res.render("login");
});

router.get('/register',function(req,res,next){
  res.render("index");
});

router.get('/profile',isLoggedIn,async function(req,res,next){
  const user = await userModel.findOne({
    username : req.session.passport.user
  })
  .populate("posts")
  res.render("profile",{user});
}); 



router.get('/search', (req, res) => {
  res.render('search', { message: null }); 
});


router.get('/searchuser', (req, res) => {
  const username = req.query.username;
  res.redirect(`/profile/${username}`);
});



router.get("/profile/:username", async (req, res) => {
  try {
      const username = req.params.username;
      const user = await userModel.findOne({ username: username }).populate('posts');
      if (!user) {
          res.status(404).send("User not found");
          return;
      }
      res.render("profiledp", { user: user });
  } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
  }
});




router.get('/newpost', isLoggedIn, function(req, res) {
  res.render('newpost');
});

router.get('/editprofile', async (req, res) => {
  res.render('editprofile');
});



router.get('/profile/delete/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;

    await postModel.findByIdAndDelete(postId);

    const user = await userModel.findOne({ username: req.session.passport.user });

    if (user) {
      user.posts.pull(postId);
      await user.save(); 
    }

    res.redirect('/profile');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});


router.get('/delete-account', async (req, res) => {
  try {

    const userId = req.user._id; 

    
    await postModel.deleteMany({ user: userId });
    await userModel.findByIdAndDelete(userId);

    res.redirect('/login'); 
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});


router.get('/feed', isLoggedIn, async function(req, res, next) {
  try {
      const currentUser = req.user._id; 
      const posts = await postModel.find({ user: { $ne: currentUser } }).populate('user');
      res.render('feed', { posts, user: req.user });
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});

router.post('/profile/edit', isLoggedIn, upload.single('file'), async (req, res) => {
  try {
  
    const userId = req.user.id; 
    const user = await userModel.findById(userId);
   
    if (req.file) {
      user.dp = req.file.filename;
    }

    if (req.body.fname) {
      user.fullname = req.body.fname;
    }

    await user.save();
    res.redirect('/profile');

  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});


router.post('/upload', isLoggedIn, upload.single("file") ,async function(req,res,next){
  if(!req.file){
    return res.status(404).send("no files were uploaded")
  }
  const user = await userModel.findOne({username : req.session.passport.user});
  const post = await postModel.create({
    image : req.file.filename,
    imageText : req.body.filecaption,
    user : user._id
  });
  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
}); 

router.post("/register",function(req,res){
  const { username, email, fullname } = req.body;
    const defaultDp = "1946429.png"; 
    const userData = new userModel({
        username: username,
        email: email,
        fullname: fullname,
        dp: defaultDp 
    });

  userModel.register(userData, req.body.password)
  .then(function(){
    passport.authenticate("local")(req,res,function(){
      res.redirect("/feed")
    })
  })
});

router.post("/login",passport.authenticate("local",{
  successRedirect: "/feed",
  failureRedirect:"/"
}), function(req,res){
})

router.get("/logout",function(req,res){
  req.logout(function(err){
    if(err){ return next(err) ;}
    res.redirect('/');
  });
})

function isLoggedIn(req,res,next){
  if(req.isAuthenticated()) return next();
  res.redirect("/");
}

module.exports = router;
