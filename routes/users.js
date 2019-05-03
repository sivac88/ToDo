const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
cookieParser = require('cookie-parser'),
cookieSession = require('cookie-session');
app = express();

app.use(passport.initialize());

app.use(cookieSession({
    name: 'session',
    keys: ['chaitanya'],
    maxAge: 24 * 60 * 60 * 1000
}));
app.use(cookieParser());
app.use(express.static('public'));

router.get('/auth/google', passport.authenticate('google', {
  scope: ['https://www.googleapis.com/auth/userinfo.profile']
}));

router.get('/auth/google/callback',
  passport.authenticate('google', {
      failureRedirect: '/users/login'
  }),
  (req, res) => {
      console.log(req.user);
      console.log(req.user.profile.displayName);
      console.log(req.user.profile.id);
      req.session.token = req.user.token;
      req.session.id = req.user.profile.id;
      console.log('Im here');
      User.findOne({
        id: req.user.profile.id
      }).then((user) => {
        if (user) {
          res.redirect('/todos');
        } else {
          const newUser = new User({
            name: req.user.profile.displayName,
            id: req.user.profile.id
          });
          newUser.save().then((user) => {
            res.redirect('/todos');
          }).catch(err => {
            console.log(err);
            return;
          });
        }
      });
  }
);

// load user model
require('../models/User');
const User = mongoose.model('users');


// user login route
router.get('/login', (req,res) => {
  if (req.session.token) {
    console.log("token: " + req.session.token);
    res.cookie('token', req.session.token);
    User.findOne({
      id: req.session.id
    }).then((user) => {
      if (user) {
        res.redirect('/todos');
      } else {
        res.redirect('/');
    }
  });
  } else {
      res.cookie('token', '');
      res.redirect('/users/auth/google');
      //res.sendFile(__dirname + '/public/login.html');
  }
});

// user login route
router.get('/register', (req,res) => {
  res.render('users/register');
});


// register form post
router.post('/register', (req,res) => {
  let errors = [];
  if (req.body.password != req.body.password2) {
    errors.push({text: 'Passwords do not match!'});
  }
  if (req.body.password.length < 4) {
    errors.push({text: 'Password must be at least 4 characters'}); 
  }
  if (errors.length > 0) {
    res.render('users/register', {
      errors: errors,
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      password2: req.body.password2
    })
  } else {
    User.findOne({
      email: req.body.email
    }).then((user) => {
      if (user) {
        req.flash('error_msg', 'A user with the same email already exists');
        res.redirect('/users/register');
      } else {
        const newUser = new User({
          name: req.body.name,
          email: req.body.email,
          password: req.body.password
        });
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser.save().then((user) => {
              req.flash('success_msg', 'You are now registered and can login');
              res.redirect('/users/login');
            }).catch(err => {
              console.log(err);
              return;
            });
          });
        });
      }
    });
  }
})

router.get('/logout', (req,res) => {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;