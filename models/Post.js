'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

var post = Schema( {
  title: String,
  keywords:[String],
  username: String,
  createdAt: Date,
  content: String,
  postId: ObjectId,
} );

module.exports = mongoose.model( 'Post', post );