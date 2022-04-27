'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;

var userSchema = Schema( {
  username: String,
  passphrase: String,
  age: String,
  forumname: String,
  intro: String,
  avatar: 
  { 
    data: Buffer, 
    contentType: String 
  }
} );

module.exports = mongoose.model( 'User', userSchema );
