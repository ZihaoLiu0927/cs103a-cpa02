/*
  app.js -- This creates an Express webserver with login/register/logout authentication
*/

// *********************************************************** //
//  Loading packages to support the server
// *********************************************************** //
// First we load in all of the packages we need for the server...
const createError = require("http-errors"); // to handle the server errors
const express = require("express");
const path = require("path");  // to refer to local paths
const cookieParser = require("cookie-parser"); // to handle cookies
const session = require("express-session"); // to handle sessions using cookies
const debug = require("debug")("personalapp:server"); 
const layouts = require("express-ejs-layouts");
const fs = require('fs');
const multer = require('multer');
const dotenv = require("dotenv")


// *********************************************************** //
//  Loading models
// *********************************************************** //
const Post = require("./models/Post")

// *********************************************************** //
//  Loading JSON datasets
// *********************************************************** //

// *********************************************************** //
//  Connecting to the database
// *********************************************************** //

dotenv.config()
const mongoose = require( 'mongoose' );
const mongodb_URI = process.env.mongodb_URI;
mongoose.connect( mongodb_URI, { useNewUrlParser: true, useUnifiedTopology: true } );
// fix deprecation warnings
mongoose.set('useFindAndModify', false);  
mongoose.set('useCreateIndex', true);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {console.log("we are connected!!!")});


// *********************************************************** //
// Initializing the Express server 
// This code is run once when the app is started and it creates
// a server that respond to requests by sending responses
// *********************************************************** //
const app = express();

// Here we specify that we will be using EJS as our view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");


// this allows us to use page layout for the views 
// so we don't have to repeat the headers and footers on every page ...
// the layout is in views/layout.ejs
app.use(layouts);

// Here we process the requests so they are easy to handle
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
//app.use(cookieParser());

// Here we specify that static files will be in the public folder
app.use(express.static(path.join(__dirname, "public")));

// Here we enable session handling using cookies
app.use(
  session({
    secret: "zzbbyanana789sdfa8f9ds8f90ds87f8d9s789fds", // this ought to be hidden in process.env.SECRET
    resave: false,
    saveUninitialized: false
  })
);

// *********************************************************** //
//  Defining the routes the Express server will respond to
// *********************************************************** //


// here is the code which handles all /login /signin /logout routes
const auth = require('./routes/auth');
//const { deflateSync } = require("zlib");
app.use(auth)

// middleware to test is the user is logged in, and if not, send them to the login page
const isLoggedIn = (req,res,next) => {
  if (res.locals.loggedIn) {
    next()
  }
  else res.redirect('/login')
}

app.use(isLoggedIn)

// specify that the server should render the views/index.ejs page for the root path
// and the index.ejs code will be wrapped in the views/layouts.ejs code which provides
// the headers and footers for all webpages generated by this app

// app.get("/", (req, res, next) => {
//   res.render("/");
// });

app.get("/about", (req, res, next) => {
  res.render("about");
});

app.get('/',
  async (req,res,next) => {
    try {
      const posts = await Post.find({})
      let postsWithFig = [];
      for (post of posts) {
        const username = post.username;
        const profile = await User.find({username});
        let bimg = profile.map(x => x.avatar.data);
        let type = profile.map(x => x.avatar.contentType);
        let forumname = profile.map(x => x.forumname);
        let img;
        if (bimg[0] != null) {
          img = bimg.map(x => Buffer.from(x, 'base64').toString('base64'));
        } else {
          img = null;
        }
        if (forumname[0] == null) {
          forumname = "Anonymous";
        }
        postsWithFig.push({
          img: img,
          type: type,
          post:post,
          forumname, forumname
        })
      }
      res.locals.posts = postsWithFig;
      res.render('forum')
    } catch(e){
      next(e)
    }
  }
)

app.get('/forum/remove/:postId',
  // remove a course from the user's schedule
  async (req,res,next) => {
    try {
      await Post.remove(
                {username:res.locals.user.username,
                 postId:req.params.postId})
      res.redirect('/')

    } catch(e){
      next(e)
    }
  }
)


app.get('/addPost',
  isLoggedIn,
  (req, res, next) => {
    res.render("addPost");
  }
)

app.post('/addPost',
  isLoggedIn,
  async (req,res,next) => {
    try {
      var {title, content, keywords} = req.body  // get title and description from the body
      content = content.replace(/\n/g, "<br>");
      const username = res.locals.user.username;  // get the user's id
      const createdAt = new Date();  // get the current date/time
      let data = {title, keywords, content, username, createdAt}  // create the data object
      let post = new Post(data)  // create the database object (and test the types are correct)
      post.postId = post._id;
      await post.save()  // save the post item in the database
      res.redirect('/')  // go back to the forum page

    } catch(e){
      next(e)
    }
  }
)

app.get('/profile',
  isLoggedIn,
  async (req,res,next) => {
    try{
      const username = res.locals.user.username;
      const profile = await User.find({username});
      const data = profile.map(x => x.avatar.data);
      if (data[0] != null) {
        const img = data.map(x => Buffer.from(x, 'base64').toString('base64'));
        res.locals.imgprofile = img;
      } else {
        res.locals.imgprofile = null;
      }
      res.render('profile')
    } catch(e){
      next(e)
    }
  }
)

app.post('/setName',
  async (req,res,next) => {
    try {
      const {forumname} = req.body;
      const user = res.locals.user;
      const username = user.username;
      user.forumname = forumname;
      await User.findOneAndUpdate({username}, user, {upsert: false})
      res.locals.user.forumname = forumname;
      res.redirect('/profile')
    } catch(e){
      next(e)
    } 
  }
)

app.post('/setIntro',
  async (req,res,next) => {
    try {
      let {intro} = req.body;
      const user = res.locals.user;
      const username = user.username;
      user.intro = intro.replace(/\n/g, "<br>");
      await User.findOneAndUpdate({username}, user, {upsert: false})
      res.locals.user.intro = intro;
      res.redirect('/profile')
    } catch(e){
      next(e)
    } 
  }
)

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname + '/public/images')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
})

const upload = multer({ storage: storage })

app.post('/updateProfile', upload.single('avatar'),
  async (req, res, next) => {
    try {
      if (req.file != null) {
        const user = res.locals.user;
        const username = user.username;
        const newAvatar = {
          data: fs.readFileSync(path.join(__dirname + '/public/images/' + req.file.filename)),
          contentType: req.file.mimetype,
        }
        res.locals.user.avatar = newAvatar;
        await User.findOneAndUpdate({username}, user, {upsert: false})
        fs.unlinkSync(path.join(__dirname + '/public/images/' + req.file.filename));
      }
      res.redirect('/profile')
    
    } catch (e) {
      next(e)
    }

});

/* ************************
  Loading (or reloading) the data into a collection
   ************************ */
// this route loads in the posts into the Post collection
// or updates the posts if it is not a new collection

app.get('/upsertPostDB',
  async (req,res,next) => {

    const posts = await Post.find({});
    for (post of posts){
      post.postId = post._id;
      await Post.findOneAndUpdate({title,content,postId},post,{upsert:true})
    }
    const num = await Post.find({}).count();
    res.send("data uploaded: "+num)
  }
)


// here we catch 404 errors and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// this processes any errors generated by the previous routes
// notice that the function has four parameters which is how Express indicates it is an error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render("error");
});


// *********************************************************** //
//  Starting up the server!
// *********************************************************** //
//Here we set the port to use between 1024 and 65535  (2^16-1)

//const port = "4500";
const port = process.env.PORT || "4500";

app.set("port", port);

// and now we startup the server listening on that port
const http = require("http");
const { redirect } = require("express/lib/response");
const { appendFileSync } = require("fs");
const { accepts } = require("express/lib/request");
const User = require("./models/User");
const e = require("connect-flash");
const server = http.createServer(app);

server.listen(port);

function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
}

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

server.on("error", onError);

server.on("listening", onListening);

module.exports = app;